(() => {
  'use strict';

  const SUPABASE_URL = 'https://ocorbzbkzfdmurolngdf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unerunySitlxOS8BLKyboA_z1vNhY5W';
  const SESSION_KEY = 'nurturemom.supabase.session';
  const STATE_KEY = 'nurturemom.v1';
  const AUTO_OPEN_KEY = 'nurturemom.plus.auto_opened.v1';
  const PLUS_CACHE_KEY = 'nurturemom.plus.entitlement.v1';
  const VOICE_SRC = '/nurturemom-voice-moment-soft-01.mp3';

  let entitlement = null;
  let observer = null;
  let renderTimer = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  function readJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getSession() {
    return readJSON(SESSION_KEY, null);
  }

  function getState() {
    return readJSON(STATE_KEY, null);
  }

  function normalizedAccess(data) {
    if (typeof data === 'boolean') return data;
    if (Array.isArray(data)) {
      const row = data[0];
      if (typeof row === 'boolean') return row;
      return !!(row?.has_access || row?.allowed || row?.active || row?.founder || row?.is_founder || row?.plan === 'plus' || row?.tier === 'plus');
    }
    return !!(data?.has_access || data?.allowed || data?.active || data?.founder || data?.is_founder || data?.plan === 'plus' || data?.tier === 'plus');
  }

  function cachedAccess() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(PLUS_CACHE_KEY) || 'null');
      if (!cached || Date.now() - Number(cached.checkedAt || 0) > 5 * 60 * 1000) return null;
      return !!cached.allowed;
    } catch (_) {
      return null;
    }
  }

  function saveAccess(allowed) {
    try {
      sessionStorage.setItem(PLUS_CACHE_KEY, JSON.stringify({ allowed: !!allowed, checkedAt: Date.now() }));
    } catch (_) {}
  }

  async function checkPlusAccess({ force = false } = {}) {
    const session = getSession();
    if (!session?.access_token) {
      entitlement = false;
      return false;
    }
    if (!force) {
      const cached = cachedAccess();
      if (cached !== null) {
        entitlement = cached;
        return cached;
      }
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/nm_plus_access`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      if (!response.ok) throw new Error('plus_lookup_failed');
      const data = await response.json().catch(() => false);
      entitlement = normalizedAccess(data);
      saveAccess(entitlement);
      return entitlement;
    } catch (_) {
      entitlement = false;
      return false;
    }
  }

  function daysPostpartum(profile) {
    const raw = profile?.birthDate || profile?.birth_date;
    if (!raw) return null;
    const birth = new Date(`${raw}T12:00:00`);
    if (!Number.isFinite(birth.getTime())) return null;
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    return Math.max(0, Math.floor((todayNoon - birth) / 86400000));
  }

  function stageCopy(profile) {
    const days = daysPostpartum(profile);
    if (days === null) return 'This season asks a lot of you. Your care still belongs in the day.';
    if (days < 14) return `These first ${Math.max(1, days + 1)} days can feel tender and intense. Healing, feeding, holding, resting, and simply getting through the next hour all count.`;
    if (days < 84) {
      const week = Math.floor(days / 7) + 1;
      return `You’re around week ${week}. Your baby may be changing quickly, and your recovery and emotional needs are still allowed to take up space too.`;
    }
    const months = Math.max(1, Math.floor(days / 30.44));
    return `You’re about ${months} month${months === 1 ? '' : 's'} into this chapter. NurtureMom can shift with you as routines, identity, movement, work, and relationships begin to change again.`;
  }

  function latestRecovery(state) {
    const rows = Array.isArray(state?.recovery) ? state.recovery : [];
    return [...rows].sort((a, b) => String(b.date || b.day || '').localeCompare(String(a.date || a.day || '')))[0] || null;
  }

  function careDecision(state) {
    const x = latestRecovery(state);
    const stage = stageCopy(state?.profile || {});
    const base = {
      eyebrow: 'CARE FOR RIGHT NOW',
      title: 'A softer moment for you',
      body: stage,
      primary: 'voice',
      primaryLabel: 'Hear something gentle',
      secondary: null,
      secondaryLabel: ''
    };

    if (!x) return base;

    const sleep = Number(x.sleep);
    const energy = Number(x.energy);
    const supported = Number(x.supported);
    const meals = Number(x.meals);
    const mood = String(x.mood || '');

    if (mood === 'Need support today' || (Number.isFinite(supported) && supported <= 2)) {
      return {
        eyebrow: 'YOU DO NOT HAVE TO CARRY TODAY ALONE',
        title: 'Let someone come closer',
        body: `You told NurtureMom that support feels thin right now. ${stage} You may be feeding, holding, soothing, or simply trying to make it through the next stretch. One small ask is enough.`,
        primary: 'request',
        primaryLabel: 'Ask my Village for help',
        secondary: 'voice',
        secondaryLabel: 'Stay with me for a moment'
      };
    }

    if ((Number.isFinite(sleep) && sleep < 5) || (Number.isFinite(energy) && energy <= 2)) {
      return {
        eyebrow: 'REST DESERVES PROTECTION',
        title: 'You have been running on very little',
        body: `Tiredness can make everything feel heavier. ${stage} You do not have to earn a pause before someone helps carry a piece of the day.`,
        primary: 'voice',
        primaryLabel: 'Play a gentle Voice Moment',
        secondary: 'request',
        secondaryLabel: 'Ask for a rest window'
      };
    }

    if (Number.isFinite(meals) && meals < 2) {
      return {
        eyebrow: 'NOURISHING YOU COUNTS',
        title: 'Let food be one less thing to solve',
        body: `Your check-in suggests you may not have had much chance to eat. ${stage} Caring for your baby does not make your own basic needs optional.`,
        primary: 'request',
        primaryLabel: 'Ask my Village for a meal',
        secondary: 'voice',
        secondaryLabel: 'Hear something gentle'
      };
    }

    return {
      eyebrow: 'A LITTLE CARE, BEFORE YOU NEED TO CRASH',
      title: 'You do not have to wait for a hard day',
      body: `${stage} Support is allowed on steady days too. Take a small moment that belongs to you.`,
      primary: 'voice',
      primaryLabel: 'Hear something gentle',
      secondary: 'request',
      secondaryLabel: 'Let my Village carry one thing'
    };
  }

  function installStyles() {
    if (document.getElementById('nmCareEngineStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmCareEngineStyles';
    style.textContent = `
      .nm-care-engine-card{margin:18px 0;padding:18px;border:1px solid #eadbd6;border-radius:20px;background:linear-gradient(145deg,#fffaf7,#f8ece7);box-shadow:0 8px 26px rgba(78,46,57,.07)}
      .nm-care-engine-card .nm-ce-eyebrow{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.08em;color:#7b3f59}
      .nm-care-engine-card h2{margin:0 0 8px;font:700 23px Georgia,serif;color:#49343d}
      .nm-care-engine-card p{margin:0;color:#66535b;line-height:1.55}
      .nm-ce-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
      .nm-ce-btn{border:0;border-radius:13px;padding:11px 14px;font-weight:800;cursor:pointer}
      .nm-ce-primary{background:#75435f;color:#fff}.nm-ce-secondary{background:#fff;color:#75435f;border:1px solid #d9c8c6}
      .nm-ce-privacy{margin-top:10px!important;font-size:11px;color:#8a747d!important}
      .nm-voice-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:flex-end;justify-content:center;background:rgba(45,30,36,.52);padding:0}
      .nm-voice-modal.open{display:flex}
      .nm-voice-sheet{width:min(560px,100%);background:#fffaf7;border-radius:26px 26px 0 0;padding:22px 20px 28px;box-shadow:0 -18px 50px rgba(45,30,36,.16)}
      .nm-voice-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;color:#7b3f59}
      .nm-voice-sheet h2{font:700 26px Georgia,serif;margin:8px 0;color:#49343d}
      .nm-voice-sheet p{color:#66535b;line-height:1.55}
      .nm-voice-sheet audio{width:100%;margin:16px 0 8px}
      .nm-voice-close{width:100%;margin-top:12px;border:1px solid #d9c8c6;background:#fff;border-radius:13px;padding:12px;font-weight:800;color:#75435f}
      body[data-nm-plus="active"] .plus-profile-entry small::after{content:" · Plus active";font-weight:800;color:#7b3f59}
      .nm-plus-active-pill{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:5px 9px;border-radius:999px;background:#f7e8ed;color:#75435f;font-size:11px;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function hideActiveUpsells() {
    if (!entitlement) return;
    const candidates = [...document.querySelectorAll('button,a,section,article,div')];
    for (const el of candidates) {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 180) continue;
      if (/^(upgrade|go plus|unlock plus|start plus|subscribe to plus)/i.test(text)) {
        el.style.display = 'none';
        el.dataset.nmPlusHidden = '1';
      }
    }
  }

  function markPlusActive() {
    if (!entitlement) return;
    document.body.dataset.nmPlus = 'active';
    const entry = document.querySelector('.plus-profile-entry');
    if (entry && !entry.querySelector('.nm-plus-active-pill')) {
      const pill = document.createElement('span');
      pill.className = 'nm-plus-active-pill';
      pill.textContent = 'PLUS ACTIVE';
      entry.appendChild(pill);
    }
    hideActiveUpsells();
  }

  function plusContainer() {
    if (decodeURIComponent(location.hash.slice(1)) !== 'Plus') return null;
    const hero = document.querySelector('.plus-hero');
    return hero?.parentElement || null;
  }

  function navigateToRequests() {
    location.hash = 'Requests';
  }

  function voiceLines() {
    return [
      'You may be holding your baby, feeding them, rocking them, or finally sitting down. This moment does not ask anything from you.',
      'Look at how much life has changed around you—and remember that the woman inside this new chapter still deserves tenderness too.',
      'You have already traveled a long way to get here. The hard parts do not erase the beauty, and the beauty does not cancel the hard parts.',
      'Your baby knows your warmth, your voice, your presence. And while you keep pouring into them, this moment is here to pour a little back into you.'
    ];
  }

  function openVoiceMoment() {
    let modal = document.getElementById('nmVoiceMomentModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nmVoiceMomentModal';
      modal.className = 'nm-voice-modal';
      modal.innerHTML = `
        <section class="nm-voice-sheet" role="dialog" aria-modal="true" aria-labelledby="nmVoiceTitle">
          <div class="nm-voice-kicker">NURTUREMOM VOICE MOMENT · SOFT PREVIEW</div>
          <h2 id="nmVoiceTitle">Stay with me for a moment ♡</h2>
          <p id="nmVoiceFreshLine"></p>
          <audio id="nmVoicePlayer" controls preload="metadata" src="${VOICE_SRC}"></audio>
          <p class="nm-ce-privacy">Baby gives the context. Mom remains the focus. Nothing from your private AI conversations is used here.</p>
          <button type="button" class="nm-voice-close">Close gently</button>
        </section>`;
      document.body.appendChild(modal);
      modal.querySelector('.nm-voice-close').addEventListener('click', closeVoiceMoment);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeVoiceMoment(); });
    }
    const lines = voiceLines();
    const last = Number(sessionStorage.getItem('nurturemom.voice.line_index') || -1);
    const next = (last + 1) % lines.length;
    sessionStorage.setItem('nurturemom.voice.line_index', String(next));
    document.getElementById('nmVoiceFreshLine').textContent = lines[next];
    modal.classList.add('open');
  }

  function closeVoiceMoment() {
    const modal = document.getElementById('nmVoiceMomentModal');
    const player = document.getElementById('nmVoicePlayer');
    if (player) player.pause();
    modal?.classList.remove('open');
  }

  function injectCareCard() {
    if (!entitlement) return;
    const container = plusContainer();
    if (!container) return;
    if (document.getElementById('nmCareEngineCard')) return;

    const state = getState();
    const care = careDecision(state || {});
    const card = document.createElement('section');
    card.id = 'nmCareEngineCard';
    card.className = 'nm-care-engine-card';
    card.innerHTML = `
      <p class="nm-ce-eyebrow">${esc(care.eyebrow)}</p>
      <h2>${esc(care.title)}</h2>
      <p>${esc(care.body)}</p>
      <div class="nm-ce-actions">
        <button type="button" class="nm-ce-btn nm-ce-primary" data-action="${esc(care.primary)}">${esc(care.primaryLabel)}</button>
        ${care.secondary ? `<button type="button" class="nm-ce-btn nm-ce-secondary" data-action="${esc(care.secondary)}">${esc(care.secondaryLabel)}</button>` : ''}
      </div>
      <p class="nm-ce-privacy">Shaped only from your recovery stage and check-ins. Your private companion chats stay private unless you explicitly choose otherwise.</p>`;

    const grid = container.querySelector('.plus-grid');
    if (grid) container.insertBefore(card, grid);
    else container.appendChild(card);

    card.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'voice') openVoiceMoment();
        if (action === 'request') navigateToRequests();
      });
    });
  }

  function render() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      markPlusActive();
      injectCareCard();
    }, 60);
  }

  function autoOpenPlus() {
    if (!entitlement) return;
    const session = getSession();
    if (!session?.access_token) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY) === '1') return;
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && hash !== 'Home') return;
    sessionStorage.setItem(AUTO_OPEN_KEY, '1');
    location.hash = 'Plus';
  }

  async function boot() {
    installStyles();
    const allowed = await checkPlusAccess();
    if (allowed) {
      autoOpenPlus();
      render();
    }

    observer = new MutationObserver(() => render());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('hashchange', render);
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_KEY || e.key === STATE_KEY) {
        if (e.key === SESSION_KEY) {
          try { sessionStorage.removeItem(PLUS_CACHE_KEY); sessionStorage.removeItem(AUTO_OPEN_KEY); } catch (_) {}
          checkPlusAccess({ force: true }).then((ok) => { if (ok) autoOpenPlus(); render(); });
        } else {
          document.getElementById('nmCareEngineCard')?.remove();
          render();
        }
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkPlusAccess({ force: true }).then(() => render());
    });
    window.addEventListener('nurturemom:checkin-saved', () => {
      document.getElementById('nmCareEngineCard')?.remove();
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();