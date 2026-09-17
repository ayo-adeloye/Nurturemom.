(function () {
  'use strict';

  const API = 'https://ocorbzbkzfdmurolngdf.supabase.co/functions/v1/nm-ai-companion';
  const STORE = 'nurturemom_private_companion_v1';
  const MAX_LOCAL_MESSAGES = 12;
  const urgentPattern = /\b(kill myself|suicide|suicidal|hurt myself|harm myself|hurt my baby|harm my baby|can't breathe|cannot breathe|chest pain|heavy bleeding|soaking (a |one )?pad|seizure|passed out|fainted|emergency)\b/i;
  let messages = loadMessages();

  function loadMessages() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '[]');
      return Array.isArray(saved) ? saved.slice(-MAX_LOCAL_MESSAGES) : [];
    } catch (_) { return []; }
  }

  function saveMessages() {
    localStorage.setItem(STORE, JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES)));
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nm-ai-card{margin-top:22px;background:linear-gradient(145deg,#f6e9e7,#fffaf7);border:1px solid #eadbd8;border-radius:20px;padding:20px}
      .nm-ai-card h2{font:25px Georgia,serif;color:#513048;margin:0 0 8px}.nm-ai-card p{color:#817478;line-height:1.5;margin:0 0 16px}.nm-ai-open{width:100%;border:0;border-radius:14px;background:#75435f;color:#fff;padding:15px;font-weight:800}
      .nm-ai-modal{position:fixed;inset:0;background:#2d1e2488;display:none;align-items:flex-end;justify-content:center;z-index:50}.nm-ai-modal.open{display:flex}
      .nm-ai-sheet{width:min(520px,100%);height:min(88vh,760px);background:#fffdf9;border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden}
      .nm-ai-head{padding:18px 18px 14px;border-bottom:1px solid #eadfd9;display:flex;align-items:center;justify-content:space-between}.nm-ai-head h2{font:24px Georgia,serif;color:#54304a;margin:0}.nm-ai-head small{display:block;color:#8b7e81;margin-top:3px}.nm-ai-close{border:0;background:#f2e8e3;color:#6f425c;border-radius:50%;width:38px;height:38px;font-size:20px}
      .nm-ai-notice{padding:10px 16px;background:#f7f1ec;color:#776b6f;font-size:12px;line-height:1.4}.nm-ai-log{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}.nm-ai-empty{text-align:center;color:#8b7e81;padding:30px 18px;line-height:1.55}
      .nm-ai-msg{max-width:86%;padding:12px 14px;border-radius:16px;line-height:1.5;white-space:pre-wrap}.nm-ai-user{align-self:flex-end;background:#75435f;color:white;border-bottom-right-radius:5px}.nm-ai-bot{align-self:flex-start;background:#f3e8e5;color:#403438;border-bottom-left-radius:5px}.nm-ai-urgent{background:#fff0ee;border:1px solid #df9b92;color:#7d2f2c}
      .nm-ai-form{border-top:1px solid #eadfd9;padding:12px;display:grid;grid-template-columns:1fr auto;gap:9px;background:#fff}.nm-ai-input{min-height:48px;max-height:120px;resize:none;border:1px solid #dccdca;border-radius:14px;padding:12px}.nm-ai-send{border:0;border-radius:13px;background:#75435f;color:white;padding:0 17px;font-weight:800}.nm-ai-send:disabled{opacity:.55}.nm-ai-clear{border:0;background:none;color:#80546d;font-size:12px;padding:8px 16px;text-align:left}
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const recovery = document.querySelector('#recoveryView .screen-pad');
    if (recovery && !document.getElementById('nmAiCard')) {
      const card = document.createElement('section');
      card.id = 'nmAiCard'; card.className = 'nm-ai-card';
      card.innerHTML = '<h2>Ask NurtureMom ♡</h2><p>A private, judgment-free companion for the moments you need reassurance, ideas, or a gentle next step.</p><button class="nm-ai-open" type="button">Open my private companion</button>';
      recovery.appendChild(card);
      card.querySelector('button').addEventListener('click', openCompanion);
    }
    const modal = document.createElement('div');
    modal.id = 'nmAiModal'; modal.className = 'nm-ai-modal';
    modal.innerHTML = `<section class="nm-ai-sheet" role="dialog" aria-modal="true" aria-labelledby="nmAiTitle">
      <header class="nm-ai-head"><div><h2 id="nmAiTitle">Ask NurtureMom ♡</h2><small>Your private companion</small></div><button class="nm-ai-close" aria-label="Close">×</button></header>
      <div class="nm-ai-notice">Supportive guidance—not medical diagnosis or emergency care. Your chat stays on this device and is never shared with your Village automatically.</div>
      <div id="nmAiLog" class="nm-ai-log" aria-live="polite"></div>
      <button id="nmAiClear" class="nm-ai-clear" type="button">Clear this private conversation</button>
      <form id="nmAiForm" class="nm-ai-form"><textarea id="nmAiInput" class="nm-ai-input" maxlength="1200" placeholder="Tell me what’s on your mind…" aria-label="Message NurtureMom"></textarea><button id="nmAiSend" class="nm-ai-send" type="submit">Send</button></form>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelector('.nm-ai-close').addEventListener('click', closeCompanion);
    modal.addEventListener('click', e => { if (e.target === modal) closeCompanion(); });
    document.getElementById('nmAiForm').addEventListener('submit', sendMessage);
    document.getElementById('nmAiClear').addEventListener('click', () => { messages = []; saveMessages(); render(); });
    document.getElementById('nmAiInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('nmAiForm').requestSubmit(); } });
    render();
  }

  async function hasPlusAccess() {
    if (!window.nmSupabase) return false;
    try {
      const { data, error } = await window.nmSupabase.rpc('nm_plus_access');
      if (error) return false;
      if (typeof data === 'boolean') return data;
      if (Array.isArray(data)) return !!data[0]?.has_access || !!data[0]?.allowed;
      return !!data?.has_access || !!data?.allowed || data?.plan === 'plus' || data?.founder === true;
    } catch (_) { return false; }
  }

  async function openCompanion() {
    const token = typeof window.authToken === 'function' ? window.authToken() : localStorage.getItem('nurturemom_access_token');
    if (!token) { if (typeof window.openSettings === 'function') window.openSettings(); alert('Sign in to use your private NurtureMom companion.'); return; }
    const allowed = await hasPlusAccess();
    if (!allowed) { alert('Ask NurtureMom is included with NurtureMom Plus.'); return; }
    document.getElementById('nmAiModal').classList.add('open');
    render();
    setTimeout(() => document.getElementById('nmAiInput').focus(), 50);
  }

  function closeCompanion() { document.getElementById('nmAiModal')?.classList.remove('open'); }

  function render(loading) {
    const log = document.getElementById('nmAiLog'); if (!log) return;
    if (!messages.length && !loading) log.innerHTML = '<div class="nm-ai-empty">You can say anything here—how today feels, what you need, or what you are unsure about. I’m here with you.</div>';
    else log.innerHTML = messages.map(m => `<div class="nm-ai-msg ${m.role === 'user' ? 'nm-ai-user' : 'nm-ai-bot'}">${esc(m.content)}</div>`).join('') + (loading ? '<div class="nm-ai-msg nm-ai-bot">Thinking with you…</div>' : '');
    log.scrollTop = log.scrollHeight;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('nmAiInput'), send = document.getElementById('nmAiSend');
    const text = input.value.trim(); if (!text || send.disabled) return;
    messages.push({ role: 'user', content: text }); messages = messages.slice(-MAX_LOCAL_MESSAGES); saveMessages(); input.value = ''; render(true); send.disabled = true;
    if (urgentPattern.test(text)) {
      messages.push({ role: 'assistant', content: 'I’m really glad you told me. Please call 911 now if you or your baby may be in immediate danger. In the U.S., you can also call or text 988 for crisis support. For urgent postpartum symptoms, contact your maternity care team or go to the nearest emergency department. If you can, ask someone you trust to stay with you right now.' });
      saveMessages(); render(false); send.disabled = false; return;
    }
    try {
      const token = typeof window.authToken === 'function' ? window.authToken() : localStorage.getItem('nurturemom_access_token');
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ messages: messages.slice(-10), context: getContext() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'companion_unavailable');
      messages.push({ role: 'assistant', content: data.reply }); messages = messages.slice(-MAX_LOCAL_MESSAGES); saveMessages();
    } catch (_) {
      messages.push({ role: 'assistant', content: 'I’m here, but I couldn’t respond just now. Please try again in a moment. If something feels urgent or unsafe, contact your care team or emergency services now.' }); saveMessages();
    } finally { render(false); send.disabled = false; input.focus(); }
  }

  function getContext() {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('nurturemom_profile') || '{}'); } catch (_) {}
    return { display_name: document.getElementById('homeName')?.textContent || profile.display_name || '', recent_checkin: localStorage.getItem('nurturemom_last_checkin') || '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
  }

  injectStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI, { once: true }); else injectUI();
})();
