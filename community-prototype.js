(() => {
  'use strict';

  const STATE_KEY = 'nurturemom.v1';
  const PREF_KEY = 'nurturemom.community.preferences.v1';
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

  function getState() {
    return readJSON(STATE_KEY, {}) || {};
  }

  async function plusActive() {
    try {
      const api = window.NurtureMomPlusAccess;
      if (!api || typeof api.get !== 'function') return false;
      const access = await api.get();
      return !!(access && access.has_access);
    } catch (_) {
      return false;
    }
  }

  function plusContainer() {
    if (decodeURIComponent(location.hash.slice(1)) !== 'Plus') return null;
    const hero = document.querySelector('.plus-hero');
    return hero?.parentElement || null;
  }

  function postpartumDays(profile) {
    const raw = profile?.birthDate || profile?.birth_date;
    if (!raw) return null;
    const birth = new Date(`${raw}T12:00:00`);
    if (!Number.isFinite(birth.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    return Math.max(0, Math.floor((today - birth) / 86400000));
  }

  function stageForProfile(profile) {
    const days = postpartumDays(profile);
    if (days === null) return { key: 'choose', label: 'Choose my stage' };
    if (days <= 42) return { key: '0-6w', label: '0–6 weeks postpartum' };
    if (days <= 84) return { key: '7-12w', label: '7–12 weeks postpartum' };
    if (days <= 182) return { key: '3-6m', label: '3–6 months postpartum' };
    if (days <= 365) return { key: '6-12m', label: '6–12 months postpartum' };
    return { key: '1y+', label: '1 year+ into motherhood' };
  }

  function installStyles() {
    if (document.getElementById('nmCircleStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmCircleStyles';
    style.textContent = `
      .nm-circle-card{margin:18px 0;padding:18px;border:1px solid #dedfcf;border-radius:20px;background:linear-gradient(145deg,#fbfbf4,#f2f3e7);box-shadow:0 8px 26px rgba(62,67,46,.06)}
      .nm-circle-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.08em;color:#69704e}
      .nm-circle-card h2{margin:0 0 8px;font:700 23px Georgia,serif;color:#49343d}
      .nm-circle-card p{margin:0;color:#66535b;line-height:1.55}
      .nm-circle-btn{margin-top:14px;border:0;border-radius:13px;padding:11px 14px;font-weight:800;cursor:pointer;background:#69704e;color:#fff}
      .nm-circle-fine{margin-top:10px!important;font-size:11px;color:#8a747d!important}
      .nm-circle-modal{position:fixed;inset:0;z-index:1100;display:none;align-items:flex-end;justify-content:center;background:rgba(45,30,36,.52)}
      .nm-circle-modal.open{display:flex}
      .nm-circle-sheet{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fffaf7;border-radius:26px 26px 0 0;padding:22px 20px 30px;box-shadow:0 -18px 50px rgba(45,30,36,.16)}
      .nm-circle-sheet h2{font:700 27px Georgia,serif;margin:6px 0 8px;color:#49343d}
      .nm-circle-intro{color:#66535b;line-height:1.55;margin:0 0 18px}
      .nm-circle-step{margin:18px 0}
      .nm-circle-step h3{font:700 16px Georgia,serif;color:#49343d;margin:0 0 9px}
      .nm-circle-options{display:grid;gap:9px}
      .nm-circle-option{display:block;border:1px solid #decfd0;border-radius:15px;padding:12px;background:#fff;cursor:pointer}
      .nm-circle-option input{margin-right:9px}
      .nm-circle-stage{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #dedfcf;border-radius:14px;padding:12px;background:#fbfbf4}
      .nm-circle-stage strong{color:#49343d}
      .nm-circle-select{width:100%;margin-top:9px;border:1px solid #decfd0;border-radius:12px;padding:11px;background:#fff;color:#49343d}
      .nm-circle-actions{display:flex;gap:9px;margin-top:18px}
      .nm-circle-actions button{flex:1;border-radius:13px;padding:12px;font-weight:800;cursor:pointer}
      .nm-circle-cancel{background:#fff;border:1px solid #d9c8c6;color:#75435f}
      .nm-circle-find{background:#69704e;border:1px solid #69704e;color:#fff}
      .nm-circle-result{margin-top:18px;padding:16px;border-radius:18px;background:#f4eee9;border:1px solid #e7d7cf}
      .nm-circle-result h3{font:700 20px Georgia,serif;color:#49343d;margin:0 0 6px}
      .nm-circle-tags{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .nm-circle-tag{padding:5px 9px;border-radius:999px;background:#fff;color:#69704e;font-size:11px;font-weight:800;border:1px solid #dedfcf}
      .nm-circle-safety{font-size:11px;color:#8a747d;line-height:1.45;margin-top:12px}
      .nm-community-nav svg{stroke:currentColor}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let modal = document.getElementById('nmFindCircleModal');
    if (modal) return modal;
    const suggested = stageForProfile(getState().profile || {});
    modal = document.createElement('div');
    modal.id = 'nmFindCircleModal';
    modal.className = 'nm-circle-modal';
    modal.innerHTML = `
      <section class="nm-circle-sheet" role="dialog" aria-modal="true" aria-labelledby="nmCircleTitle">
        <p class="nm-circle-kicker">NURTUREMOM COMMUNITY · PLUS PREVIEW</p>
        <h2 id="nmCircleTitle">Find My Circle ♡</h2>
        <p class="nm-circle-intro">Find a small circle of moms who can relate to this season—or mothers a little further ahead who choose to share what helped them.</p>

        <div class="nm-circle-step">
          <h3>Who would feel helpful right now?</h3>
          <div class="nm-circle-options">
            <label class="nm-circle-option"><input type="radio" name="nmCircleMode" value="same" checked> Moms in my season — “you’re living this too”</label>
            <label class="nm-circle-option"><input type="radio" name="nmCircleMode" value="mentor"> Moms who’ve been here — gentle experience, not medical advice</label>
            <label class="nm-circle-option"><input type="radio" name="nmCircleMode" value="both"> A thoughtful mix of both</label>
          </div>
        </div>

        <div class="nm-circle-step">
          <h3>Your motherhood stage</h3>
          <div class="nm-circle-stage">
            <span>Suggested privately from your profile</span>
            <strong id="nmCircleStageLabel">${esc(suggested.label)}</strong>
          </div>
          <select id="nmCircleStage" class="nm-circle-select" aria-label="Motherhood stage">
            <option value="0-6w">0–6 weeks postpartum</option>
            <option value="7-12w">7–12 weeks postpartum</option>
            <option value="3-6m">3–6 months postpartum</option>
            <option value="6-12m">6–12 months postpartum</option>
            <option value="1y+">1 year+ into motherhood</option>
          </select>
          <p class="nm-circle-safety">Your exact baby birth date is not shown to other moms. Only the broad stage you choose would be used for matching.</p>
        </div>

        <div class="nm-circle-step">
          <h3>What would you like your circle to understand?</h3>
          <div class="nm-circle-options">
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="feeding"> Feeding / nursing / pumping</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="recovery"> Postpartum recovery</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="sleep"> Tired nights & sleep changes</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="identity"> Finding myself again</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="walking"> Gentle walks / getting outside</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="working"> Returning to work / working moms</label>
            <label class="nm-circle-option"><input type="checkbox" name="nmCircleTopic" value="village"> Little or no nearby family support</label>
          </div>
        </div>

        <div id="nmCircleResult"></div>
        <div class="nm-circle-actions">
          <button type="button" class="nm-circle-cancel">Not now</button>
          <button type="button" class="nm-circle-find">Show my circle</button>
        </div>
        <p class="nm-circle-safety">Preview only: no real members are being matched yet. A production community would require verified adult accounts, mutual consent for private messaging, block/report controls, moderation, and no automatic sharing of Recovery, Companion, Village, or exact-location data.</p>
      </section>`;
    document.body.appendChild(modal);

    const stageSelect = modal.querySelector('#nmCircleStage');
    if (suggested.key !== 'choose') stageSelect.value = suggested.key;

    modal.querySelector('.nm-circle-cancel').addEventListener('click', closeCircle);
    modal.querySelector('.nm-circle-find').addEventListener('click', showPrototypeMatch);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeCircle(); });
    return modal;
  }

  function openCircle() {
    const modal = ensureModal();
    modal.classList.add('open');
  }

  function closeCircle() {
    document.getElementById('nmFindCircleModal')?.classList.remove('open');
  }

  const topicNames = {
    feeding: 'Feeding support',
    recovery: 'Recovery',
    sleep: 'Tired nights',
    identity: 'Finding myself again',
    walking: 'Gentle walks',
    working: 'Working moms',
    village: 'Small village'
  };

  const stageNames = {
    '0-6w': '0–6 weeks',
    '7-12w': '7–12 weeks',
    '3-6m': '3–6 months',
    '6-12m': '6–12 months',
    '1y+': '1 year+'
  };

  function circleCopy(mode, stage) {
    if (mode === 'mentor') return {
      title: 'Moms Who Remember This Season',
      body: `A small circle led by mothers who are beyond the ${stageNames[stage] || 'early'} stage and have opted in to offer encouragement from experience.`
    };
    if (mode === 'both') return {
      title: 'Beside Me + Ahead of Me',
      body: `A calm mix of moms near your ${stageNames[stage] || ''} stage and a few experienced mothers who remember what this season felt like.`
    };
    return {
      title: 'Right Here With Me',
      body: `A small circle centered on moms around the ${stageNames[stage] || ''} stage, for the comfort of hearing “me too” without having to explain everything.`
    };
  }

  function showPrototypeMatch() {
    const modal = ensureModal();
    const mode = modal.querySelector('input[name="nmCircleMode"]:checked')?.value || 'same';
    const stage = modal.querySelector('#nmCircleStage')?.value || '0-6w';
    const topics = [...modal.querySelectorAll('input[name="nmCircleTopic"]:checked')].map((el) => el.value);
    const copy = circleCopy(mode, stage);
    const tags = topics.length ? topics.slice(0, 4) : ['recovery', 'sleep', 'identity'];
    localStorage.setItem(PREF_KEY, JSON.stringify({ mode, stage, topics, savedAt: new Date().toISOString() }));

    const result = modal.querySelector('#nmCircleResult');
    result.innerHTML = `
      <div class="nm-circle-result">
        <p class="nm-circle-kicker">YOUR COMMUNITY PREVIEW</p>
        <h3>${esc(copy.title)}</h3>
        <p>${esc(copy.body)}</p>
        <div class="nm-circle-tags">${tags.map((t) => `<span class="nm-circle-tag">${esc(topicNames[t] || t)}</span>`).join('')}</div>
        <p class="nm-circle-safety">In the live version, this is where verified members and mutual-consent connection requests would appear. For now, this preview lets us test the feeling and matching choices before we build the community backend.</p>
      </div>`;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function replaceText(node, from, to) {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() === from) {
        child.textContent = child.textContent.replace(from, to);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        replaceText(child, from, to);
      }
    }
  }

  async function injectCommunityNav() {
    if (!(await plusActive())) {
      document.querySelectorAll('.nm-community-nav').forEach((el) => el.remove());
      return;
    }
    const schedules = [...document.querySelectorAll('button,a')].filter((el) => el.textContent.trim() === 'Schedule');
    for (const schedule of schedules) {
      const parent = schedule.parentElement;
      if (!parent) continue;
      const labels = [...parent.querySelectorAll('button,a')].map((el) => el.textContent.trim());
      if (!labels.includes('Home') || !labels.includes('Recovery')) continue;
      if (parent.querySelector('.nm-community-nav')) continue;
      const item = schedule.cloneNode(true);
      item.classList.add('nm-community-nav');
      item.removeAttribute('href');
      item.setAttribute('type', 'button');
      item.setAttribute('aria-label', 'Community');
      replaceText(item, 'Schedule', 'Community');
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCircle();
      });
      schedule.insertAdjacentElement('afterend', item);
    }
  }

  async function injectCard() {
    if (!(await plusActive())) {
      document.getElementById('nmFindCircleCard')?.remove();
      closeCircle();
      return;
    }
    const container = plusContainer();
    if (!container || document.getElementById('nmFindCircleCard')) return;
    const card = document.createElement('section');
    card.id = 'nmFindCircleCard';
    card.className = 'nm-circle-card';
    card.innerHTML = `
      <p class="nm-circle-kicker">MOM-TO-MOM COMMUNITY · PLUS PREVIEW</p>
      <h2>Find My Circle</h2>
      <p>Meet mothers close to your season for that “me too” feeling, or connect with moms a little further ahead who choose to share encouragement from experience.</p>
      <button type="button" class="nm-circle-btn">Explore my circle</button>
      <p class="nm-circle-fine">Small circles, broad motherhood stages, mutual consent, and Mom controls what she shares.</p>`;
    const grid = container.querySelector('.plus-grid');
    if (grid) container.insertBefore(card, grid);
    else container.appendChild(card);
    card.querySelector('.nm-circle-btn').addEventListener('click', openCircle);
  }

  function render() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => { injectCard().catch(() => {}); injectCommunityNav().catch(() => {}); }, 90);
  }

  function boot() {
    installStyles();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-nm-plus'] });
    window.addEventListener('hashchange', render);
    window.addEventListener('nurturemom:session-changed', render);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();