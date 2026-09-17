(() => {
  const KEY = 'nurturemom_plus_feedback';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function readRows() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
  }

  function installStyles() {
    if ($('#nmPlusLabStyles')) return;
    const s = document.createElement('style');
    s.id = 'nmPlusLabStyles';
    s.textContent = `
      .nm-plus-lab-card{background:linear-gradient(145deg,#fffaf7,#f8efeb);border:1px solid #eadbd5}
      .nm-plus-lab-card .nm-plus-lab-kicker{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9a805c;margin-bottom:5px}
      .nm-plus-lab-note{font-size:11px;line-height:1.45;color:#8a7f83;margin-top:7px}
      .nm-plus-lab-choices{display:grid;gap:8px;margin-top:12px}
      .nm-plus-lab-choice{border:1px solid #dfd2ce;background:#fff;border-radius:13px;padding:11px 12px;text-align:left;color:#5a4650;font:inherit}
      .nm-plus-lab-choice.selected{border-color:#7a4965;background:#f8eff3;color:#633b57;box-shadow:0 0 0 1px #7a49651a inset}
      .nm-plus-lab-field{margin-top:11px}
      .nm-plus-lab-field label{display:block;font-size:12px;font-weight:800;color:#5c4d53;margin-bottom:6px}
      .nm-plus-lab-field select,.nm-plus-lab-field textarea{width:100%;border:1px solid #ddd2cd;border-radius:12px;background:#fff;padding:11px;font:inherit;color:#44373e;box-sizing:border-box}
      .nm-plus-lab-field textarea{min-height:78px;resize:vertical}
    `;
    document.head.appendChild(s);
  }

  function makeOverlay() {
    if ($('#nmPlusLab')) return $('#nmPlusLab');
    const el = document.createElement('div');
    el.id = 'nmPlusLab';
    el.className = 'nm-plus-overlay';
    el.innerHTML = `<div class="nm-plus-sheet">
      <div class="nm-plus-head">
        <div>
          <div class="nm-plus-kicker">NurtureMom Plus · shaped with moms</div>
          <div class="nm-plus-title">Help us make care feel lighter</div>
          <div class="nm-plus-sub">A few seconds of feedback helps us keep Plus thoughtful, calm and genuinely useful.</div>
        </div>
        <button class="nm-plus-close" type="button" aria-label="Close">×</button>
      </div>

      <div class="nm-plus-card">
        <h3>How did this feel today?</h3>
        <p>There is no right answer. We want to learn what actually helps.</p>
        <div class="nm-plus-lab-choices" role="group" aria-label="How Plus felt today">
          <button class="nm-plus-lab-choice" type="button" data-feeling="made_today_lighter">♡ It made today feel lighter</button>
          <button class="nm-plus-lab-choice" type="button" data-feeling="helpful_but_easier">Helpful, but it could be easier</button>
          <button class="nm-plus-lab-choice" type="button" data-feeling="not_what_i_needed">Not what I needed today</button>
        </div>
      </div>

      <div class="nm-plus-lab-field">
        <label for="nmLabFeature">What were you thinking about?</label>
        <select id="nmLabFeature">
          <option value="overall">Plus overall</option>
          <option value="daily_checkin">Daily Mom Check-In</option>
          <option value="movement">Gentle movement</option>
          <option value="mom_moment">A little something for Mom</option>
          <option value="weekly_letter">Weekly care letter</option>
          <option value="village_help">Let my Village help</option>
        </select>
      </div>

      <div class="nm-plus-lab-field">
        <label for="nmLabImprove">What would make this feel more helpful?</label>
        <textarea id="nmLabImprove" maxlength="1200" placeholder="Optional — tell us in your own words."></textarea>
      </div>

      <div class="nm-plus-lab-field">
        <label for="nmLabNotice">What do you wish NurtureMom would notice for you automatically?</label>
        <textarea id="nmLabNotice" maxlength="1200" placeholder="Optional — something you wish you didn't have to remember or ask for."></textarea>
      </div>

      <div class="nm-plus-actions">
        <button class="nm-plus-secondary" type="button" data-lab-back>Back</button>
        <button class="nm-plus-go" type="button" data-lab-save>Share feedback</button>
      </div>
      <div class="nm-plus-small">Feedback is optional. Nothing is shared with your Village.</div>
    </div>`;
    document.body.appendChild(el);

    const close = () => {
      el.classList.remove('open');
      if (!$('.nm-plus-overlay.open')) document.body.style.overflow = '';
    };
    el.addEventListener('click', e => { if (e.target === el) close(); });
    $('.nm-plus-close', el).addEventListener('click', close);
    $('[data-lab-back]', el).addEventListener('click', () => {
      close();
      const hub = $('#nmPlusHub');
      if (hub) { hub.classList.add('open'); document.body.style.overflow = 'hidden'; }
    });
    $$('[data-feeling]', el).forEach(btn => btn.addEventListener('click', () => {
      $$('[data-feeling]', el).forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
    }));
    $('[data-lab-save]', el).addEventListener('click', async () => {
      const selected = $('[data-feeling].selected', el);
      if (!selected) {
        if (window.nmPlusToast) window.nmPlusToast('Choose the response that feels closest.');
        else alert('Choose the response that feels closest.');
        return;
      }
      const payload = {
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        date: todayISO(),
        feeling: selected.dataset.feeling,
        feature: $('#nmLabFeature', el).value,
        improve: $('#nmLabImprove', el).value.trim(),
        notice: $('#nmLabNotice', el).value.trim(),
        created_at: new Date().toISOString(),
        source: 'plus_lab'
      };
      const rows = readRows();
      rows.unshift(payload);
      localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 100)));
      let cloud = false;
      try {
        if (typeof window.nmPlusCloudSave === 'function') cloud = await window.nmPlusCloudSave('feedback', payload);
      } catch (_) {}
      close();
      const hub = $('#nmPlusHub');
      if (hub) { hub.classList.add('open'); document.body.style.overflow = 'hidden'; }
      const msg = cloud === false ? 'Thank you ♡ Your feedback is saved on this device.' : 'Thank you ♡ You’re helping us make NurtureMom gentler.';
      const toast = $('#nmPlusToast');
      if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
      $('#nmLabImprove', el).value = '';
      $('#nmLabNotice', el).value = '';
      $$('[data-feeling]', el).forEach(x => x.classList.remove('selected'));
    });
    return el;
  }

  function addCard() {
    const hub = $('#nmPlusHub .nm-plus-sheet');
    if (!hub || $('#nmPlusLabCard', hub)) return !!hub;
    const card = document.createElement('div');
    card.id = 'nmPlusLabCard';
    card.className = 'nm-plus-card nm-plus-lab-card';
    card.innerHTML = `<div class="nm-plus-lab-kicker">Plus Lab · optional</div>
      <div class="nm-plus-row">
        <div><h3>♡ Help shape NurtureMom</h3><p>Tell us what made today lighter, what felt like extra work, or what you wish NurtureMom noticed automatically.</p><div class="nm-plus-lab-note">A tiny note from you can shape what we build next.</div></div>
        <button class="nm-plus-go" type="button" data-open-lab>Share</button>
      </div>`;
    const footer = [...hub.children].find(x => x.classList?.contains('nm-plus-small'));
    hub.insertBefore(card, footer || null);
    $('[data-open-lab]', card).addEventListener('click', () => {
      const hubOverlay = $('#nmPlusHub');
      if (hubOverlay) hubOverlay.classList.remove('open');
      const lab = makeOverlay();
      lab.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    return true;
  }

  function init() {
    installStyles();
    makeOverlay();
    if (addCard()) return;
    const obs = new MutationObserver(() => {
      if (addCard()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();