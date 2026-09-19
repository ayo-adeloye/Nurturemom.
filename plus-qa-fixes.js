(function () {
  'use strict';

  // NurtureMom Plus QA runtime hardening.
  // Loaded before the compiled app so private local data can be scoped safely.
  const SESSION_KEY = 'nurturemom.supabase.session';
  const APP_STATE_KEY = 'nurturemom.v1';
  const PRIVATE_KEYS = new Set([
    'nurturemom.private.companion.v1',
    'nurturemom.gentle.steps.v1'
  ]);
  const ACTIVE_USER_KEY = 'nurturemom.active.user.v1';
  const SUPABASE_URL = 'https://ocorbzbkzfdmurolngdf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_unerunySitlxOS8BLKyboA_z1vNhY5W';

  const nativeStorage = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };

  function decodeJwtUser(token) {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return '';
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      return String(payload.sub || '');
    } catch (_) {
      return '';
    }
  }

  function rawSession() {
    try {
      return JSON.parse(nativeStorage.getItem.call(localStorage, SESSION_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function currentUserId() {
    const session = rawSession();
    return String(session && session.user && session.user.id || decodeJwtUser(session && session.access_token) || '');
  }

  function scopedKey(key) {
    const text = String(key);
    if (!PRIVATE_KEYS.has(text)) return text;
    const userId = currentUserId();
    return text + ':user:' + (userId || 'signed-out');
  }

  Storage.prototype.getItem = function (key) {
    if (this === localStorage && PRIVATE_KEYS.has(String(key))) {
      return nativeStorage.getItem.call(this, scopedKey(key));
    }
    return nativeStorage.getItem.call(this, key);
  };

  Storage.prototype.setItem = function (key, value) {
    if (this === localStorage && PRIVATE_KEYS.has(String(key))) {
      return nativeStorage.setItem.call(this, scopedKey(key), value);
    }

    if (this === localStorage && String(key) === SESSION_KEY) {
      const before = currentUserId();
      const result = nativeStorage.setItem.call(this, key, value);
      const after = currentUserId();
      if (after) {
        const last = sessionStorage.getItem(ACTIVE_USER_KEY) || before;
        sessionStorage.setItem(ACTIVE_USER_KEY, after);
        if (last && last !== after) {
          // Reload on a real account switch so no private in-memory state survives.
          setTimeout(function () { location.reload(); }, 0);
        }
      }
      window.dispatchEvent(new CustomEvent('nurturemom:session-changed', { detail: { userId: after } }));
      return result;
    }

    return nativeStorage.setItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function (key) {
    if (this === localStorage && PRIVATE_KEYS.has(String(key))) {
      return nativeStorage.removeItem.call(this, scopedKey(key));
    }
    const result = nativeStorage.removeItem.call(this, key);
    if (this === localStorage && String(key) === SESSION_KEY) {
      window.dispatchEvent(new CustomEvent('nurturemom:session-changed', { detail: { userId: '' } }));
    }
    return result;
  };

  const initialUser = currentUserId();
  if (initialUser) sessionStorage.setItem(ACTIVE_USER_KEY, initialUser);
  window.__NURTUREMOM_PRIVATE_STORAGE_SCOPED__ = true;

  // ---------- Plus / Founder entitlement ----------
  let accessCache = { userId: '', at: 0, value: null };

  async function getPlusAccess(force) {
    const session = rawSession();
    const userId = currentUserId();
    if (!session || !session.access_token || !userId) {
      return { has_access: false, signed_out: true, plan: 'free' };
    }

    if (!force && accessCache.userId === userId && accessCache.value && Date.now() - accessCache.at < 60000) {
      return accessCache.value;
    }

    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/nm_plus_access', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });

      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data && (data.message || data.error) || 'access_check_failed');

      const value = {
        plan: String(data.plan || 'free'),
        plus_access: data.plus_access === true,
        founder_access: data.founder_access === true || data.founder === true,
        has_access: data.has_access === true || data.plus_access === true || data.founder_access === true || data.founder === true || data.plan === 'plus' || data.plan === 'pro_plus'
      };

      accessCache = { userId: userId, at: Date.now(), value: value };
      return value;
    } catch (error) {
      return { has_access: false, verification_error: true, message: String(error && error.message || error) };
    }
  }

  window.NurtureMomPlusAccess = {
    get: function () { return getPlusAccess(false); },
    refresh: function () { return getPlusAccess(true); }
  };

  async function companionPreflight(message) {
    const session = rawSession();
    if (!session || !session.access_token || !currentUserId()) {
      return { ok: false, status: 401, error: 'sign_in_required' };
    }

    const access = await getPlusAccess(true);
    if (!access.has_access) {
      return {
        ok: false,
        status: access.signed_out ? 401 : 403,
        error: access.verification_error ? 'access_check_failed' : 'plus_required'
      };
    }

    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/nm-ai-companion', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: String(message || 'Please give me one gentle encouraging sentence for today.').slice(0, 1200) }],
          context: {}
        })
      });
      const data = await response.json().catch(function () { return {}; });
      return {
        ok: response.ok && typeof data.reply === 'string' && data.reply.trim().length > 0,
        status: response.status,
        error: response.ok ? '' : String(data.error || 'companion_unavailable'),
        reply: response.ok ? String(data.reply || '').trim() : ''
      };
    } catch (error) {
      return { ok: false, status: 0, error: String(error && error.message || error) };
    }
  }

  window.NurtureMomCompanionQA = {
    preflight: companionPreflight
  };

  let bypassPlusGuard = false;

  function isPlusEntryButton(button) {
    if (!button) return false;
    const text = String(button.textContent || '').replace(/\s+/g, ' ').trim();
    return /NurtureMom Plus/i.test(text);
  }

  document.addEventListener('click', async function (event) {
    if (bypassPlusGuard) return;
    const button = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!isPlusEntryButton(button)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const access = await getPlusAccess(true);
    if (access.has_access) {
      bypassPlusGuard = true;
      try {
        button.click();
      } finally {
        setTimeout(function () { bypassPlusGuard = false; }, 0);
      }
      return;
    }

    if (access.signed_out) {
      alert('Sign in to open NurtureMom Plus.');
    } else if (access.verification_error) {
      alert('We could not verify your NurtureMom Plus access right now. Please try again.');
    } else {
      alert('NurtureMom Plus is available with a Plus or Founder account.');
    }
  }, true);

  // ---------- Account plan badge ----------
  async function renderAccountPlan() {
    const buttons = Array.from(document.querySelectorAll('.profile-button'));
    const profileEntry = document.querySelector('.plus-profile-entry');
    const access = await getPlusAccess(false);

    document.querySelectorAll('.nm-account-plan').forEach(function (el) { el.remove(); });
    if (!access.has_access) return;

    const label = access.founder_access ? 'NurtureMom Plus · Founder' : 'NurtureMom Plus';
    buttons.forEach(function (button) {
      const name = button.querySelector('.profile-name');
      if (!name) return;
      const badge = document.createElement('small');
      badge.className = 'nm-account-plan';
      badge.textContent = label;
      name.insertAdjacentElement('afterend', badge);
    });

    if (profileEntry) {
      const strong = profileEntry.querySelector('strong');
      if (strong) strong.textContent = label;
    }
  }

  // ---------- Voice Moments transport ----------
  const speech = window.speechSynthesis;
  let lastVoiceMoment = null;

  function voiceMomentViewVisible() {
    return Array.from(document.querySelectorAll('h1,h2,h3')).some(function (el) {
      return String(el.textContent || '').trim() === 'NurtureMom Voice Moments';
    });
  }

  function ensureVoiceControls() {
    if (!voiceMomentViewVisible()) return null;

    let controls = document.getElementById('nmVoiceTransport');
    if (controls) return controls;

    controls = document.createElement('div');
    controls.id = 'nmVoiceTransport';
    controls.className = 'nm-voice-transport';
    controls.setAttribute('aria-label', 'Voice Moment playback controls');
    controls.innerHTML =
      '<button type="button" data-nm-voice="pause">Pause</button>' +
      '<button type="button" data-nm-voice="resume">Resume</button>' +
      '<button type="button" data-nm-voice="replay">Replay</button>';

    const privacy = Array.from(document.querySelectorAll('p')).find(function (el) {
      return /Pause or stop anytime/i.test(String(el.textContent || ''));
    });
    const carePlan = document.querySelector('.care-plan');
    const anchor = privacy || carePlan;

    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(controls, anchor.nextSibling);
    else document.body.appendChild(controls);

    controls.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-nm-voice]');
      if (!button || !speech) return;
      const action = button.getAttribute('data-nm-voice');

      if (action === 'pause' && speech.speaking && !speech.paused) {
        speech.pause();
      } else if (action === 'resume' && speech.paused) {
        speech.resume();
      } else if (action === 'replay' && lastVoiceMoment && window.SpeechSynthesisUtterance) {
        speech.cancel();
        const replay = new SpeechSynthesisUtterance(lastVoiceMoment.text);
        replay.rate = lastVoiceMoment.rate;
        replay.pitch = lastVoiceMoment.pitch;
        replay.volume = lastVoiceMoment.volume;
        replay.lang = lastVoiceMoment.lang;
        if (lastVoiceMoment.voice) replay.voice = lastVoiceMoment.voice;
        speech.speak(replay);
      }

      updateVoiceControls();
    });

    updateVoiceControls();
    return controls;
  }

  function updateVoiceControls() {
    const controls = document.getElementById('nmVoiceTransport');
    if (!controls || !speech) return;
    const pause = controls.querySelector('[data-nm-voice="pause"]');
    const resume = controls.querySelector('[data-nm-voice="resume"]');
    const replay = controls.querySelector('[data-nm-voice="replay"]');

    if (pause) pause.disabled = !speech.speaking || speech.paused;
    if (resume) resume.disabled = !speech.paused;
    if (replay) replay.disabled = !lastVoiceMoment;
  }

  if (speech && typeof speech.speak === 'function' && typeof speech.cancel === 'function') {
    const nativeSpeak = speech.speak.bind(speech);
    const nativeCancel = speech.cancel.bind(speech);

    try {
      speech.speak = function (utterance) {
      if (voiceMomentViewVisible() && utterance) {
        lastVoiceMoment = {
          text: String(utterance.text || ''),
          rate: Number.isFinite(utterance.rate) ? utterance.rate : 1,
          pitch: Number.isFinite(utterance.pitch) ? utterance.pitch : 1,
          volume: Number.isFinite(utterance.volume) ? utterance.volume : 1,
          lang: String(utterance.lang || ''),
          voice: utterance.voice || null
        };
        ensureVoiceControls();
        if (typeof utterance.addEventListener === 'function') {
          utterance.addEventListener('end', updateVoiceControls, { once: true });
          utterance.addEventListener('error', updateVoiceControls, { once: true });
          utterance.addEventListener('pause', updateVoiceControls);
          utterance.addEventListener('resume', updateVoiceControls);
        }
      }
      const result = nativeSpeak(utterance);
      setTimeout(updateVoiceControls, 50);
      return result;
    };

      speech.cancel = function () {
        const result = nativeCancel();
        setTimeout(updateVoiceControls, 20);
        return result;
      };
    } catch (_) {
      // Some embedded browsers expose non-writable speech methods. Voice playback still works;
      // the transport enhancement simply stays unavailable on those browsers.
    }
  }

  const style = document.createElement('style');
  style.textContent = [
    '.nm-account-plan{display:block;font-size:10px;font-weight:800;line-height:1.1;color:#7a526a;letter-spacing:.02em}',
    '.profile-button{position:relative}',
    '.nm-voice-transport{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 4px}',
    '.nm-voice-transport button{border:1px solid #d8c4c7;background:#fffaf8;color:#6f425c;border-radius:12px;padding:10px 8px;font-weight:700;cursor:pointer}',
    '.nm-voice-transport button:disabled{opacity:.42;cursor:not-allowed}',
    '@media(max-width:380px){.nm-voice-transport{grid-template-columns:1fr}.nm-voice-transport button{width:100%}}'
  ].join('');
  document.head.appendChild(style);

  // ---------- Adaptive weekly care ----------
  function readAppState() {
    try {
      return JSON.parse(nativeStorage.getItem.call(localStorage, APP_STATE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function dateFromRow(row) {
    const raw = row && (row.date || row.day);
    if (!raw) return null;
    const d = new Date(String(raw).slice(0, 10) + 'T12:00:00');
    return Number.isFinite(d.getTime()) ? d : null;
  }

  function rowsInRange(rows, startDaysAgo, endDaysAgo) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - startDaysAgo, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - endDaysAgo, 23, 59, 59);
    return (Array.isArray(rows) ? rows : []).filter(function (row) {
      const d = dateFromRow(row);
      return d && d >= start && d <= end;
    });
  }

  function avg(rows, key) {
    const values = (rows || []).map(function (row) { return Number(row && row[key]); }).filter(Number.isFinite);
    if (!values.length) return null;
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  function firstName(profile) {
    const raw = String(profile && (profile.name || profile.display_name) || '').trim();
    return raw ? raw.split(/\s+/)[0] : 'Mom';
  }

  function weeklyRecommendations(state) {
    const week = rowsInRange(state.recovery, 6, 0);
    const sleep = avg(week, 'sleep');
    const water = avg(week, 'water');
    const meals = avg(week, 'meals');
    const discomfort = avg(week, 'discomfort');
    const energy = avg(week, 'energy');
    const supported = avg(week, 'supported');
    const hardDays = week.filter(function (row) { return row && row.mood === 'Need support today'; }).length;

    const suggestions = [];

    if (sleep !== null && sleep < 5 || energy !== null && energy <= 2.5) {
      suggestions.push(['Protect one pocket of rest', 'Choose one small window for rest and let something non-urgent wait. Rest is recovery work.']);
    } else {
      suggestions.push(['Keep one gentle pause for yourself', 'Choose a short moment this week that belongs to you, even if it is only a few quiet minutes.']);
    }

    if (supported !== null && supported <= 2.5 || hardDays > 0) {
      suggestions.push(['Let your Village carry one thing', 'Ask for one specific kind of support this week: a meal, an errand, a check-in, or protected rest.']);
    } else if (meals !== null && meals < 2.3) {
      suggestions.push(['Make one meal easier', 'Choose the easiest nourishing option available and let your Village help with food if they can.']);
    } else {
      suggestions.push(['Keep support close', 'You do not have to wait for a hard day to receive care. Keep one easy support option within reach.']);
    }

    if (water !== null && water < 4) {
      suggestions.push(['Keep water within reach', 'Put a drink where you feed, pump, rest, or spend the most time so hydration asks less of you.']);
    } else if (discomfort !== null && discomfort >= 5) {
      suggestions.push(['Choose the gentler option', 'Let comfort and recovery guide your pace. If pain is severe, worsening, or concerning, contact your healthcare professional.']);
    } else {
      suggestions.push(['Check in without judging', 'Notice sleep, meals, water, mood, and support as information—not a score.']);
    }

    return suggestions.slice(0, 3);
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function weeklyLetterParts(state) {
    const profile = state.profile || {};
    const name = firstName(profile);
    const week = rowsInRange(state.recovery, 6, 0);
    const prior = rowsInRange(state.recovery, 13, 7);
    const sleep = avg(week, 'sleep');
    const priorSleep = avg(prior, 'sleep');
    const support = avg(week, 'supported');
    const priorSupport = avg(prior, 'supported');
    const hardDays = week.filter(function (row) { return row && row.mood === 'Need support today'; }).length;

    let steps = [];
    try {
      steps = JSON.parse(localStorage.getItem('nurturemom.gentle.steps.v1') || '[]');
    } catch (_) {}
    const movementWeek = rowsInRange(steps, 6, 0);
    const movementMinutes = movementWeek.reduce(function (sum, item) { return sum + Number(item.minutes || 0); }, 0);

    const observations = [];

    if (!week.length) {
      observations.push('You do not need a perfect week to deserve care. When it feels useful, one honest check-in is enough to start noticing what would make your days gentler.');
    } else {
      observations.push('You checked in ' + week.length + ' time' + (week.length === 1 ? '' : 's') + ' this week, making room to notice how you were doing.');
      if (sleep !== null && priorSleep !== null && sleep >= priorSleep + 0.5) {
        observations.push('You found a little more rest than the week before, and that matters.');
      } else if (sleep !== null && sleep < 5) {
        observations.push('Rest has been limited, so it makes sense if ordinary things have felt heavier.');
      }
      if (support !== null && priorSupport !== null && support < priorSupport - 0.6) {
        observations.push('You have felt less supported than the week before. That is a good reason to make one specific ask.');
      } else if (support !== null && support >= 4) {
        observations.push('You reported feeling supported on several check-ins. Keep letting that support count.');
      }
      if (hardDays > 0) {
        observations.push('There were hard moments too. Those moments deserve care, not pressure to push through.');
      }
    }

    if (movementMinutes > 0) {
      observations.push('You also recorded ' + movementMinutes + ' minute' + (movementMinutes === 1 ? '' : 's') + ' of gentle movement and listened to what your body could do.');
    }

    const closings = [
      'For the week ahead, choose softness over proving anything.',
      'For the week ahead, let receiving support count as progress too.',
      'For the week ahead, keep your needs in the picture alongside everyone else’s.',
      'For the week ahead, small care is still real care.'
    ];
    const closing = closings[isoWeekNumber(new Date()) % closings.length];

    return {
      name: name,
      body: observations.join(' '),
      closing: closing
    };
  }

  function applyWeeklyCare() {
    const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(function (el) {
      return String(el.textContent || '').trim() === 'Your gentle care plan';
    });
    if (!heading) return;

    let container = heading.parentElement;
    while (container && container !== document.body && !container.querySelector('.care-plan')) {
      container = container.parentElement;
    }
    if (!container || container === document.body) return;

    const plan = container.querySelector('.care-plan');
    if (!plan) return;

    const state = readAppState();
    const recs = weeklyRecommendations(state);
    const signature = JSON.stringify(recs);
    if (plan.dataset.nmAdaptiveSignature === signature) return;

    const articles = plan.querySelectorAll('article');
    recs.forEach(function (rec, index) {
      const article = articles[index];
      if (!article) return;
      const title = article.querySelector('h3');
      const copy = article.querySelector('p');
      if (title) title.textContent = rec[0];
      if (copy) copy.textContent = rec[1];
    });
    plan.dataset.nmAdaptiveSignature = signature;
  }

  function applyWeeklyLetter() {
    const letter = document.querySelector('blockquote.weekly-letter');
    if (!letter) return;

    const state = readAppState();
    const parts = weeklyLetterParts(state);
    const signature = parts.name + '|' + parts.body + '|' + parts.closing;
    if (letter.dataset.nmAdaptiveSignature === signature) return;

    const p1 = document.createElement('p');
    p1.textContent = 'Dear ' + parts.name + ',';

    const p2 = document.createElement('p');
    p2.textContent = parts.body;

    const p3 = document.createElement('p');
    p3.textContent = parts.closing;

    const p4 = document.createElement('p');
    p4.appendChild(document.createTextNode('With care,'));
    p4.appendChild(document.createElement('br'));
    const strong = document.createElement('strong');
    strong.textContent = 'NurtureMom ♡';
    p4.appendChild(strong);

    letter.replaceChildren(p1, p2, p3, p4);
    letter.dataset.nmAdaptiveSignature = signature;
  }

  let scheduled = false;
  function applyEnhancements() {
    scheduled = false;
    ensureVoiceControls();
    updateVoiceControls();
    applyWeeklyCare();
    applyWeeklyLetter();
    renderAccountPlan().catch(function () {});
  }

  function scheduleEnhancements() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyEnhancements);
  }

  const observer = new MutationObserver(scheduleEnhancements);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('nurturemom:session-changed', function () {
    accessCache = { userId: '', at: 0, value: null };
    scheduleEnhancements();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhancements, { once: true });
  } else {
    scheduleEnhancements();
  }
})();