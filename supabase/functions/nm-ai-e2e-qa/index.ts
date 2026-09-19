import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function envJsonKey(name: string, preferred = "default") {
  try {
    const raw = Deno.env.get(name);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.[preferred] || Object.values(parsed || {})[0] || "");
  } catch {
    return "";
  }
}

function secretKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || envJsonKey("SUPABASE_SECRET_KEYS") || "";
}

function publishableKey() {
  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || envJsonKey("SUPABASE_PUBLISHABLE_KEYS") || "";
}

function constantTimeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function functionCall(url: string, key: string, token: string, name: string, body: Record<string, unknown>) {
  const response = await fetch(url + "/functions/v1/" + name, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function companionCall(url: string, key: string, token: string) {
  const { response, data } = await functionCall(url, key, token, "nm-ai-companion", {
    messages: [{ role: "user", content: "I had a tiring day. Please give me one gentle encouraging thought for tonight." }],
    context: {
      display_name: "QA Mom",
      recent_checkin: "Tired, but safe and looking for encouragement.",
      timezone: "America/New_York",
    },
  });

  return {
    status: response.status,
    error: String(data?.error || ""),
    replyOk: response.ok && typeof data?.reply === "string" && data.reply.trim().length >= 20,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const adminKey = secretKey();
  const clientKey = publishableKey();
  if (!supabaseUrl || !adminKey || !clientKey) return json({ error: "qa_runtime_not_configured" }, 503);

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: config, error: configError } = await admin
    .from("nm_notification_config")
    .select("worker_token")
    .eq("id", true)
    .single();

  const worker = req.headers.get("X-NurtureMom-Worker") || "";
  if (configError || !config?.worker_token || !worker || !constantTimeEqual(worker, String(config.worker_token))) {
    return json({ error: "unauthorized" }, 401);
  }

  let qaUserId = "";
  let qaRoutineId = "";
  let fakeEndpoint = "";
  let stage = "create_user";

  const result = {
    ok: false,
    auth_ok: false,
    free_denied: false,
    notification_config_ok: false,
    push_register_ok: false,
    push_remove_ok: false,
    care_routine_ok: false,
    plus_reply_ok: false,
    founder_reply_ok: false,
    openai_path_ok: false,
  };

  try {
    const suffix = crypto.randomUUID().replaceAll("-", "");
    const email = "nurturemom-e2e-" + suffix + "@example.com";
    const password = "NmQA!" + suffix + "aA7";
    fakeEndpoint = "https://fcm.googleapis.com/fcm/send/nurturemom-qa-" + suffix;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "NurtureMom QA" },
    });
    if (createError || !created.user?.id) throw new Error("create_user_failed");

    qaUserId = created.user.id;
    stage = "sign_in";

    const client = createClient(supabaseUrl, clientKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { data: signed, error: signError } = await client.auth.signInWithPassword({ email, password });
    const token = signed.session?.access_token || "";
    if (signError || !token) throw new Error("sign_in_failed");
    result.auth_ok = true;

    stage = "free_denial";
    const freeCall = await companionCall(supabaseUrl, clientKey, token);
    result.free_denied = freeCall.status === 403 && freeCall.error === "plus_required";
    if (!result.free_denied) throw new Error("free_account_was_not_denied");

    stage = "notification_config";
    const notifyConfig = await functionCall(supabaseUrl, clientKey, token, "nm-notifications", { action: "config" });
    result.notification_config_ok =
      notifyConfig.response.ok &&
      typeof notifyConfig.data?.publicKey === "string" &&
      notifyConfig.data.publicKey.length > 40;
    if (!result.notification_config_ok) throw new Error("notification_config_failed");

    stage = "push_register";
    const fakeSubscription = {
      endpoint: fakeEndpoint,
      expirationTime: null,
      keys: {
        auth: "A".repeat(22),
        p256dh: "B".repeat(87),
      },
    };
    const { error: registerError } = await client.rpc("nm_push_register", { s: fakeSubscription });
    if (registerError) throw new Error("push_register_failed");

    const { data: registered } = await admin
      .from("nm_push_devices")
      .select("id,user_id,endpoint")
      .eq("user_id", qaUserId)
      .eq("endpoint", fakeEndpoint)
      .maybeSingle();

    result.push_register_ok = !!registered?.id;
    if (!result.push_register_ok) throw new Error("push_registration_not_persisted");

    stage = "push_remove";
    const { error: removeError } = await client.rpc("nm_push_remove", { e: fakeEndpoint });
    if (removeError) throw new Error("push_remove_failed");

    const { data: removedCheck } = await admin
      .from("nm_push_devices")
      .select("id")
      .eq("user_id", qaUserId)
      .eq("endpoint", fakeEndpoint)
      .maybeSingle();

    result.push_remove_ok = !removedCheck;
    if (!result.push_remove_ok) throw new Error("push_removal_not_persisted");

    stage = "care_routine";
    const careCreate = await functionCall(supabaseUrl, clientKey, token, "nm-care-routines", {
      action: "create",
      title: "NurtureMom QA reminder " + suffix.slice(0, 8),
      note: "Automated QA reminder; safe to delete.",
      reminder_time: "23:58",
      timezone: "UTC",
      repeat: "daily",
      enabled: true,
    });
    qaRoutineId = String(careCreate.data?.routine?.id || "");
    result.care_routine_ok = careCreate.response.status === 201 && !!qaRoutineId;
    if (!result.care_routine_ok) throw new Error("care_routine_create_failed");

    await functionCall(supabaseUrl, clientKey, token, "nm-care-routines", {
      action: "delete",
      id: qaRoutineId,
    });
    qaRoutineId = "";

    stage = "grant_plus";
    const { error: plusGrantError } = await admin.from("nm_entitlements").upsert({
      user_id: qaUserId,
      plan: "plus",
      plus_access: true,
      founder_access: false,
    });
    if (plusGrantError) throw new Error("plus_grant_failed");

    stage = "plus_reply";
    const plusCall = await companionCall(supabaseUrl, clientKey, token);
    if (!plusCall.replyOk) {
      throw new Error(
        plusCall.error === "companion_not_configured"
          ? "openai_secret_missing"
          : plusCall.error || "plus_reply_failed",
      );
    }
    result.plus_reply_ok = true;

    stage = "grant_founder";
    const { error: founderGrantError } = await admin
      .from("nm_entitlements")
      .update({ plan: "free", plus_access: false, founder_access: true })
      .eq("user_id", qaUserId);
    if (founderGrantError) throw new Error("founder_grant_failed");

    stage = "founder_reply";
    const founderCall = await companionCall(supabaseUrl, clientKey, token);
    if (!founderCall.replyOk) throw new Error(founderCall.error || "founder_reply_failed");

    result.founder_reply_ok = true;
    result.openai_path_ok = true;
    result.ok = true;
    return json(result);
  } catch (error) {
    return json(
      {
        ...result,
        stage,
        error: String((error as Error)?.message || "qa_failed").slice(0, 120),
      },
      500,
    );
  } finally {
    if (qaRoutineId && qaUserId) {
      await admin.from("nm_care_routines").delete().eq("id", qaRoutineId).eq("user_id", qaUserId);
    }
    if (fakeEndpoint && qaUserId) {
      await admin.from("nm_push_devices").delete().eq("endpoint", fakeEndpoint).eq("user_id", qaUserId);
    }
    if (qaUserId) {
      await admin.from("nm_entitlements").delete().eq("user_id", qaUserId);
      await admin.auth.admin.deleteUser(qaUserId);
    }
  }
});
