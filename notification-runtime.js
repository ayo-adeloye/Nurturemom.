(function () {
  'use strict';

  const SUPABASE_URL = 'https://ocorbzbkzfdmurolngdf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_unerunySitlxOS8BLKyboA_z1vNhY5W';
  const SESSION_KEY = 'nurturemom.supabase.session';
  const STATE_KEY = 'nurturemom.v1';
  const AUTO_ROUTINE_TITLE = 'Daily NurtureMom recovery check-in';
  const AUTO_ROUTINE_NOTE = 'A gentle NurtureMom reminder for your daily recovery check-in.';

  let refreshPromise = null;
  let syncTimer = 0;
  let syncing = false;
  let lastSyncedSignature = '';

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function readState() {
    return readJson(STATE_KEY, null);
  }

  function rawSession() {
    return readJson(SESSION_KEY, null);
  }

  async function currentSession() {
    const existing = rawSession();
    if (!existing) return null;

    const now = Math.floor(Date.now() / 1000);
    if (existing.access_token && (!existing.expires_at || existing.expires_at > now + 90)) {
      return existing;
    }

    if (!existing.refresh_token) return existing.access_token ? existing : null;
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async function () {
      try {
        const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: {
            apikey: PUBLISHABLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: existing.refresh_token })
        });
        const next = await response.json().catch(function () { return null; });
        if (!response.ok || !next || !next.access_token) return null;
        if (!next.expires_at) {
          next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        return next;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  async function post(url, body, session) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body || {})
    });

    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(String(data.error || data.message || 'NurtureMom notification request failed.'));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function rpc(name, body, session) {
    return post(SUPABASE_URL + '/rest/v1/rpc/' + name, body, session);
  }

  async function edge(name, body, session) {
    return post(SUPABASE_URL + '/functions/v1/' + name, body, session);
  }

  function base64UrlToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from(raw, function (ch) { return ch.charCodeAt(0); });
  }

  function supported() {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  async function serviceWorkerRegistration() {
    if (!supported()) throw new Error('Background notifications are not supported on this device or browser.');
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return navigator.serviceWorker.ready;
  }

  async function vapidKey(session) {
    const data = await edge('nm-notifications', { action: 'config' }, session);
    if (!data.publicKey) throw new Error('NurtureMom notification setup is not ready yet.');
    return String(data.publicKey);
  }

  async function registerPushDevice() {
    if (!supported()) throw new Error('Background notifications are not supported on this device or browser.');
    if (Notification.permission !== 'granted') return false;

    const session = await currentSession();
    if (!session || !session.access_token) throw new Error('Please sign in before enabling background reminders.');

    const reg = await serviceWorkerRegistration();
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = await vapidKey(session);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey)
      });
    }

    await rpc('nm_push_register', { s: subscription.toJSON() }, session);
    const userId = String(session.user && session.user.id || '');
    if (userId) localStorage.setItem('nurturemom.push.registered:' + userId, '1');
    return true;
  }

  async function findAutoRoutine(session) {
    const data = await edge('nm-care-routines', { action: 'list' }, session);
    const routines = Array.isArray(data.routines) ? data.routines : [];
    return routines.find(function (routine) {
      return String(routine && routine.title || '') === AUTO_ROUTINE_TITLE;
    }) || null;
  }

  async function syncDailyRoutine(state, session) {
    if (!state || !state.profile) return;

    const profile = state.profile;
    const enabled = profile.reminders === true && profile.notifications === true;
    const routine = await findAutoRoutine(session);

    if (!enabled) {
      if (routine && routine.enabled) {
        await edge('nm-care-routines', {
          action: 'toggle',
          id: routine.id,
          enabled: false
        }, session);
      }
      return;
    }

    const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(profile.reminderTime || ''))
      ? String(profile.reminderTime)
      : '09:00';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

    if (routine) {
      await edge('nm-care-routines', {
        action: 'update',
        id: routine.id,
        title: AUTO_ROUTINE_TITLE,
        note: AUTO_ROUTINE_NOTE,
        reminder_time: reminderTime,
        timezone: timezone,
        repeat: 'daily',
        enabled: true
      }, session);
    } else {
      await edge('nm-care-routines', {
        action: 'create',
        title: AUTO_ROUTINE_TITLE,
        note: AUTO_ROUTINE_NOTE,
        reminder_time: reminderTime,
        timezone: timezone,
        repeat: 'daily',
        enabled: true
      }, session);
    }
  }

  async function removePushDevice(sessionOverride) {
    if (!('serviceWorker' in navigator)) return;

    const reg = await navigator.serviceWorker.ready.catch(function () { return null; });
    if (!reg || !reg.pushManager) return;
    const subscription = await reg.pushManager.getSubscription().catch(function () { return null; });
    if (!subscription) return;

    const session = sessionOverride || await currentSession();
    if (session && session.access_token) {
      await rpc('nm_push_remove', { e: subscription.endpoint }, session).catch(function () {});
    }
    await subscription.unsubscribe().catch(function () {});
  }

  async function syncFromState(force) {
    if (syncing) return;
    const state = readState();
    const session = await currentSession();
    if (!state || !state.profile || !session || !session.access_token) return;

    const signature = JSON.stringify({
      user: session.user && session.user.id || '',
      reminders: state.profile.reminders === true,
      notifications: state.profile.notifications === true,
      reminderTime: state.profile.reminderTime || '',
      permission: 'Notification' in window ? Notification.permission : 'unsupported'
    });

    if (!force && signature === lastSyncedSignature) return;
    syncing = true;
    try {
      if (state.profile.notifications === true && Notification.permission === 'granted') {
        await registerPushDevice();
      } else if (state.profile.notifications === false) {
        await removePushDevice(session);
      }
      await syncDailyRoutine(state, session);
      lastSyncedSignature = signature;
    } catch (error) {
      console.warn('NurtureMom background notification sync needs attention', error);
    } finally {
      syncing = false;
    }
  }

  function scheduleSync(force) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncFromState(!!force); }, 120);
  }

  function patchStorage() {
    const previousSetItem = Storage.prototype.setItem;
    const previousRemoveItem = Storage.prototype.removeItem;

    Storage.prototype.setItem = function (key, value) {
      const result = previousSetItem.call(this, key, value);
      if (this === localStorage && (String(key) === STATE_KEY || String(key) === SESSION_KEY)) {
        scheduleSync(true);
      }
      return result;
    };

    Storage.prototype.removeItem = function (key) {
      const isSession = this === localStorage && String(key) === SESSION_KEY;
      const sessionBefore = isSession ? rawSession() : null;
      const result = previousRemoveItem.call(this, key);
      if (isSession) {
        removePushDevice(sessionBefore).catch(function () {});
        lastSyncedSignature = '';
      }
      return result;
    };
  }

  function patchPermissionRequest() {
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') return;
    const nativeRequest = Notification.requestPermission.bind(Notification);
    try {
      Notification.requestPermission = async function () {
        const permission = await nativeRequest();
        if (permission === 'granted') {
          await registerPushDevice();
        }
        return permission;
      };
    } catch (_) {
      // Storage-based sync below still registers the device after the app saves the permission choice.
    }
  }

  function patchNotificationCopy() {
    const apply = function () {
      const paragraphs = document.querySelectorAll('p');
      paragraphs.forEach(function (p) {
        const text = String(p.textContent || '').trim();
        if (text === 'Allow NurtureMom to send the reminder while the app is open.') {
          p.textContent = 'Allow NurtureMom to send gentle reminders even when the app is closed.';
        }
        if (text.includes('Device notifications work while NurtureMom is open; background push delivery is the next production step.')) {
          p.textContent = text.replace(
            'Device notifications work while NurtureMom is open; background push delivery is the next production step.',
            'Device notifications can continue in the background when this device supports web push.'
          );
        }
      });
    };

    apply();
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  patchStorage();
  patchPermissionRequest();

  window.NurtureMomBackgroundPush = {
    supported: supported,
    register: registerPushDevice,
    sync: function () { return syncFromState(true); },
    disable: removePushDevice
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      patchNotificationCopy();
      scheduleSync(true);
    }, { once: true });
  } else {
    patchNotificationCopy();
    scheduleSync(true);
  }
})();