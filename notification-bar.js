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
        position:sticky;top:0;z-index:90;display:none;
        align-items:center;gap:10px;width:100%;
        padding:9px 14px;background:#f6eee9;color:#5b4250;
        border-bottom:1px solid #e3d5d0;
        box-shadow:0 2px 8px rgba(73,49,63,.06);
        font:500 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      #${BAR_ID}[data-visible="true"]{display:flex}
      #${BAR_ID} .nm-notify-icon{
        display:grid;place-items:center;flex:0 0 auto;width:29px;height:29px;
        border-radius:50%;background:#fff9f6;font-size:15px
      }
      #${BAR_ID} .nm-notify-copy{min-width:0;flex:1}
      #${BAR_ID} .nm-notify-copy strong{display:block;font-size:12px;letter-spacing:.01em;color:#69485d}
      #${BAR_ID} .nm-notify-copy span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${BAR_ID} .nm-notify-action{
        flex:0 0 auto;border:0;background:transparent;color:#7a526a;
        font:700 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        padding:8px 4px;cursor:pointer
      }
      #${BAR_ID}[data-state="active"] .nm-notify-icon{background:#efe2dc}
      #${BAR_ID}[data-state="attention"]{background:#fff5e9;color:#654b39;border-bottom-color:#ead7bd}
      @media(max-width:560px){
        #${BAR_ID}{padding:8px 10px;gap:8px}
        #${BAR_ID} .nm-notify-copy span{font-size:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBar() {
    installStyle();
    let bar = document.getElementById(BAR_ID);
    if (bar) return bar;

    bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `
      <span class="nm-notify-icon" aria-hidden="true">♡</span>
      <span class="nm-notify-copy">
        <strong>Notifications</strong>
        <span class="nm-notify-message"></span>
      </span>
      <button class="nm-notify-action" type="button">Profile</button>
    `;
    document.body.insertBefore(bar, document.body.firstChild);

    bar.querySelector('.nm-notify-action').addEventListener('click', () => {
      const candidates = [...document.querySelectorAll('button, a, [role="button"]')];
      const target = candidates.find((el) => /^profile$/i.test(String(el.textContent || '').trim()))
        || candidates.find((el) => /profile|account/i.test(String(el.getAttribute('aria-label') || '')));
      if (target && typeof target.click === 'function') target.click();
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
