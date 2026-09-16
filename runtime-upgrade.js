(() => {
  const SUPABASE_URL = "https://ocorbzbkzfdmurolngdf.supabase.co";
  const NOTIFY_FUNCTION = `${SUPABASE_URL}/functions/v1/nm-notifications`;

  const byId = (id) => document.getElementById(id);
  const signedInSession = async () => {
    if (!window.nmSupabase) return null;
    const { data } = await window.nmSupabase.auth.getSession();
    return data?.session || null;
  };

  function ensureBirthDateField() {
    const signedIn = byId('authSignedIn');
    const name = byId('profileName');
    if (!signedIn || !name || byId('profileBirthDate')) return;

    const wrap = document.createElement('div');
    wrap.id = 'profileBirthDateWrap';
    wrap.innerHTML = `
      <label for="profileBirthDate" style="margin-top:12px">Baby's birth date</label>
      <input id="profileBirthDate" type="date" autocomplete="bday">
      <div id="profileBirthDateHelp" class="small" style="margin-top:5px">Used to personalize your recovery journey and “days with your little one.”</div>
    `;
    name.insertAdjacentElement('afterend', wrap);
    const input = byId('profileBirthDate');
    input.max = new Date().toISOString().slice(0, 10);
    input.addEventListener('change', updateBirthDateSummary);
  }

  function updateBirthDateSummary() {
    const input = byId('profileBirthDate');
    const help = byId('profileBirthDateHelp');
    if (!input || !help) return;
    const raw = input.value;
    if (!raw) {
      help.textContent = 'Used to personalize your recovery journey and “days with your little one.”';
      return;
    }
    const birth = new Date(`${raw}T12:00:00`);
    const now = new Date();
    if (!Number.isFinite(birth.getTime()) || birth > now) {
      help.textContent = 'Please choose today or an earlier date.';
      return;
    }
    const start = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.max(0, Math.floor((today - start) / 86400000));
    help.textContent = days === 0 ? 'Today is day 1 with your little one. ♡' : `${days + 1} days with your little one. ♡`;
  }

  async function hydrateProfile(session) {
    if (!window.nmSupabase || !session?.user) return;
    ensureBirthDateField();
    const { data, error } = await window.nmSupabase
      .from('nm_profiles')
      .select('data')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) return;
    const profile = data?.data || {};
    if (byId('profileName')) byId('profileName').value = profile.display_name || profile.name || '';
    if (byId('profileBirthDate')) byId('profileBirthDate').value = profile.birthDate || profile.birth_date || '';
    if (byId('profileTimezone')) byId('profileTimezone').value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    updateBirthDateSummary();
  }

  async function safeSaveProfile() {
    if (!window.nmSupabase) return;
    const { data: { session } } = await window.nmSupabase.auth.getSession();
    if (!session) return;

    const name = (byId('profileName')?.value || '').trim();
    const birthDate = byId('profileBirthDate')?.value || '';
    const status = byId('profileStatus');

    if (!name) {
      if (status) {
        status.textContent = "Please enter the name you'd like us to use.";
        status.className = 'status show warn';
      }
      return;
    }
    if (birthDate && new Date(`${birthDate}T12:00:00`) > new Date()) {
      if (status) {
        status.textContent = "Baby's birth date can't be in the future.";
        status.className = 'status show warn';
      }
      return;
    }

    const { data: existingRow, error: readError } = await window.nmSupabase
      .from('nm_profiles')
      .select('data')
      .eq('id', session.user.id)
      .maybeSingle();

    if (readError) {
      if (status) {
        status.textContent = "We couldn't load your profile safely. Please try again.";
        status.className = 'status show warn';
      }
      return;
    }

    const existing = existingRow?.data || {};
    const merged = {
      ...existing,
      name,
      display_name: name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    };
    if (birthDate) merged.birthDate = birthDate;

    const { error } = await window.nmSupabase
      .from('nm_profiles')
      .upsert({ id: session.user.id, data: merged }, { onConflict: 'id' });

    if (status) {
      status.textContent = error ? "We couldn't save your profile yet. Please try again." : 'Profile saved ♡';
      status.className = `status show${error ? ' warn' : ''}`;
    }
    if (!error) updateBirthDateSummary();
  }

  async function getVapidPublicKey() {
    const session = await signedInSession();
    if (!session || !window.nmSupabase) return '';
    const { data, error } = await window.nmSupabase.functions.invoke('nm-notifications', { body: { action: 'config' } });
    if (error || !data?.publicKey) return '';
    window.NURTUREMOM_VAPID_PUBLIC_KEY = data.publicKey;
    return data.publicKey;
  }

  async function registerPushSubscription() {
    const session = await signedInSession();
    if (!session || !window.nmSupabase || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const key = window.NURTUREMOM_VAPID_PUBLIC_KEY || await getVapidPublicKey();
    if (!key) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: window.urlBase64ToUint8Array ? window.urlBase64ToUint8Array(key) : undefined
      });
    }
    const { error } = await window.nmSupabase.rpc('nm_push_register', { s: sub.toJSON() });
    if (error) throw error;
    localStorage.setItem('nurturemom_push_enabled', '1');
    window.updatePushUI?.();
    return true;
  }

  async function removePushSubscription() {
    if (!window.nmSupabase || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await window.nmSupabase.rpc('nm_push_remove', { e: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  }

  async function improvedTogglePush() {
    if (!("Notification" in window)) return alert('Notifications are not supported in this browser.');
    const enabled = Notification.permission === 'granted' && localStorage.getItem('nurturemom_push_enabled') !== '0';
    if (enabled) {
      localStorage.setItem('nurturemom_push_enabled', '0');
      await removePushSubscription();
      window.updatePushUI?.();
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      localStorage.setItem('nurturemom_push_enabled', '0');
      window.updatePushUI?.();
      return;
    }
    try {
      await window.registerSW?.();
      await registerPushSubscription();
      await window.sendTestNotification?.();
    } catch (e) {
      console.warn('Push registration failed', e);
      alert('Notifications are allowed, but this device could not be registered yet. Please try again.');
    }
    window.updatePushUI?.();
  }

  async function fallbackShareInvite(name, email, message, acceptUrl) {
    const subject = encodeURIComponent("You’re invited to my NurtureMom village ♡");
    const body = encodeURIComponent(`${message}\n\nAccept my invitation:\n${acceptUrl}\n\n— Sent from NurtureMom`);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NurtureMom Village Invitation', text: `${message}\n\n${acceptUrl}` });
        window.setInviteStatus?.(`Invitation prepared for ${name}. Choose Mail to send it.`);
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return window.setInviteStatus?.('Sharing was cancelled.', 'warn');
      }
    }
    window.setInviteStatus?.(`Opening your email app with the invitation for ${name}…`);
    location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }

  async function improvedSendInvite() {
    const name = (byId('inviteName')?.value || '').trim();
    const email = (byId('inviteEmail')?.value || '').trim();
    const role = byId('inviteRole')?.value || 'Friend';
    const message = (byId('inviteMessage')?.value || '').trim();
    if (!name) return window.setInviteStatus?.('Please enter the villager’s name.', 'warn');
    if (!window.validEmail?.(email)) return window.setInviteStatus?.('Please enter a valid email address.', 'warn');

    const session = await signedInSession();
    if (!session || !window.nmSupabase) {
      const token = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      return fallbackShareInvite(name, email, message, `${location.origin}/accept.html?token=${encodeURIComponent(token)}`);
    }

    const senderName = (byId('profileName')?.value || '').trim() || session.user.email?.split('@')[0] || 'A friend';
    window.setInviteStatus?.(`Preparing ${name}'s invitation…`);

    const { data: invite, error } = await window.nmSupabase.rpc('nm_create_invitation', {
      p_name: name,
      p_email: email,
      p_relationship: role,
      p_sender_name: senderName
    });
    if (error || !invite?.token) {
      return window.setInviteStatus?.(error?.message || 'We could not create the invitation yet.', 'warn');
    }

    window.addPendingVillager?.(name, role, email);
    const acceptUrl = `${location.origin}/accept.html?token=${encodeURIComponent(invite.token)}`;

    let queued = false;
    try {
      const { error: queueError } = await window.nmSupabase.rpc('nm_resend_invitation', { m: invite.id });
      queued = !queueError;
      if (queued) {
        const { error: dispatchError } = await window.nmSupabase.functions.invoke('nm-notifications', { body: { action: 'dispatch' } });
        if (!dispatchError) {
          window.setInviteStatus?.(`Invitation sent to ${email}.`);
          window.maybeNotify?.('Village invitation sent', `${name} has been invited to your NurtureMom village.`);
          return;
        }
      }
    } catch (e) {
      console.warn('Direct invitation delivery unavailable', e);
    }

    window.setInviteStatus?.(queued ? 'The invitation is saved. Opening a share option as a backup…' : 'The invitation is saved. Choose how you want to send it…');
    return fallbackShareInvite(name, email, message, acceptUrl);
  }

  function installOverrides() {
    ensureBirthDateField();
    window.saveNurtureMomProfile = safeSaveProfile;
    window.subscribeForBackendPush = registerPushSubscription;
    window.togglePush = improvedTogglePush;
    window.sendInvite = improvedSendInvite;

    let tries = 0;
    const attach = async () => {
      tries += 1;
      if (!window.nmSupabase) {
        if (tries < 40) setTimeout(attach, 150);
        return;
      }
      const { data } = await window.nmSupabase.auth.getSession();
      if (data?.session) {
        await hydrateProfile(data.session);
        if (Notification.permission === 'granted' && localStorage.getItem('nurturemom_push_enabled') !== '0') {
          registerPushSubscription().catch(() => {});
        }
      }
      window.nmSupabase.auth.onAuthStateChange((_event, session) => {
        if (session) setTimeout(() => hydrateProfile(session), 0);
      });
    };
    attach();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installOverrides, { once: true });
  else installOverrides();
})();
