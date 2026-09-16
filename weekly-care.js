(() => {
  const byId = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function installStyles() {
    if (byId('nmWeeklyCareStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmWeeklyCareStyles';
    style.textContent = `
      .nm-care-letter{position:relative;overflow:hidden;background:linear-gradient(155deg,#fffaf8,#f7ebe7);border:1px solid #ead8d2;border-radius:20px;padding:18px;box-shadow:0 8px 24px rgba(78,46,57,.07)}
      .nm-care-letter:after{content:'♡';position:absolute;right:12px;top:-18px;font:700 76px Georgia,serif;color:#8c4f6820;pointer-events:none}
      .nm-care-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--wine)}
      .nm-care-letter h3{margin:7px 0 9px;font:700 22px Georgia,serif}
      .nm-care-letter p{margin:8px 0;line-height:1.55;color:#59464d}
      .nm-care-celebrate{margin:13px 0;padding:12px 13px;border-radius:14px;background:#fff;border:1px solid #eadbd6}
      .nm-care-celebrate b{display:block;color:var(--wine);margin-bottom:4px}
      .nm-care-gentle{margin-top:13px;padding:12px 13px;border-radius:14px;background:#f4e5e3}
      .nm-care-milestone{font-size:12px;color:var(--muted);margin-top:10px}
      .nm-care-actions{display:grid;gap:8px;margin-top:14px}
    `;
    document.head.appendChild(style);
  }

  function ensureCard() {
    const premium = byId('premiumView');
    if (!premium || byId('nmWeeklyCareCard')) return;
    const card = document.createElement('section');
    card.className = 'nm-plus-card';
    card.id = 'nmWeeklyCareCard';
    card.innerHTML = `
      <div class="nm-care-letter">
        <div class="nm-care-kicker">NurtureMom Plus · Just for you</div>
        <h3>A little look at your week ♡</h3>
        <div id="nmWeeklyCareBody" class="nm-plus-muted">Your weekly care letter will grow with each check-in.</div>
      </div>`;
    const history = byId('nmHistory')?.closest('.nm-plus-card');
    if (history) premium.insertBefore(card, history);
    else premium.appendChild(card);
  }

  function avg(rows, key) {
    const vals = rows.map((r) => Number(r?.[key])).filter(Number.isFinite);
    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
  }

  function recentSeven(rows) {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return (rows || []).filter((r) => {
      const d = new Date(`${r.date || r.day || ''}T12:00:00`);
      return Number.isFinite(d.getTime()) && d >= cutoff && d <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59);
    }).sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  function previousSeven(rows) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23,59,59);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
    return (rows || []).filter((r) => {
      const d = new Date(`${r.date || r.day || ''}T12:00:00`);
      return Number.isFinite(d.getTime()) && d >= start && d <= end;
    });
  }

  function firstName(profile) {
    const raw = (profile?.display_name || profile?.name || '').trim();
    return raw ? raw.split(/\s+/)[0] : 'Mom';
  }

  function postpartumMilestone(profile) {
    const raw = profile?.birthDate || profile?.birth_date;
    if (!raw) return '';
    const birth = new Date(`${raw}T12:00:00`);
    const today = new Date();
    if (!Number.isFinite(birth.getTime()) || birth > today) return '';
    const days = Math.floor((new Date(today.getFullYear(),today.getMonth(),today.getDate()) - new Date(birth.getFullYear(),birth.getMonth(),birth.getDate())) / 86400000) + 1;
    if (days <= 1) return 'Today begins a brand-new chapter for you and your little one.';
    if (days < 14) return `You are ${days} days into this new chapter. Tiny steps still count.`;
    if (days < 84) return `You are in week ${Math.floor((days - 1) / 7) + 1} with your little one. Your wellbeing still deserves attention, too.`;
    const months = Math.max(1, Math.floor(days / 30.44));
    return `About ${months} month${months === 1 ? '' : 's'} with your little one — and you still deserve care, rest, and support.`;
  }

  function chooseSupport(week) {
    const sleep = avg(week, 'sleep');
    const meals = avg(week, 'meals');
    const supported = avg(week, 'supported');
    const energy = avg(week, 'energy');
    const hardDays = week.filter(r => r.mood === 'Need support today').length;
    if (hardDays || (supported !== null && supported <= 2.5)) return {category:'Check-In', title:'Please check in with me this week', note:'A call, visit, or simple message would mean a lot.'};
    if ((sleep !== null && sleep < 5) || (energy !== null && energy <= 2.5)) return {category:'Rest', title:'Help me protect some rest time', note:'Could you help take one thing off my plate so I can rest?'};
    if (meals !== null && meals < 2.3) return {category:'Meal', title:'Could someone help with a meal?', note:'A meal or easy food drop-off would make this week gentler.'};
    return {category:'House Help', title:'Could someone take one small task off my plate?', note:'Laundry, dishes, groceries, or another small task would help me save some energy.'};
  }

  function openSupportRequest(s) {
    const modal = byId('nmRequestModal');
    if (!modal) return;
    if (byId('nmRequestTitle')) byId('nmRequestTitle').value = s.title;
    if (byId('nmRequestCategory')) byId('nmRequestCategory').value = s.category;
    if (byId('nmRequestNotes')) byId('nmRequestNotes').value = s.note;
    const d = new Date();
    if (byId('nmRequestDate')) byId('nmRequestDate').value = d.toISOString().slice(0,10);
    d.setHours(d.getHours() + 1);
    if (byId('nmRequestTime')) byId('nmRequestTime').value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    modal.classList.add('open');
  }

  function buildLetter(profile, allRows) {
    const week = recentSeven(allRows);
    const prior = previousSeven(allRows);
    const name = firstName(profile);
    const milestone = postpartumMilestone(profile);

    if (!week.length) {
      return {
        html: `<p><b>${esc(name)}, this space is for you too.</b></p><p>When you are ready, check in once. We will use those little moments to help you notice how you are doing and make it easier to ask for support.</p>${milestone ? `<div class="nm-care-milestone">${esc(milestone)}</div>` : ''}`,
        support: null
      };
    }

    if (week.length === 1) {
      return {
        html: `<p><b>${esc(name)}, thank you for making a little space for yourself.</b></p><p>One check-in may seem small, but noticing how <em>you</em> are doing matters. Keep checking in when it feels helpful — not to be perfect, just to be cared for.</p><div class="nm-care-celebrate"><b>Something worth celebrating</b>You paused long enough to notice yourself today. That counts.</div>${milestone ? `<div class="nm-care-milestone">${esc(milestone)}</div>` : ''}`,
        support: chooseSupport(week)
      };
    }

    const sleep = avg(week,'sleep'), priorSleep = avg(prior,'sleep');
    const support = avg(week,'supported'), priorSupport = avg(prior,'supported');
    const hard = week.filter(r => r.mood === 'Need support today').length;
    const help = week.filter(r => r.mood === 'Could use some help').length;
    const okay = week.filter(r => r.mood === 'Doing okay').length;
    const notes = [];

    if (sleep !== null && priorSleep !== null && sleep >= priorSleep + .5) notes.push('You made a little more room for rest than the week before.');
    else if (sleep !== null && sleep < 5) notes.push('Rest has been hard to come by this week, and that can make everything feel heavier.');

    if (support !== null && priorSupport !== null && support < priorSupport - .6) notes.push('You have been feeling less supported lately. You should not have to carry every task yourself.');
    else if (support !== null && support >= 4) notes.push('You have felt well-supported on several of your check-ins, and that support matters.');

    if (hard >= 2) notes.push('A few days felt especially heavy. You deserve care on those days, not pressure to push through them.');
    else if (okay >= Math.ceil(week.length * .7)) notes.push('There were several steadier moments this week. It is okay to notice those wins too.');
    else if (help >= 2) notes.push('You noticed more than once that a little help would make things easier. That awareness is valuable.');

    if (!notes.length) notes.push('Your week had its own rhythm — some easier moments and some that asked more of you.');

    const streak = week.length;
    const celebration = streak >= 5
      ? `You checked in ${streak} times this week. Not because everything had to be perfect — because you kept making space to notice yourself.`
      : `You checked in ${streak} times this week. Every one of those moments says your wellbeing belongs in the picture too.`;

    return {
      html: `<p><b>${esc(name)}, here is what we noticed with you this week.</b></p><p>${esc(notes.join(' '))}</p><div class="nm-care-celebrate"><b>Something worth celebrating ♡</b>${esc(celebration)}</div><div class="nm-care-gentle"><b>One gentle thought</b><br>You do not need to wait until you are completely overwhelmed before letting someone help.</div>${milestone ? `<div class="nm-care-milestone">${esc(milestone)}</div>` : ''}`,
      support: chooseSupport(week)
    };
  }

  async function loadWeeklyCare() {
    ensureCard();
    const body = byId('nmWeeklyCareBody');
    if (!body || !window.nmSupabase) return;
    const {data:{session}} = await window.nmSupabase.auth.getSession();
    if (!session) {
      body.innerHTML = '<p>Sign in when you are ready. Your care letter will stay private to you.</p>';
      return;
    }
    const {data, error} = await window.nmSupabase.rpc('nm_load', {v: session.user.id});
    if (error) {
      body.innerHTML = '<p>We could not prepare your care letter just yet. Your saved check-ins are still safe.</p>';
      return;
    }
    const state = data?.state || data || {};
    const result = buildLetter(state.profile || {}, state.recovery || []);
    body.innerHTML = result.html;
    if (result.support) {
      const actions = document.createElement('div');
      actions.className = 'nm-care-actions';
      const button = document.createElement('button');
      button.className = 'btn primary';
      button.textContent = 'Let my Village help ♡';
      button.addEventListener('click', () => openSupportRequest(result.support));
      actions.appendChild(button);
      body.appendChild(actions);
    }
  }

  function install() {
    installStyles();
    let tries = 0;
    const wait = () => {
      tries += 1;
      if (!byId('premiumView')) {
        if (tries < 80) return setTimeout(wait, 100);
        return;
      }
      ensureCard();
      loadWeeklyCare();

      const recoveryBtn = [...document.querySelectorAll('.bottom .nav')].find((b) => b.textContent.includes('Recovery'));
      if (recoveryBtn && !recoveryBtn.dataset.weeklyCareBound) {
        recoveryBtn.dataset.weeklyCareBound = '1';
        recoveryBtn.addEventListener('click', () => setTimeout(loadWeeklyCare, 80));
      }

      window.addEventListener('nurturemom:weekly-care-refresh', loadWeeklyCare);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && byId('premiumView')?.classList.contains('show')) loadWeeklyCare(); });
    };
    wait();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
