(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const byId = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const CHECKINS = 'nurturemom_plus_checkins';
  const MOVEMENT = 'nurturemom_plus_movement';
  const MOM_MOMENTS = 'nurturemom_plus_mom_moments';
  const GOAL = 'nurturemom_plus_movement_goal';

  function installStyles() {
    if (byId('nmPlusStyles')) return;
    const style = document.createElement('style');
    style.id = 'nmPlusStyles';
    style.textContent = `
      .nm-plus-overlay{position:fixed;inset:0;background:#2f22298a;display:none;align-items:flex-end;justify-content:center;z-index:1000;padding-top:24px}.nm-plus-overlay.open{display:flex}
      .nm-plus-sheet{width:min(520px,100%);max-height:94vh;overflow:auto;background:#fffdf9;border-radius:26px 26px 0 0;padding:18px 18px calc(26px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px #2d1c2430}
      .nm-plus-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.nm-plus-kicker{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#9a805c}.nm-plus-title{font:700 29px/1.1 Georgia,serif;color:#54304a;margin:5px 0}.nm-plus-sub{font-size:13px;line-height:1.5;color:#81767a}.nm-plus-close{border:1px solid #e4d9d4;background:#fff;border-radius:50%;width:38px;height:38px;font-size:20px;color:#69435d}
      .nm-plus-card{border:1px solid #e8ded9;background:#fff;border-radius:18px;padding:15px;margin-top:11px;box-shadow:0 4px 16px #462d3608}.nm-plus-card h3{font:700 19px Georgia,serif;color:#4f3047;margin:0 0 5px}.nm-plus-card p{font-size:13px;line-height:1.48;color:#81767a;margin:0}.nm-plus-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.nm-plus-go{border:0;background:#75435f;color:#fff;border-radius:12px;padding:10px 13px;font-weight:800}.nm-plus-secondary{border:1px solid #d9cbd0;background:#fffaf8;color:#69435d;border-radius:12px;padding:10px 13px;font-weight:800}
      .nm-plus-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.nm-plus-field{border:1px solid #e6dcd7;background:#fffaf8;border-radius:14px;padding:10px}.nm-plus-field label{display:block;font-size:12px;font-weight:800;color:#5c4d53;margin:0 0 6px}.nm-plus-field input,.nm-plus-field select,.nm-plus-notes{width:100%;border:1px solid #ddd2cd;border-radius:10px;background:#fff;padding:10px;font:inherit;color:#44373e}.nm-plus-notes{min-height:82px;margin-top:10px}.nm-plus-actions{display:flex;gap:9px;margin-top:13px}.nm-plus-actions>*{flex:1}.nm-plus-progress{height:10px;background:#efe6e1;border-radius:999px;overflow:hidden;margin:12px 0 6px}.nm-plus-progress i{display:block;height:100%;background:#75435f;border-radius:inherit}.nm-plus-celebrate{margin-top:12px;background:linear-gradient(135deg,#f8ebe6,#fffaf7);border:1px solid #ead8d2;border-radius:16px;padding:14px;line-height:1.5;color:#5d4b52}.nm-plus-celebrate b{display:block;color:#69435d;margin-bottom:4px}.nm-plus-small{font-size:11px;line-height:1.45;color:#8a7f83;margin-top:9px}.nm-plus-metric{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.nm-plus-metric div{background:#fbf5f2;border:1px solid #eadfda;border-radius:13px;padding:10px;text-align:center}.nm-plus-metric b{display:block;font-size:18px;color:#69435d}.nm-plus-metric span{font-size:10px;color:#8a7f83}.nm-plus-support{margin-top:12px;padding:13px;border-radius:15px;background:#f6efec}.nm-plus-support b{color:#69435d}.nm-plus-toast{position:fixed;left:50%;bottom:98px;transform:translateX(-50%) translateY(16px);background:#4f3048;color:#fff;padding:11px 15px;border-radius:999px;opacity:0;z-index:1200;transition:.2s;pointer-events:none;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis}.nm-plus-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      @media(max-width:390px){.nm-plus-grid{grid-template-columns:1fr}.nm-plus-title{font-size:26px}}
    `;
    document.head.appendChild(style);
  }

  function shell(id, title, sub, body) {
    const el = document.createElement('div');
    el.className = 'nm-plus-overlay';
    el.id = id;
    el.innerHTML = `<div class="nm-plus-sheet"><div class="nm-plus-head"><div><div class="nm-plus-kicker">NurtureMom Plus · just for you</div><div class="nm-plus-title">${title}</div><div class="nm-plus-sub">${sub}</div></div><button class="nm-plus-close" type="button" aria-label="Close">×</button></div>${body}</div>`;
    el.addEventListener('click', (e) => { if (e.target === el) close(el); });
    $('.nm-plus-close', el).addEventListener('click', () => close(el));
    document.body.appendChild(el);
    return el;
  }
  const open = (el) => { el?.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = (el) => { el?.classList.remove('open'); if (!$('.nm-plus-overlay.open')) document.body.style.overflow = ''; };
  function toast(msg) { const t = byId('nmPlusToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600); }

  function latestCheckin() { return read(CHECKINS, [])[0] || null; }
  function latestMovement() { return read(MOVEMENT, [])[0] || null; }

  function buildHub() {
    const hub = shell('nmPlusHub', 'Your Plus space', 'Extra care without changing the NurtureMom experience you already know.', `
      <div class="nm-plus-card"><div class="nm-plus-row"><div><h3>♡ Daily Mom Check-In</h3><p>30 seconds to notice sleep, hydration, energy, comfort and how supported you feel.</p></div><button class="nm-plus-go" data-plus="checkin">Open</button></div></div>
      <div class="nm-plus-card"><div class="nm-plus-row"><div><h3>🚶 Gentle movement</h3><p>Track walks or other gentle movement, set your own goal and celebrate progress without pressure.</p></div><button class="nm-plus-go" data-plus="movement">Open</button></div></div>
      <div class="nm-plus-card"><div class="nm-plus-row"><div><h3>♡ A little something for Mom</h3><p>Small moments that celebrate you — not just what you got done.</p></div><button class="nm-plus-go" data-plus="mom">Open</button></div></div>
      <div class="nm-plus-card"><div class="nm-plus-row"><div><h3>▣ My weekly care letter</h3><p>A private look at your week, the wins worth noticing, and where support could make things gentler.</p></div><button class="nm-plus-go" data-plus="week">Open</button></div></div>
      <div class="nm-plus-card"><div class="nm-plus-row"><div><h3>♧ Let my Village help</h3><p>Turn what you shared into one simple request. Nothing is shared unless you choose it.</p></div><button class="nm-plus-go" data-plus="support">Open</button></div></div>
      <div class="nm-plus-small">Plus is private by default. These tools are for support and tracking, not diagnosis or emergency care.</div>`);
    $$('[data-plus]', hub).forEach(btn => btn.addEventListener('click', () => {
      close(hub);
      ({ checkin: openCheckin, movement: openMovement, mom: openMom, week: openWeek, support: openSupport }[btn.dataset.plus])?.();
    }));
  }

  function buildCheckin() {
    const el = shell('nmPlusCheckin', 'Daily Mom Check-In', 'A gentle snapshot of how today feels.', `
      <div class="nm-plus-grid">
        <div class="nm-plus-field"><label>Sleep last 24h</label><input id="nmSleep" type="number" min="0" max="24" step="0.5" value="6"></div>
        <div class="nm-plus-field"><label>Meals today</label><input id="nmMeals" type="number" min="0" max="10" value="2"></div>
        <div class="nm-plus-field"><label>Water / drinks</label><input id="nmWater" type="number" min="0" max="30" value="5"></div>
        <div class="nm-plus-field"><label>Discomfort 0–10</label><input id="nmDiscomfort" type="number" min="0" max="10" value="2"></div>
        <div class="nm-plus-field"><label>Energy 1–5</label><input id="nmEnergy" type="number" min="1" max="5" value="3"></div>
        <div class="nm-plus-field"><label>Feeling supported 1–5</label><input id="nmSupported" type="number" min="1" max="5" value="3"></div>
      </div>
      <div class="nm-plus-field" style="margin-top:10px"><label>Overall, how are you feeling?</label><select id="nmMood"><option>Doing okay</option><option>Could use some help</option><option>Need support today</option></select></div>
      <textarea id="nmCheckinNotes" class="nm-plus-notes" maxlength="1200" placeholder="Anything you want to remember about today? Optional."></textarea>
      <div class="nm-plus-actions"><button class="nm-plus-secondary" data-back>Back</button><button class="nm-plus-go" data-save>Save check-in</button></div>
      <div class="nm-plus-small">If something feels severe, urgent, or concerning, contact your healthcare professional or emergency services.</div>`);
    $('[data-back]', el).addEventListener('click', () => { close(el); openHub(); });
    $('[data-save]', el).addEventListener('click', saveCheckin);
  }

  function saveCheckin() {
    const x = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: todayISO(),
      sleep: Number(byId('nmSleep').value), meals: Number(byId('nmMeals').value), water: Number(byId('nmWater').value),
      discomfort: Number(byId('nmDiscomfort').value), energy: Number(byId('nmEnergy').value), supported: Number(byId('nmSupported').value),
      mood: byId('nmMood').value, notes: byId('nmCheckinNotes').value.trim(), created_at: new Date().toISOString()
    };
    if (![x.sleep,x.meals,x.water,x.discomfort,x.energy,x.supported].every(Number.isFinite) || x.sleep < 0 || x.sleep > 24 || x.meals < 0 || x.water < 0 || x.discomfort < 0 || x.discomfort > 10 || x.energy < 1 || x.energy > 5 || x.supported < 1 || x.supported > 5) return toast('Please check the numbers you entered.');
    const rows = read(CHECKINS, []).filter(r => r.date !== x.date); rows.unshift(x); write(CHECKINS, rows.slice(0, 90));
    close(byId('nmPlusCheckin')); toast('You made space for yourself today ♡'); openMom();
  }

  function buildMovement() {
    const el = shell('nmPlusMovement', 'Gentle movement', 'Walking and movement can be celebrated without turning recovery into a competition.', `
      <div class="nm-plus-grid"><div class="nm-plus-field"><label>Minutes today</label><input id="nmMoveMinutes" type="number" min="1" max="300" placeholder="e.g. 12"></div><div class="nm-plus-field"><label>Steps · optional</label><input id="nmMoveSteps" type="number" min="0" max="100000" placeholder="e.g. 1800"></div></div>
      <div class="nm-plus-field" style="margin-top:10px"><label>My gentle goal · minutes</label><input id="nmMoveGoal" type="number" min="1" max="180" value="10"></div>
      <div id="nmMoveProgress"></div>
      <div class="nm-plus-actions"><button class="nm-plus-secondary" data-back>Back</button><button class="nm-plus-go" data-save>Celebrate today’s movement</button></div>
      <div class="nm-plus-small">Use movement goals that feel right for your recovery and follow your clinician’s guidance after delivery or complications.</div>`);
    $('[data-back]', el).addEventListener('click', () => { close(el); openHub(); });
    $('[data-save]', el).addEventListener('click', saveMovement);
  }

  function renderMovement() {
    const box = byId('nmMoveProgress'); if (!box) return;
    const last = latestMovement(); const goal = Number(localStorage.getItem(GOAL) || 10); byId('nmMoveGoal').value = goal;
    if (!last || last.date !== todayISO()) { box.innerHTML = '<div class="nm-plus-small">No movement logged today yet. Small steps still count.</div>'; return; }
    const pct = Math.min(100, Math.round((last.minutes / Math.max(1,last.goal || goal)) * 100));
    box.innerHTML = `<div class="nm-plus-progress"><i style="width:${pct}%"></i></div><div class="nm-plus-sub">${last.minutes} minutes${last.steps != null ? ` · ${last.steps.toLocaleString()} steps` : ''} · ${pct}% of your gentle goal</div>`;
  }

  function saveMovement() {
    const minutes = Number(byId('nmMoveMinutes').value), raw = byId('nmMoveSteps').value, steps = raw === '' ? null : Number(raw), goal = Number(byId('nmMoveGoal').value);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 300 || !Number.isFinite(goal) || goal < 1 || goal > 180 || (steps !== null && (!Number.isFinite(steps) || steps < 0 || steps > 100000))) return toast('Please check your movement details.');
    localStorage.setItem(GOAL, String(goal)); const item = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: todayISO(), minutes, steps, goal, created_at:new Date().toISOString() };
    const rows = read(MOVEMENT, []).filter(r => r.date !== item.date); rows.unshift(item); write(MOVEMENT, rows.slice(0, 120)); renderMovement(); toast(minutes >= goal ? 'You reached your gentle goal — that deserves celebrating ♡' : 'Movement logged. Small steps still count ♡');
  }

  const momIdeas = [
    ['A quiet ten minutes', 'Choose ten minutes that belong only to you — tea, music, a shower, fresh air, or simply doing nothing.'],
    ['Celebrate something tiny', 'Name one thing you did for yourself today. It does not have to be productive to count.'],
    ['Ask for one thing', 'Pick one task someone else can carry today. Receiving help is part of recovery too.'],
    ['Step outside', 'If it feels right for your recovery, take a few gentle minutes outside and let that be enough.'],
    ['No-guilt rest', 'Protect one short pocket of rest without trying to earn it first.']
  ];
  function todayMomIdea() { const day = Math.floor(Date.now()/86400000); return momIdeas[day % momIdeas.length]; }
  function buildMom() {
    const el = shell('nmPlusMom', 'A little something for Mom ♡', 'Not another task. Just a small moment that says you matter too.', `<div id="nmMomBody"></div><div class="nm-plus-actions"><button class="nm-plus-secondary" data-back>Back</button><button class="nm-plus-go" data-claim>Make this mine</button></div>`);
    $('[data-back]', el).addEventListener('click', () => { close(el); openHub(); });
    $('[data-claim]', el).addEventListener('click', () => { const [title,text] = todayMomIdea(); const rows = read(MOM_MOMENTS, []); if (!rows.some(r=>r.date===todayISO())) rows.unshift({date:todayISO(),title,text}); write(MOM_MOMENTS, rows.slice(0,90)); toast('This little moment is yours ♡'); renderMom(); });
  }
  function renderMom() {
    const body = byId('nmMomBody'); if (!body) return; const [title,text] = todayMomIdea(); const claimed = read(MOM_MOMENTS, []).some(r=>r.date===todayISO());
    const checkin = latestCheckin(), move = latestMovement(); let celebration = 'Showing up for yourself counts, even on an ordinary day.';
    if (checkin?.date===todayISO()) celebration = 'You checked in with yourself today. That pause matters.';
    if (move?.date===todayISO()) celebration = move.minutes >= (move.goal||10) ? 'You reached the gentle movement goal you chose for yourself.' : 'You made room for gentle movement today — every bit can count.';
    body.innerHTML = `<div class="nm-plus-celebrate"><b>Something worth celebrating</b>${celebration}</div><div class="nm-plus-card"><h3>${title}</h3><p>${text}</p></div>${claimed?'<div class="nm-plus-small">✓ You chose this moment for yourself today.</div>':''}`;
  }

  function recent(days, rows) { const cutoff = Date.now() - (days-1)*86400000; return rows.filter(r => new Date(`${r.date}T12:00:00`).getTime() >= cutoff); }
  function avg(rows, k){ const v=rows.map(r=>Number(r[k])).filter(Number.isFinite); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
  function buildWeek() {
    const el = shell('nmPlusWeek', 'A little look at your week', 'A private care letter from the moments you chose to notice yourself.', `<div id="nmWeekBody"></div><div class="nm-plus-actions"><button class="nm-plus-secondary" data-back>Back</button><button class="nm-plus-go" data-support>Let my Village help</button></div>`);
    $('[data-back]', el).addEventListener('click', () => { close(el); openHub(); });
    $('[data-support]', el).addEventListener('click', () => { close(el); openSupport(); });
  }
  function renderWeek() {
    const body=byId('nmWeekBody'); if(!body)return; const week=recent(7,read(CHECKINS,[])), moves=recent(7,read(MOVEMENT,[]));
    if(!week.length && !moves.length){body.innerHTML='<div class="nm-plus-celebrate"><b>This space will grow with you.</b>Start with one check-in or one gentle movement entry. There is nothing to catch up on.</div>';return;}
    const sleep=avg(week,'sleep'), energy=avg(week,'energy'), support=avg(week,'supported'), totalMove=moves.reduce((a,r)=>a+(Number(r.minutes)||0),0);
    let note='Your week had its own rhythm. The goal is not perfect tracking — it is noticing what helps you feel more cared for.';
    if(sleep!==null&&sleep<5) note='Rest has been hard to come by. That is a good reason to let your Village take something off your plate.';
    else if(support!==null&&support<=2.5) note='You have been feeling less supported. You do not have to wait until you are overwhelmed to ask for help.';
    else if(energy!==null&&energy>=4) note='There were some steadier-energy moments this week. Those wins are worth noticing too.';
    const moments = recent(7,read(MOM_MOMENTS,[])).length;
    body.innerHTML=`<div class="nm-plus-metric"><div><b>${week.length}</b><span>check-ins</span></div><div><b>${totalMove}</b><span>movement min</span></div><div><b>${moments}</b><span>mom moments</span></div></div><div class="nm-plus-celebrate"><b>What we noticed with you</b>${note}</div><div class="nm-plus-small">This summary is supportive reflection, not medical interpretation.</div>`;
  }

  function supportSuggestion() {
    const x=latestCheckin(); if(!x) return {cat:'House Help',title:'Could someone take one small task off my plate?',note:'Laundry, dishes, groceries, or another small task would help me save some energy.'};
    if(x.mood==='Need support today'||x.supported<=2) return {cat:'Baby Help',title:'I could use a check-in today',note:'A call, visit, or little practical help would mean a lot today.'};
    if(x.sleep<5||x.energy<=2) return {cat:'Rest',title:'Help me protect a little rest time',note:'Could someone take one thing off my plate so I can rest?'};
    if(x.meals<2) return {cat:'Meal',title:'Could someone help with a meal?',note:'A meal or easy food drop-off would make today gentler.'};
    if(x.water<4) return {cat:'Errand',title:'Could someone help with groceries or drinks?',note:'A quick grocery or drink drop-off would help today.'};
    return {cat:'House Help',title:'Could someone take one small task off my plate?',note:'A small task handled by my Village would give me a little breathing room.'};
  }
  function buildSupport() {
    const el=shell('nmPlusSupport','Let my Village help','One simple request, based on what would make today lighter.',`<div id="nmSupportBody"></div><div class="nm-plus-actions"><button class="nm-plus-secondary" data-back>Back</button><button class="nm-plus-go" data-request>Use this request</button></div>`);
    $('[data-back]',el).addEventListener('click',()=>{close(el);openHub();}); $('[data-request]',el).addEventListener('click',useSupportRequest);
  }
  function renderSupport(){const b=byId('nmSupportBody');if(!b)return;const s=supportSuggestion();b.innerHTML=`<div class="nm-plus-support"><b>${s.title}</b><div class="nm-plus-sub" style="margin-top:5px">${s.note}</div><div class="nm-plus-small">Suggested category: ${s.cat}</div></div>`;}
  function useSupportRequest(){const s=supportSuggestion();close(byId('nmPlusSupport'));const nav=$('.nav button[data-screen="requests"]');nav?.click();const chip=$$('.request-chip').find(b=>b.textContent.trim().includes(s.cat));chip?.click();const box=$('.request-box');if(box)box.value=`${s.title}\n\n${s.note}`;setTimeout(()=>box?.focus(),80);toast('Your request is ready — review it before sending.');}

  function openHub(){open(byId('nmPlusHub'));}
  function openCheckin(){open(byId('nmPlusCheckin'));}
  function openMovement(){renderMovement();open(byId('nmPlusMovement'));}
  function openMom(){renderMom();open(byId('nmPlusMom'));}
  function openWeek(){renderWeek();open(byId('nmPlusWeek'));}
  function openSupport(){renderSupport();open(byId('nmPlusSupport'));}

  function bindApprovedUX() {
    const mySpace = $$('.strip span').find(x => x.textContent.trim() === 'My space');
    mySpace?.addEventListener('click', openHub);
    mySpace?.setAttribute('role','button'); mySpace?.setAttribute('tabindex','0'); mySpace?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openHub();});
    $('.avatar')?.addEventListener('click', openHub);
    const daily = $('.moment .cta'); daily?.addEventListener('click', openCheckin);
  }

  function install() {
    installStyles();
    buildHub(); buildCheckin(); buildMovement(); buildMom(); buildWeek(); buildSupport();
    const toastEl=document.createElement('div');toastEl.id='nmPlusToast';toastEl.className='nm-plus-toast';document.body.appendChild(toastEl);
    bindApprovedUX();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();