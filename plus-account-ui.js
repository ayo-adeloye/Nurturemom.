(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const byId = (id) => document.getElementById(id);

  function installStyles() {
    if (byId('nmPlusAccountStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmPlusAccountStyles';
    style.textContent = `
      .nm-plus-account{border:1px solid #e8ded9;background:#fffaf8;border-radius:16px;padding:13px 14px;margin:0 0 12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
      .nm-plus-account strong{display:block;color:#54304a;font:700 16px Georgia,serif;margin-bottom:3px}.nm-plus-account span{display:block;color:#81767a;font-size:11px;line-height:1.4}
      .nm-plus-account button{border:1px solid #d9cbd0;background:#fff;color:#69435d;border-radius:11px;padding:9px 11px;font-weight:800;font-size:12px}
      .nm-founder-pill{display:inline-flex!important;width:max-content;margin-bottom:4px;padding:4px 7px;border-radius:999px;background:#f3e4df;color:#75435f!important;font-weight:800;font-size:10px!important;letter-spacing:.05em;text-transform:uppercase}
      .nm-plus-login-status{margin-top:10px;font-size:12px;line-height:1.45;color:#81767a}.nm-plus-login-status.warn{color:#945b18}
    `;
    document.head.appendChild(style);
  }

  function state() {
    return window.nmPlusGetState?.() || window.NURTUREMOM_PLUS_STATE || { preview: true, ready: false };
  }

  function ensureCard() {
    const hub = byId('nmPlusHub');
    if (!hub || byId('nmPlusAccountCard')) return;
    const head = $('.nm-plus-head', hub);
    if (!head) return;
    const card = document.createElement('div');
    card.id = 'nmPlusAccountCard';
    card.className = 'nm-plus-account';
    head.insertAdjacentElement('afterend', card);
    renderCard();
  }

  function renderCard() {
    const card = byId('nmPlusAccountCard');
    if (!card) return;
    const s = state();
    if (!s.ready) {
      card.innerHTML = `<div><strong>Checking your Plus access…</strong><span>Your approved NurtureMom screen stays unchanged.</span></div>`;
      return;
    }
    if (s.signedIn && s.founderAccess) {
      card.innerHTML = `<div><span class="nm-founder-pill">Founder access</span><strong>Plus is fully unlocked</strong><span>${escapeHtml(s.email)}${s.syncing ? ' · syncing…' : s.lastSyncAt ? ' · cloud sync on' : ''}</span></div><button type="button" data-account-action="signout">Sign out</button>`;
    } else if (s.signedIn && s.entitled) {
      card.innerHTML = `<div><strong>Plus is unlocked</strong><span>${escapeHtml(s.email)}${s.syncing ? ' · syncing…' : s.lastSyncAt ? ' · cloud sync on' : ''}</span></div><button type="button" data-account-action="signout">Sign out</button>`;
    } else if (s.signedIn && s.preview) {
      card.innerHTML = `<div><strong>Plus preview mode</strong><span>${escapeHtml(s.email)} · this account is not marked Plus yet.</span></div><button type="button" data-account-action="signout">Sign out</button>`;
    } else {
      card.innerHTML = `<div><strong>${s.preview ? 'Plus preview is open' : 'Connect your Mom account'}</strong><span>${s.preview ? 'Connect your account to verify Founder/Plus access and sync your entries.' : 'Sign in with your NurtureMom account to continue.'}</span></div><button type="button" data-account-action="connect">Connect</button>`;
    }
    const btn = $('[data-account-action]', card);
    if (btn?.dataset.accountAction === 'connect') btn.addEventListener('click', openLogin);
    if (btn?.dataset.accountAction === 'signout') btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await window.nmPlusSignOut?.(); } finally { renderCard(); }
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function buildLogin() {
    if (byId('nmPlusLogin')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nmPlusLogin';
    overlay.className = 'nm-plus-overlay';
    overlay.innerHTML = `<div class="nm-plus-sheet">
      <div class="nm-plus-head"><div><div class="nm-plus-kicker">NurtureMom Plus</div><div class="nm-plus-title">Connect your Mom account</div><div class="nm-plus-sub">Use the same email and password you use for NurtureMom. This does not change the approved app screen.</div></div><button class="nm-plus-close" type="button" aria-label="Close">×</button></div>
      <div class="nm-plus-field"><label>Email</label><input id="nmPlusLoginEmail" type="email" autocomplete="email" placeholder="you@example.com"></div>
      <div class="nm-plus-field" style="margin-top:10px"><label>Password</label><input id="nmPlusLoginPassword" type="password" autocomplete="current-password" placeholder="Your NurtureMom password"></div>
      <div class="nm-plus-actions"><button class="nm-plus-secondary" type="button" data-cancel>Cancel</button><button class="nm-plus-go" type="button" data-login>Connect account</button></div>
      <div id="nmPlusLoginStatus" class="nm-plus-login-status">Your Plus activity will sync privately to your account after you connect.</div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
    $('.nm-plus-close', overlay).addEventListener('click', close);
    $('[data-cancel]', overlay).addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    $('[data-login]', overlay).addEventListener('click', async () => {
      const email = byId('nmPlusLoginEmail').value.trim();
      const password = byId('nmPlusLoginPassword').value;
      const status = byId('nmPlusLoginStatus');
      if (!email || !password) {
        status.textContent = 'Enter your NurtureMom email and password.';
        status.className = 'nm-plus-login-status warn';
        return;
      }
      status.textContent = 'Connecting your account…';
      status.className = 'nm-plus-login-status';
      try {
        const result = await window.nmPlusSignIn(email, password);
        if (result?.founderAccess) status.textContent = 'Founder access confirmed. Plus is fully unlocked.';
        else if (result?.entitled) status.textContent = 'Plus access confirmed.';
        else status.textContent = result?.preview ? 'Account connected. Plus remains available in preview mode.' : 'This account does not currently include Plus.';
        renderCard();
        setTimeout(close, 650);
      } catch (e) {
        status.textContent = e?.message || 'We could not connect that account. Please check your login and try again.';
        status.className = 'nm-plus-login-status warn';
      }
    });
  }

  function openLogin() {
    buildLogin();
    const overlay = byId('nmPlusLogin');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => byId('nmPlusLoginEmail')?.focus(), 80);
  }

  function install() {
    installStyles();
    buildLogin();
    let tries = 0;
    const attach = () => {
      tries += 1;
      ensureCard();
      if (!byId('nmPlusAccountCard') && tries < 80) setTimeout(attach, 100);
    };
    attach();
    window.addEventListener('nurturemom:plus-state', () => {
      ensureCard();
      renderCard();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();