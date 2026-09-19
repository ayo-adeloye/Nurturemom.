(() => {
  'use strict';

  const SESSION_KEY = 'nurturemom.supabase.session';
  const STATE_KEY = 'nurturemom.v1';
  const BAR_ID = 'nmNotificationBar';
  let temporary = null;
  let temporaryTimer = 0;

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function signedIn() {
    const session = readJson(SESSION_KEY, null);
    return !!(session && session.access_token);
  }

  function formatTime(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))) return '';
    const [hour, minute] = String(value).split(':').map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function installStyle() {
    if (document.getElementById('nmNotificationBarStyle')) return;
    const style = document.createElement('style');
    style.id = 'nmNotificationBarStyle';
    style.textContent = `
      #${BAR_ID}{
        position:fixed;top:14px;right:14px;z-index:90;display:none;
        width:42px;height:42px;padding:0;border:1px solid #e3d5d0;border-radius:50%;
        background:#fffaf8;color:#69485d;box-shadow:0 4px 16px rgba(73,49,63,.12);
        cursor:pointer;align-items:center;justify-content:center;
      }
      #${BAR_ID}[data-visible="true"]{display:flex}
      #${BAR_ID} .nm-notify-icon{font-size:19px;line-height:1}
      #${BAR_ID} .nm-notify-copy,#${BAR_ID} .nm-notify-action{display:none}
      #${BAR_ID} .nm-notify-badge{
        position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;
        border-radius:999px;background:#7a526a;color:white;border:2px solid #fffaf8;
        display:none;align-items:center;justify-content:center;
        font:700 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      #${BAR_ID}[data-count]:not([data-count="0"]) .nm-notify-badge{display:flex}
      @media(max-width:560px){#${BAR_ID}{top:10px;right:10px;width:38px;height:38px}}
    `;
    document.head.appendChild(style);
  }

  function ensureBar() {
    installStyle();
    let bar = document.getElementById(BAR_ID);
    if (bar) return bar;
    bar = document.createElement('button');
    bar.id = BAR_ID;
    bar.type = 'button';
    bar.setAttribute('aria-label', 'Notifications');
    bar.innerHTML = `<span class="nm-notify-icon" aria-hidden="true">♧</span><span class="nm-notify-badge" aria-hidden="true">1</span><span class="nm-notify-copy"><span class="nm-notify-message"></span></span>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', () => {
      const info = temporary || statusMessage();
      alert(info.message);
    });
    return bar;
  }

  function statusMessage() {
    const state = readJson(STATE_KEY, null) || {};
    const profile = state.profile || {};
    const reminderTime = formatTime(profile.reminderTime);

    if (profile.reminders === true && profile.notifications === true &&
        'Notification' in window && Notification.permission === 'granted') {
      return {
        state: 'active',
        message: reminderTime
          ? `Gentle reminders are on · Daily check-in at ${reminderTime}`
          : 'Gentle reminders and device notifications are on.'
      };
    }

    if (profile.reminders === true) {
      return {
        state: 'attention',
        message: reminderTime
          ? `Daily check-in set for ${reminderTime} · Turn on device notifications in Profile`
          : 'Your check-in reminder is set · Turn on device notifications in Profile'
      };
    }

    return {
      state: 'quiet',
      message: 'You’re all caught up · Gentle reminders can be turned on anytime in Profile'
    };
  }

  function refresh() {
    const bar = ensureBar();

    if (!signedIn()) {
      bar.dataset.visible = 'false';
      return;
    }

    const info = temporary || statusMessage();
    const message = bar.querySelector('.nm-notify-message');
    if (message && message.textContent !== info.message) message.textContent = info.message;
    bar.dataset.state = info.state || 'quiet';
    const unread = info.state === 'attention' || temporary ? 1 : 0;
    bar.dataset.count = String(unread);
    const badge = bar.querySelector('.nm-notify-badge');
    if (badge) badge.textContent = unread > 9 ? '9+' : String(unread);
    bar.dataset.visible = 'true';
  }

  window.NurtureMomNotificationBar = {
    refresh,
    show(message, options = {}) {
      clearTimeout(temporaryTimer);
      temporary = {
        state: options.state || 'active',
        message: String(message || '').trim() || 'NurtureMom has an update for you.'
      };
      refresh();
      const duration = Math.max(1500, Number(options.duration || 6000));
      temporaryTimer = setTimeout(() => {
        temporary = null;
        refresh();
      }, duration);
    },
    clear() {
      clearTimeout(temporaryTimer);
      temporary = null;
      refresh();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }

  window.addEventListener('storage', refresh);
  setInterval(refresh, 2500);
})();
