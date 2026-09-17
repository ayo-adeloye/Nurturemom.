(() => {
  const MOVEMENT_KEY = 'nurturemom_plus_movement';
  const GOAL_KEY = 'nurturemom_plus_movement_goal';
  const PERMISSION_KEY = 'nurturemom_motion_permission';
  const TRACKER_KEY = 'nurturemom_plus_auto_motion_today';
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const $ = (s, root = document) => root.querySelector(s);

  const state = {
    installed: false,
    listening: false,
    supported: 'DeviceMotionEvent' in window,
    permission: localStorage.getItem(PERMISSION_KEY) || 'unknown',
    steps: 0,
    activeSeconds: 0,
    lastStepAt: 0,
    lastDynamic: 0,
    gravity: 9.81,
    activeUntil: 0,
    dirty: false,
    ticker: null,
    saver: null,
    lastSavedMinute: -1
  };

  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '');
      return v ?? fallback;
    } catch (_) { return fallback; }
  }

  function loadToday() {
    const saved = readJSON(TRACKER_KEY, null);
    if (saved?.date === todayISO()) {
      state.steps = Number(saved.steps) || 0;
      state.activeSeconds = Number(saved.activeSeconds) || 0;
    } else {
      localStorage.setItem(TRACKER_KEY, JSON.stringify({ date: todayISO(), steps: 0, activeSeconds: 0 }));
    }
  }

  function saveTrackerSnapshot() {
    localStorage.setItem(TRACKER_KEY, JSON.stringify({
      date: todayISO(),
      steps: state.steps,
      activeSeconds: state.activeSeconds,
      updated_at: new Date().toISOString()
    }));
  }

  function upsertMovementRow(force = false) {
    if (!state.dirty && !force) return;
    const date = todayISO();
    const rows = readJSON(MOVEMENT_KEY, []);
    const list = Array.isArray(rows) ? rows : [];
    const existing = list.find(r => r?.date === date) || {};
    const goal = Number(localStorage.getItem(GOAL_KEY) || existing.goal || 10);
    const autoMinutes = Math.floor(state.activeSeconds / 60);
    const manualMinutes = Number(existing.manualMinutes ?? (existing.source === 'manual' ? existing.minutes : 0)) || 0;
    const manualSteps = Number(existing.manualSteps ?? 0) || 0;
    const minutes = Math.max(autoMinutes, manualMinutes);
    const steps = Math.max(state.steps, manualSteps, Number(existing.steps) || 0);
    const item = {
      ...existing,
      id: existing.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      date,
      minutes,
      steps,
      goal,
      source: existing.source === 'manual' ? 'manual+auto' : 'auto-motion',
      autoTracked: true,
      autoActiveSeconds: state.activeSeconds,
      autoSteps: state.steps,
      created_at: new Date().toISOString()
    };
    const next = [item, ...list.filter(r => r?.date !== date)].slice(0, 120);
    localStorage.setItem(MOVEMENT_KEY, JSON.stringify(next));
    state.dirty = false;
    saveTrackerSnapshot();
    refreshPanel();
    try { window.dispatchEvent(new CustomEvent('nurturemom:auto-movement-saved', { detail: item })); } catch (_) {}
  }

  function onMotion(event) {
    if (document.visibilityState !== 'visible') return;
    const a = event.accelerationIncludingGravity || event.acceleration;
    if (!a) return;
    const x = Number(a.x) || 0, y = Number(a.y) || 0, z = Number(a.z) || 0;
    const mag = Math.sqrt(x*x + y*y + z*z);
    if (!Number.isFinite(mag) || mag === 0) return;

    state.gravity = state.gravity * 0.92 + mag * 0.08;
    const dynamic = Math.abs(mag - state.gravity);
    const now = performance.now();

    if (dynamic > 0.65) state.activeUntil = now + 2600;

    const crossed = dynamic > 1.15 && state.lastDynamic <= 1.15;
    if (crossed && now - state.lastStepAt > 280) {
      state.steps += 1;
      state.lastStepAt = now;
      state.dirty = true;
      refreshPanel();
    }
    state.lastDynamic = dynamic;
  }

  function startListening() {
    if (!state.supported || state.listening || document.visibilityState !== 'visible') return;
    window.addEventListener('devicemotion', onMotion, { passive: true });
    state.listening = true;
    refreshPanel();
  }

  function stopListening() {
    if (!state.listening) return;
    window.removeEventListener('devicemotion', onMotion);
    state.listening = false;
    upsertMovementRow(true);
    refreshPanel();
  }

  async function requestPermission() {
    if (!state.supported) return refreshPanel();
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const result = await DeviceMotionEvent.requestPermission();
        state.permission = result;
        localStorage.setItem(PERMISSION_KEY, result);
        if (result === 'granted') startListening();
      } else {
        state.permission = 'granted';
        localStorage.setItem(PERMISSION_KEY, 'granted');
        startListening();
      }
    } catch (_) {
      state.permission = 'denied';
      localStorage.setItem(PERMISSION_KEY, 'denied');
    }
    refreshPanel();
  }

  function permissionNeedsTap() {
    return state.supported && typeof DeviceMotionEvent.requestPermission === 'function' && state.permission !== 'granted';
  }

  function statusText() {
    if (!state.supported) return 'Automatic motion tracking is not available in this browser. You can still log movement manually.';
    if (permissionNeedsTap()) return state.permission === 'denied'
      ? 'Motion access is off. You can enable it in your browser/device settings, or keep logging movement manually.'
      : 'One quick setup: allow motion access once, then NurtureMom can track while the app is open.';
    if (document.visibilityState !== 'visible') return 'Tracking pauses when NurtureMom is in the background.';
    return state.listening ? 'Tracking gently while NurtureMom is open.' : 'Ready to track while NurtureMom is open.';
  }

  function panelMarkup() {
    const minutes = Math.floor(state.activeSeconds / 60);
    const button = permissionNeedsTap() && state.permission !== 'denied'
      ? '<button type="button" class="nm-plus-go" id="nmEnableMotion" style="margin-top:12px;width:100%">Enable automatic tracking</button>'
      : '';
    return `
      <div class="nm-plus-card" id="nmAutoMovementCard" style="background:linear-gradient(135deg,#fff8f5,#fffdf9)">
        <div class="nm-plus-kicker">LIVE MOVEMENT</div>
        <h3 style="margin-top:5px">Your movement, noticed for you ♡</h3>
        <p id="nmAutoMotionStatus">${statusText()}</p>
        <div class="nm-plus-metric">
          <div><b id="nmAutoSteps">${state.steps.toLocaleString()}</b><span>estimated steps</span></div>
          <div><b id="nmAutoMinutes">${minutes}</b><span>active minutes</span></div>
          <div><b id="nmAutoState">${state.listening ? 'Live' : 'Paused'}</b><span>tracker</span></div>
        </div>
        ${button}
        <div class="nm-plus-small">For privacy, this uses your phone’s motion sensor only while NurtureMom is open in the foreground. Step counts are estimates and may vary depending on where you carry your phone.</div>
      </div>`;
  }

  function ensurePanel() {
    const overlay = document.getElementById('nmPlusMovement');
    if (!overlay || document.getElementById('nmAutoMovementCard')) return;
    const sheet = $('.nm-plus-sheet', overlay);
    const head = $('.nm-plus-head', overlay);
    if (!sheet || !head) return;
    head.insertAdjacentHTML('afterend', panelMarkup());
    document.getElementById('nmEnableMotion')?.addEventListener('click', requestPermission);
  }

  function refreshPanel() {
    ensurePanel();
    const steps = document.getElementById('nmAutoSteps');
    const mins = document.getElementById('nmAutoMinutes');
    const live = document.getElementById('nmAutoState');
    const status = document.getElementById('nmAutoMotionStatus');
    if (steps) steps.textContent = state.steps.toLocaleString();
    if (mins) mins.textContent = String(Math.floor(state.activeSeconds / 60));
    if (live) live.textContent = state.listening ? 'Live' : 'Paused';
    if (status) status.textContent = statusText();
  }

  function watchMovementOverlay() {
    const observer = new MutationObserver(() => {
      const overlay = document.getElementById('nmPlusMovement');
      if (!overlay) return;
      ensurePanel();
      if (overlay.classList.contains('open')) {
        if (!permissionNeedsTap() && state.permission !== 'denied') startListening();
        refreshPanel();
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }

  function startTimers() {
    if (!state.ticker) state.ticker = setInterval(() => {
      if (state.listening && document.visibilityState === 'visible' && performance.now() < state.activeUntil) {
        state.activeSeconds += 1;
        state.dirty = true;
      }
      refreshPanel();
    }, 1000);
    if (!state.saver) state.saver = setInterval(() => {
      const minute = Math.floor(state.activeSeconds / 60);
      if (state.dirty && minute !== state.lastSavedMinute) {
        state.lastSavedMinute = minute;
        upsertMovementRow();
      }
    }, 30000);
  }

  function maybeAutoStart() {
    if (!state.supported || document.visibilityState !== 'visible') return;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      if (state.permission === 'granted') startListening();
    } else {
      state.permission = 'granted';
      localStorage.setItem(PERMISSION_KEY, 'granted');
      startListening();
    }
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    loadToday();
    startTimers();
    watchMovementOverlay();
    ensurePanel();
    maybeAutoStart();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') maybeAutoStart();
      else stopListening();
    });
    window.addEventListener('pagehide', () => upsertMovementRow(true));
    window.addEventListener('beforeunload', () => upsertMovementRow(true));
    window.addEventListener('nurturemom:plus-state', () => maybeAutoStart());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();