const SUPABASE_URL = 'https://ocorbzbkzfdmurolngdf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unerunySitlxOS8BLKyboA_z1vNhY5W';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function verifyPlus(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, status: 401 };

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: authorization
  };

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userResponse.ok) return { ok: false, status: 401 };
  const user = await userResponse.json();

  const accessResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/nm_plus_access`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: '{}'
  });
  if (!accessResponse.ok) return { ok: false, status: 403 };
  const raw = await accessResponse.json();
  const access = Array.isArray(raw) ? raw[0] || {} : raw || {};
  const entitled = access.founder_access === true || access.plus_access === true || access.plan === 'plus';
  return { ok: entitled, status: entitled ? 200 : 403, user, access };
}

function urgentSafetyAnswer(text) {
  const q = String(text || '').toLowerCase();
  const urgent = [
    'chest pain','trouble breathing','difficulty breathing','can\'t breathe','cannot breathe',
    'seizure','fainted','fainting','passed out','heavy bleeding','soaking a pad',
    'thoughts of suicide','suicidal','kill myself','hurt myself','harm myself',
    'hurt my baby','harm my baby','kill my baby'
  ];
  if (!urgent.some((phrase) => q.includes(phrase))) return null;
  return 'What you described could need urgent medical attention. Please contact emergency services or go to the nearest emergency department now. If you can, have someone stay with you or help with the baby while you get care. NurtureMom can stay supportive, but this is not something to manage through the app alone.';
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.text || '').slice(0, 1800)
  })).filter((m) => m.content.trim());
}

function compactContext(context) {
  if (!context || typeof context !== 'object') return null;
  return {
    date: context.date || null,
    recentCheckin: context.recentCheckin || null,
    recentMovement: context.recentMovement || null
  };
}

async function handleAsk(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 24000) return json({ error: 'That message is too long.' }, 413);

  const auth = await verifyPlus(request);
  if (!auth.ok) return json({ error: auth.status === 401 ? 'Please reconnect your NurtureMom account.' : 'Ask NurtureMom is available with Plus.' }, auth.status);

  const body = await request.json().catch(() => null);
  const question = String(body?.question || '').trim().slice(0, 1800);
  if (!question) return json({ error: 'Ask a question first.' }, 400);

  const urgent = urgentSafetyAnswer(question);
  if (urgent) return json({ answer: urgent, safety: 'urgent' });

  if (!env.AI) return json({ error: 'Ask NurtureMom is being connected to its AI service. Please try again shortly.' }, 503);

  const context = compactContext(body?.context);
  const messages = [
    {
      role: 'system',
      content: `You are Ask NurtureMom, a warm, calm private companion inside a premium postpartum and motherhood support app.\n\nVoice: elegant, reassuring, concise, practical, never patronizing. Do not sound like a robot and do not overuse lists.\n\nYou may help with postpartum recovery questions, feeding, sleep, emotions, baby-care basics, routines, asking a support Village for help, self-care, appointments, household planning, and general everyday questions.\n\nMedical safety: You are not a doctor and must not diagnose, prescribe medication, change doses, or tell the user to ignore clinician advice. For symptoms that could be urgent or severe, advise prompt professional or emergency care. For non-urgent health questions, give general educational information, explain uncertainty, and suggest contacting the user's clinician when appropriate. Never imply that app check-ins prove a medical condition.\n\nMental health safety: if the user expresses thoughts of self-harm, suicide, harming the baby, or immediate danger, tell them to contact emergency services or a crisis service immediately and encourage them to involve a trusted person nearby.\n\nPrivacy: do not say that anything was shared with the Village. The user's private context is only for answering this conversation.\n\nStyle: prefer 2-5 short paragraphs. Use a short list only when it materially improves clarity. Avoid competitive fitness language, guilt, recovery scores, or rigid postpartum targets.\n\nIf the user asks for something outside motherhood or postpartum, you can still answer normal safe everyday questions.`
    },
    ...sanitizeHistory(body?.history)
  ];

  const contextNote = context ? `\n\nPrivate NurtureMom context the user chose to include:\n${JSON.stringify(context).slice(0, 5000)}` : '';
  messages.push({ role: 'user', content: `${question}${contextNote}` });

  try {
    const result = await env.AI.run('@cf/google/gemma-4-26b-a4b-it', {
      messages,
      max_tokens: 700,
      temperature: 0.45
    });
    const answer = typeof result === 'string'
      ? result
      : result?.response || result?.result?.response || result?.text || '';
    if (!String(answer).trim()) throw new Error('Empty AI response');
    return json({ answer: String(answer).trim() });
  } catch (error) {
    console.error('Ask NurtureMom AI error', error);
    return json({ error: 'NurtureMom could not answer just then. Please try again.' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ask') return handleAsk(request, env);

    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if ((url.pathname === '/' || url.pathname.endsWith('.html')) && type.includes('text/html')) {
      return new HTMLRewriter()
        .on('body', {
          element(element) {
            element.append('<script>window.NURTUREMOM_PLUS_PREVIEW=true;</script><script src="/original-approved-ux.js"></script><script src="/plus-access.js"></script><script src="/plus-options.js"></script><script src="/plus-auto-movement.js"></script><script src="/plus-feedback-lab.js"></script><script src="/plus-account-ui.js"></script><script src="/plus-elegance.js"></script><script src="/plus-ask-nurturemom.js"></script>', { html: true });
          }
        })
        .transform(response);
    }
    return response;
  }
};