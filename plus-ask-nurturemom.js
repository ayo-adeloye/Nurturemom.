(() => {
  const ID = 'nmAskNurtureMom';
  const ENTRY_ID = 'nmAskEntry';
  const SESSION_KEY = 'nurturemom_ask_session';
  const $ = (s, root = document) => root.querySelector(s);
  const byId = (id) => document.getElementById(id);

  function state() {
    return window.nmPlusGetState?.() || window.NURTUREMOM_PLUS_STATE || { preview: true, ready: false };
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function installStyles() {
    if (byId('nmAskStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmAskStyles';
    style.textContent = `
      .nm-ask-entry{position:relative;overflow:hidden;margin:0 0 14px;border:1px solid rgba(175,139,156,.24);border-radius:24px;padding:20px;background:radial-gradient(circle at 100% 0,rgba(179,137,158,.18),transparent 34%),linear-gradient(135deg,#fffaf6 0%,#f8ede9 100%);box-shadow:0 10px 32px rgba(78,48,65,.065)}
      .nm-ask-entry::after{content:'♡';position:absolute;right:18px;top:6px;font-family:var(--nm-plus-serif,Georgia,serif);font-size:72px;line-height:1;color:rgba(111,64,91,.055);pointer-events:none;animation:nmAskBreath 5.2s ease-in-out infinite}
      .nm-ask-kicker{font:600 10px/1.3 var(--nm-plus-sans,Arial,sans-serif);letter-spacing:.18em;text-transform:uppercase;color:var(--nm-plus-gold,#a9875f);margin-bottom:9px}
      .nm-ask-entry h2{font:600 31px/.98 var(--nm-plus-serif,Georgia,serif);letter-spacing:-.025em;color:var(--nm-plus-ink,#4a2d40);margin:0 58px 8px 0}
      .nm-ask-entry p{font:400 13px/1.65 var(--nm-plus-sans,Arial,sans-serif);color:var(--nm-plus-muted,#81757b);margin:0 40px 15px 0;max-width:380px}
      .nm-ask-entry button{border:0;border-radius:999px;background:linear-gradient(135deg,#75435f,#674058);color:#fff;padding:11px 16px;font:600 12px/1 var(--nm-plus-sans,Arial,sans-serif);box-shadow:0 8px 20px rgba(117,67,95,.16);transition:transform .16s ease,box-shadow .2s ease}
      .nm-ask-entry button:active{transform:scale(.965)}
      .nm-ask-note{margin-top:10px;font:400 10px/1.5 var(--nm-plus-sans,Arial,sans-serif);color:#95888e}

      .nm-ask-sheet{display:flex;flex-direction:column;height:min(92vh,760px);max-height:92vh;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important}
      .nm-ask-sheet .nm-plus-head{flex:0 0 auto;margin-bottom:10px!important}
      .nm-ask-status{display:flex;align-items:center;gap:7px;margin:0 0 10px;padding:8px 10px;border-radius:13px;background:rgba(248,238,233,.7);font:500 10px/1.4 var(--nm-plus-sans,Arial,sans-serif);color:#846f79}
      .nm-ask-status i{width:6px;height:6px;border-radius:50%;background:#9b6d83;box-shadow:0 0 0 4px rgba(155,109,131,.09)}
      .nm-ask-messages{flex:1;min-height:210px;overflow:auto;padding:4px 1px 16px;scroll-behavior:smooth}
      .nm-ask-message{display:flex;margin:10px 0;opacity:0;transform:translateY(5px);animation:nmAskIn .28s ease forwards}
      .nm-ask-message.user{justify-content:flex-end}.nm-ask-message.assistant{justify-content:flex-start}
      .nm-ask-bubble{max-width:86%;padding:12px 14px;border-radius:18px;font:400 13px/1.6 var(--nm-plus-sans,Arial,sans-serif);white-space:pre-wrap;word-break:break-word}
      .nm-ask-message.user .nm-ask-bubble{background:#71435d;color:#fff;border-bottom-right-radius:7px;box-shadow:0 6px 18px rgba(93,54,76,.12)}
      .nm-ask-message.assistant .nm-ask-bubble{background:rgba(255,255,255,.82);color:#57464e;border:1px solid rgba(232,222,217,.92);border-bottom-left-radius:7px;box-shadow:0 5px 18px rgba(70,45,54,.045)}
      .nm-ask-thinking .nm-ask-bubble{display:flex;gap:5px;align-items:center;min-width:54px}
      .nm-ask-thinking b{display:block;width:5px;height:5px;border-radius:50%;background:#9b7e8d;animation:nmAskDot 1.2s infinite ease-in-out}.nm-ask-thinking b:nth-child(2){animation-delay:.14s}.nm-ask-thinking b:nth-child(3){animation-delay:.28s}
      .nm-ask-chips{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 10px;scrollbar-width:none}.nm-ask-chips::-webkit-scrollbar{display:none}
      .nm-ask-chip{flex:0 0 auto;max-width:255px;border:1px solid rgba(214,195,204,.72);border-radius:999px;background:rgba(255,251,248,.9);color:#6d5360;padding:8px 11px;font:500 10px/1.3 var(--nm-plus-sans,Arial,sans-serif);white-space:nowrap}
      .nm-ask-context{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;margin:0 0 9px;border-radius:14px;background:rgba(248,240,236,.72);font:400 10px/1.45 var(--nm-plus-sans,Arial,sans-serif);color:#81757b}
      .nm-ask-context input{margin-top:2px;accent-color:#75435f}.nm-ask-context strong{display:block;color:#64485a;font-weight:600;margin-bottom:1px}
      .nm-ask-compose{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;border:1px solid rgba(218,205,211,.9);border-radius:18px;padding:7px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(70,45,54,.055)}
      .nm-ask-compose textarea{width:100%;min-height:42px;max-height:118px;resize:none;border:0;outline:0;background:transparent;padding:10px 9px;font:400 13px/1.45 var(--nm-plus-sans,Arial,sans-serif);color:#44373e}
      .nm-ask-compose textarea::placeholder{color:#a3959b}.nm-ask-send{width:42px;height:42px;border:0;border-radius:50%;background:linear-gradient(135deg,#75435f,#674058);color:#fff;font-size:18px;box-shadow:0 7px 18px rgba(117,67,95,.17);transition:transform .16s ease,opacity .16s ease}.nm-ask-send:active{transform:scale(.94)}.nm-ask-send:disabled{opacity:.42}
      .nm-ask-disclaimer{padding:8px 4px 0;text-align:center;font:400 9.5px/1.45 var(--nm-plus-sans,Arial,sans-serif);color:#9a8d92}
      @keyframes nmAskIn{to{opacity:1;transform:translateY(0)}}
      @keyframes nmAskDot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}
      @keyframes nmAskBreath{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.07);opacity:1}}
      @media(prefers-reduced-motion:reduce){.nm-ask-entry::after,.nm-ask-message,.nm-ask-thinking b{animation:none!important}.nm-ask-message{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function readSession() {
    try {
      const rows = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
      return Array.isArray(rows) ? rows.slice(-16) : [];
    } catch (_) { return []; }
  }

  function saveSession(rows) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(rows.slice(-16))); } catch (_) {}
  }

  function collectContext() {
    const safe = (key) => {
      try {
        const rows = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(rows) ? rows[0] || null : null;
      } catch (_) { return null; }
    };
    const checkin = safe('nurturemom_plus_checkins');
    const movement = safe('nurturemom_plus_movement');
    return {
      date: new Date().toISOString().slice(0,10),
      recentCheckin: checkin ? {
        date: checkin.date, sleep: checkin.sleep, meals: checkin.meals, water: checkin.water,
        discomfort: checkin.discomfort, energy: checkin.energy, supported: checkin.supported,
        mood: checkin.mood, notes: checkin.notes || ''
      } : null,
      recentMovement: movement ? {
        date: movement.date, minutes: movement.minutes, steps: movement.steps, goal: movement.goal
      } : null
    };
  }

  function ensureEntry() {
    const hub = byId('nmPlusHub');
    if (!hub || byId(ENTRY_ID)) return;
    const card = document.createElement('section');
    card.id = ENTRY_ID;
    card.className = 'nm-ask-entry';
    card.innerHTML = `
      <div class="nm-ask-kicker">Ask NurtureMom · Plus</div>
      <h2>What’s on your mind?</h2>
      <p>Ask about recovery, feeding, sleep, emotions, baby care, your Village, routines — or simply what today feels like.</p>
      <button type="button" data-open-ask>Ask NurtureMom&nbsp; ♡</button>
      <div class="nm-ask-note">Private to your Mom account. Nothing is shared with your Village unless you choose it.</div>`;
    const account = byId('nmPlusAccountCard');
    if (account) account.insertAdjacentElement('afterend', card);
    else $('.nm-plus-head', hub)?.insertAdjacentElement('afterend', card);
    $('[data-open-ask]', card)?.addEventListener('click', openChat);
  }

  function buildChat() {
    if (byId(ID)) return;
    const overlay = document.createElement('div');
    overlay.id = ID;
    overlay.className = 'nm-plus-overlay';
    overlay.innerHTML = `<div class="nm-plus-sheet nm-ask-sheet">
      <div class="nm-plus-head"><div><div class="nm-plus-kicker">NurtureMom Plus · private companion</div><div class="nm-plus-title">Ask NurtureMom <em style="font-weight:500">♡</em></div><div class="nm-plus-sub">You don’t have to know the perfect question. Start wherever you are.</div></div><button class="nm-plus-close" type="button" aria-label="Close">×</button></div>
      <div class="nm-ask-status"><i></i><span>Here for support, reflection and practical guidance — not a replacement for medical care.</span></div>
      <div class="nm-ask-messages" id="nmAskMessages"></div>
      <div class="nm-ask-chips" id="nmAskChips">
        <button class="nm-ask-chip">I’m exhausted — what can my Village take off my plate?</button>
        <button class="nm-ask-chip">What can I do for myself today?</button>
        <button class="nm-ask-chip">Help me think through feeding and sleep.</button>
        <button class="nm-ask-chip">I have a recovery question.</button>
      </div>
      <label class="nm-ask-context"><input id="nmAskUseContext" type="checkbox" checked><span><strong>Use my NurtureMom context</strong>Include your recent Plus check-in and movement so the answer can feel more personal. You can turn this off anytime.</span></label>
      <div class="nm-ask-compose"><textarea id="nmAskInput" maxlength="1800" rows="1" placeholder="Ask anything that’s on your mind…"></textarea><button id="nmAskSend" class="nm-ask-send" type="button" aria-label="Send">↑</button></div>
      <div class="nm-ask-disclaimer">NurtureMom may make mistakes. For urgent or serious health concerns, contact a healthcare professional or emergency services.</div>
    </div>`;
    document.body.appendChild(overlay);

    const close = () => { overlay.classList.remove('open'); if (!$('.nm-plus-overlay.open')) document.body.style.overflow = ''; };
    $('.nm-plus-close', overlay)?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    byId('nmAskSend')?.addEventListener('click', sendCurrent);
    const input = byId('nmAskInput');
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCurrent(); }
    });
    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(118, input.scrollHeight) + 'px';
    });
    [...document.querySelectorAll('#nmAskChips .nm-ask-chip')].forEach((chip) => chip.addEventListener('click', () => {
      input.value = chip.textContent.trim();
      input.dispatchEvent(new Event('input'));
      input.focus();
    }));
    renderConversation();
  }

  function renderConversation() {
    const box = byId('nmAskMessages');
    if (!box) return;
    const rows = readSession();
    box.innerHTML = '';
    if (!rows.length) {
      appendMessage('assistant', 'I’m here with you. Ask me anything — practical, emotional, about recovery, your baby, or how to make today a little lighter.', false);
      return;
    }
    rows.forEach((row) => appendMessage(row.role, row.text, false));
    box.scrollTop = box.scrollHeight;
  }

  function appendMessage(role, text, persist = true) {
    const box = byId('nmAskMessages');
    if (!box) return;
    const row = document.createElement('div');
    row.className = `nm-ask-message ${role}`;
    row.innerHTML = `<div class="nm-ask-bubble">${escapeHtml(text)}</div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    if (persist) {
      const rows = readSession();
      rows.push({ role, text, at: new Date().toISOString() });
      saveSession(rows);
    }
  }

  function showThinking() {
    const box = byId('nmAskMessages');
    if (!box || byId('nmAskThinking')) return;
    const row = document.createElement('div');
    row.id = 'nmAskThinking';
    row.className = 'nm-ask-message assistant nm-ask-thinking';
    row.innerHTML = '<div class="nm-ask-bubble"><b></b><b></b><b></b></div>';
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function hideThinking() { byId('nmAskThinking')?.remove(); }

  async function sendCurrent() {
    const input = byId('nmAskInput');
    const send = byId('nmAskSend');
    const question = input?.value.trim();
    if (!question || send?.disabled) return;

    const s = state();
    if (!s.ready) {
      appendMessage('assistant', 'Your Plus account is still connecting. Give it a moment, then ask me again.');
      return;
    }
    if (!s.signedIn || !s.entitled) {
      appendMessage('assistant', 'Connect your Plus Mom account first so this conversation stays private to you.');
      document.querySelector('#nmPlusAccountCard [data-account-action="connect"]')?.click();
      return;
    }

    appendMessage('user', question);
    input.value = '';
    input.style.height = 'auto';
    send.disabled = true;
    showThinking();

    try {
      const { data } = await window.nmPlusSupabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Your secure session needs to reconnect.');
      const rows = readSession().slice(-10).map(({ role, text }) => ({ role, text }));
      const useContext = byId('nmAskUseContext')?.checked === true;
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question, history: rows, context: useContext ? collectContext() : null })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'NurtureMom could not answer just yet.');
      hideThinking();
      appendMessage('assistant', payload.answer || 'I’m here. Try asking that another way.');
    } catch (e) {
      hideThinking();
      appendMessage('assistant', e?.message || 'I couldn’t answer just then. Your conversation is still here — please try again.');
    } finally {
      send.disabled = false;
      input?.focus();
    }
  }

  function openChat() {
    buildChat();
    const overlay = byId(ID);
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderConversation();
    setTimeout(() => byId('nmAskInput')?.focus(), 180);
  }

  function install() {
    installStyles();
    buildChat();
    let tries = 0;
    const attach = () => {
      tries += 1;
      ensureEntry();
      if (!byId(ENTRY_ID) && tries < 120) setTimeout(attach, 100);
    };
    attach();
    window.addEventListener('nurturemom:plus-state', ensureEntry);
    window.NurtureMomAsk = { open: openChat };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();