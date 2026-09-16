(() => {
  const byId = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const timePlus = (minutes) => {
    const d = new Date(Date.now() + minutes * 60000);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  function installStyles(){
    if (byId('nmPremiumStyles')) return;
    const style=document.createElement('style');
    style.id='nmPremiumStyles';
    style.textContent=`
      .nm-plus-view{display:none;padding:14px}.nm-plus-view.show{display:block}
      .nm-plus-hero{padding:18px;border-radius:20px;background:linear-gradient(135deg,#7b3f59,#a16f7d);color:white;box-shadow:0 12px 30px rgba(79,50,58,.18)}
      .nm-plus-badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#ffffff26;border:1px solid #ffffff55;font-size:11px;font-weight:800;letter-spacing:.02em}
      .nm-plus-hero h2{margin:10px 0 6px;font:700 26px Georgia,serif}.nm-plus-hero p{margin:0;line-height:1.45;color:#fff8}
      .nm-plus-card{margin-top:14px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 4px 14px rgba(59,37,44,.05)}
      .nm-plus-card h3{margin:0 0 6px;font:700 19px Georgia,serif}.nm-plus-muted{font-size:13px;color:var(--muted);line-height:1.45}
      .nm-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nm-metric{background:#fffaf8;border:1px solid var(--line);border-radius:14px;padding:11px}
      .nm-metric b{display:block;font-size:13px;margin-bottom:6px}.nm-metric input,.nm-metric select{width:100%;padding:10px;border:1px solid #ddcfca;border-radius:10px;background:white}
      .nm-support-list{display:grid;gap:10px;margin-top:12px}.nm-support-option{width:100%;text-align:left;border:1px solid var(--line);background:#fffaf8;border-radius:14px;padding:13px;cursor:pointer}.nm-support-option b{display:block;color:var(--wine);margin-bottom:3px}
      .nm-insight{padding:12px;border-radius:13px;background:linear-gradient(135deg,#f8e9e4,#f3e4df);margin-top:10px;line-height:1.45}
      .nm-history-row{padding:11px 0;border-bottom:1px solid var(--line)}.nm-history-row:last-child{border-bottom:0}
      .nm-danger-note{margin-top:10px;padding:12px;border-radius:12px;background:#fff3e8;color:#7f4b1f;font-size:12px;line-height:1.45}
      .nm-sheet{width:min(520px,100%);max-height:92vh;overflow:auto;background:var(--paper);border-radius:24px 24px 0 0;padding:20px 18px 28px}
      .nm-modal{position:fixed;inset:0;background:#2d1e2480;display:none;align-items:flex-end;justify-content:center;z-index:35}.nm-modal.open{display:flex}
      .nm-score-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.nm-score-row output{font-weight:800;color:var(--wine);min-width:26px;text-align:center}
    `;
    document.head.appendChild(style);
  }

  function createView(){
    if (byId('premiumView')) return;
    const app=document.querySelector('.app');
    const nav=document.querySelector('.bottom');
    const view=document.createElement('main');
    view.id='premiumView';
    view.className='nm-plus-view';
    view.innerHTML=`
      <section class="nm-plus-hero">
        <span class="nm-plus-badge">NurtureMom Plus · Preview</span>
        <h2>How are you today?</h2>
        <p>A quick postpartum check-in, followed by practical help your Village can actually provide.</p>
      </section>
      <section class="nm-plus-card">
        <h3>♡ Daily Mom Check-In</h3>
        <div class="nm-plus-muted">About 30 seconds. Your answers stay private unless you choose to ask your Village for help.</div>
        <button class="btn primary" style="width:100%;margin-top:12px" onclick="window.openMomCheckIn()">Check in now</button>
      </section>
      <section class="nm-plus-card" id="nmSupportCard" style="display:none">
        <h3>How can your Village help today?</h3>
        <div class="nm-plus-muted" id="nmSupportIntro"></div>
        <div class="nm-support-list" id="nmSupportList"></div>
      </section>
      <section class="nm-plus-card">
        <h3>Your recent check-ins</h3>
        <div class="nm-plus-muted" id="nmHistory">Sign in to keep your check-ins safely synced.</div>
      </section>
      <section class="nm-plus-card">
        <h3>Coming next in Plus</h3>
        <div class="nm-plus-muted">Weekly recovery insights · Rest planner · Appointment prep · Partner/Village companion mode · Support timeline</div>
      </section>`;
    app.insertBefore(view,nav);

    const recoveryBtn=[...document.querySelectorAll('.bottom .nav')].find(b=>b.textContent.includes('Recovery'));
    if(recoveryBtn){
      recoveryBtn.onclick=()=>showPlus();
      recoveryBtn.innerHTML='<b>♡</b>Recovery+';
    }
  }

  function createCheckinModal(){
    if (byId('nmCheckinModal')) return;
    const modal=document.createElement('div');
    modal.id='nmCheckinModal'; modal.className='nm-modal';
    modal.innerHTML=`<div class="nm-sheet">
      <h2 style="font-family:Georgia,serif;margin:0 0 4px">Daily Mom Check-In</h2>
      <p class="sub">A gentle snapshot of how today feels.</p>
      <div class="nm-check-grid">
        <div class="nm-metric"><b>Sleep last 24h</b><input id="nmSleep" type="number" min="0" max="24" step="0.5" value="6"><span class="small">hours</span></div>
        <div class="nm-metric"><b>Meals today</b><input id="nmMeals" type="number" min="0" max="10" value="2"></div>
        <div class="nm-metric"><b>Water</b><input id="nmWater" type="number" min="0" max="30" value="5"><span class="small">cups/glasses</span></div>
        <div class="nm-metric"><b>Discomfort</b><div class="nm-score-row"><input id="nmDiscomfort" type="range" min="0" max="10" value="2" oninput="nmDiscomfortOut.value=this.value"><output id="nmDiscomfortOut">2</output></div></div>
        <div class="nm-metric"><b>Energy</b><div class="nm-score-row"><input id="nmEnergy" type="range" min="1" max="5" value="3" oninput="nmEnergyOut.value=this.value"><output id="nmEnergyOut">3</output></div></div>
        <div class="nm-metric"><b>Feeling supported</b><div class="nm-score-row"><input id="nmSupported" type="range" min="1" max="5" value="3" oninput="nmSupportedOut.value=this.value"><output id="nmSupportedOut">3</output></div></div>
      </div>
      <label for="nmMood">Overall, how are you feeling?</label>
      <select id="nmMood"><option>Doing okay</option><option>Could use some help</option><option>Need support today</option></select>
      <label for="nmNotes">Anything you want to remember about today? <span class="small">Optional</span></label>
      <textarea id="nmNotes" maxlength="2000" placeholder="A hard night, a small win, something you want to discuss later…"></textarea>
      <div class="actions"><button class="btn secondary" onclick="window.closeMomCheckIn()">Cancel</button><button class="btn primary" onclick="window.saveMomCheckIn()">Save check-in</button></div>
      <div id="nmCheckinStatus" class="status"></div>
    </div>`;
    modal.addEventListener('click',e=>{if(e.target===modal)window.closeMomCheckIn()});
    document.body.appendChild(modal);
  }

  function createRequestModal(){
    if (byId('nmRequestModal')) return;
    const modal=document.createElement('div');
    modal.id='nmRequestModal'; modal.className='nm-modal';
    modal.innerHTML=`<div class="nm-sheet">
      <h2 style="font-family:Georgia,serif;margin:0 0 4px">Ask your Village</h2>
      <p class="sub">You stay in control of what gets shared.</p>
      <label for="nmRequestTitle">Request</label><input id="nmRequestTitle">
      <input id="nmRequestCategory" type="hidden">
      <div class="row"><div><label for="nmRequestDate">Date</label><input id="nmRequestDate" type="date"></div><div><label for="nmRequestTime">Time</label><input id="nmRequestTime" type="time"></div></div>
      <label for="nmRequestNotes">Note <span class="small">Optional</span></label><textarea id="nmRequestNotes" maxlength="1500" placeholder="Anything your Village should know…"></textarea>
      <div class="actions"><button class="btn secondary" onclick="window.closeVillageRequest()">Cancel</button><button class="btn primary" onclick="window.sendVillageRequest()">Send to My Village</button></div>
      <div id="nmRequestStatus" class="status"></div>
    </div>`;
    modal.addEventListener('click',e=>{if(e.target===modal)window.closeVillageRequest()});
    document.body.appendChild(modal);
  }

  function showPlus(){
    window.hideViews?.();
    const premium=byId('premiumView');
    if(premium) premium.classList.add('show');
    if(byId('pageTitle')) byId('pageTitle').textContent='Recovery+';
    document.querySelectorAll('.bottom .nav').forEach(b=>b.classList.remove('active'));
    const btn=[...document.querySelectorAll('.bottom .nav')].find(b=>b.textContent.includes('Recovery'));
    btn?.classList.add('active');
    loadHistory();
  }
  const originalHide = window.hideViews;
  function patchHideViews(){
    if(window.__nmPremiumHidePatched) return;
    window.__nmPremiumHidePatched=true;
    window.hideViews=function(){
      originalHide?.();
      byId('premiumView')?.classList.remove('show');
      document.querySelectorAll('.bottom .nav').forEach(b=>b.classList.remove('active'));
    };
    const village=window.goVillage;
    if(village) window.goVillage=function(){village();document.querySelectorAll('.bottom .nav').forEach(b=>b.classList.remove('active'));[...document.querySelectorAll('.bottom .nav')].find(b=>b.textContent.includes('My Village'))?.classList.add('active')};
  }

  async function getSession(){
    if(!window.nmSupabase) return null;
    const {data}=await window.nmSupabase.auth.getSession();
    return data?.session||null;
  }

  function buildSuggestions(x){
    const out=[];
    if(x.mood==='Need support today' || x.supported<=2) out.push({category:'Check-In',title:'Please check in with me today',detail:'Ask someone you trust to call, text, or spend a little time with you.'});
    if(x.sleep<4.5 || x.energy<=2) out.push({category:'Rest',title:'Help me protect an hour to rest',detail:'Let your Village take something off your plate while you rest.'});
    if(x.meals<2) out.push({category:'Meal',title:'Could someone bring me a meal?',detail:'One less thing to plan, cook, or clean up today.'});
    if(x.water<4) out.push({category:'Errand',title:'Could someone bring drinks or groceries?',detail:'A simple practical ask when leaving home feels like too much.'});
    if(!out.length) out.push({category:'Check-In',title:'Celebrate a small win with me',detail:'Support is not only for hard days. Invite someone to check in anyway.'});
    return out.slice(0,3);
  }

  function renderSuggestions(x){
    const card=byId('nmSupportCard'), list=byId('nmSupportList'), intro=byId('nmSupportIntro');
    if(!card||!list||!intro)return;
    const suggestions=buildSuggestions(x);
    intro.textContent=x.mood==='Doing okay'?'You’re doing okay today. Here are a few ways your Village could still lighten the load.':'Based on what you shared, one small ask could make today easier.';
    list.innerHTML=suggestions.map((s,i)=>`<button class="nm-support-option" data-i="${i}"><b>${escapeHtml(s.title)}</b><span class="nm-plus-muted">${escapeHtml(s.detail)}</span></button>`).join('');
    list.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>openVillageRequest(suggestions[Number(btn.dataset.i)])));
    card.style.display='block';
    card.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function setStatus(el,msg,warn=false){if(!el)return;el.textContent=msg;el.className=`status show${warn?' warn':' ok'}`}

  window.openMomCheckIn=async function(){
    const session=await getSession();
    if(!session){alert('Sign in from Settings first so your check-ins can be saved securely.');return}
    byId('nmCheckinModal')?.classList.add('open');
    byId('nmCheckinStatus').className='status';
  };
  window.closeMomCheckIn=function(){byId('nmCheckinModal')?.classList.remove('open')};

  window.saveMomCheckIn=async function(){
    const session=await getSession();
    if(!session)return setStatus(byId('nmCheckinStatus'),'Please sign in first.',true);
    const x={
      date:todayISO(),
      mood:byId('nmMood').value,
      sleep:Number(byId('nmSleep').value),
      water:Number(byId('nmWater').value),
      meals:Number(byId('nmMeals').value),
      discomfort:Number(byId('nmDiscomfort').value),
      energy:Number(byId('nmEnergy').value),
      supported:Number(byId('nmSupported').value),
      notes:byId('nmNotes').value.trim(),
      medication:'',
      source:'nurturemom_plus_checkin',
      created_at:new Date().toISOString()
    };
    if(!Number.isFinite(x.sleep)||x.sleep<0||x.sleep>24||x.water<0||x.water>30||x.meals<0||x.meals>10)return setStatus(byId('nmCheckinStatus'),'Please check the numbers you entered.',true);
    setStatus(byId('nmCheckinStatus'),'Saving your check-in…');
    const {error}=await window.nmSupabase.rpc('nm_save',{v:session.user.id,kind:'recovery',p:x});
    if(error)return setStatus(byId('nmCheckinStatus'),error.message||'We could not save your check-in yet.',true);
    localStorage.setItem('nurturemom_last_checkin',JSON.stringify(x));
    window.closeMomCheckIn();
    renderSuggestions(x);
    await loadHistory();
    if(x.discomfort>=7){
      const card=byId('nmSupportCard');
      if(card&&!byId('nmSafetyNote')){const n=document.createElement('div');n.id='nmSafetyNote';n.className='nm-danger-note';n.textContent='You reported significant discomfort. NurtureMom does not diagnose symptoms. If pain is severe, worsening, or you are worried about how you feel, contact your healthcare professional promptly. For an emergency, call 911 or your local emergency service.';card.appendChild(n)}
    }
  };

  function openVillageRequest(s){
    byId('nmRequestTitle').value=s.title;
    byId('nmRequestCategory').value=s.category;
    byId('nmRequestDate').value=todayISO();
    byId('nmRequestTime').value=timePlus(60);
    byId('nmRequestNotes').value='';
    byId('nmRequestStatus').className='status';
    byId('nmRequestModal').classList.add('open');
  }
  window.closeVillageRequest=function(){byId('nmRequestModal')?.classList.remove('open')};
  window.sendVillageRequest=async function(){
    const session=await getSession();
    if(!session)return setStatus(byId('nmRequestStatus'),'Please sign in first.',true);
    const p={id:uuid(),title:byId('nmRequestTitle').value.trim(),category:byId('nmRequestCategory').value,date:byId('nmRequestDate').value,time:byId('nmRequestTime').value,notes:byId('nmRequestNotes').value.trim()};
    if(!p.title||!p.date||!p.time)return setStatus(byId('nmRequestStatus'),'Please choose a request, date, and time.',true);
    setStatus(byId('nmRequestStatus'),'Sending your request…');
    const {error}=await window.nmSupabase.rpc('nm_save',{v:session.user.id,kind:'request',p});
    if(error)return setStatus(byId('nmRequestStatus'),error.message||'We could not send this request yet.',true);
    setStatus(byId('nmRequestStatus'),'Sent to your Village ♡');
    window.maybeNotify?.('Village request sent',p.title);
    setTimeout(()=>window.closeVillageRequest(),900);
  };

  async function loadHistory(){
    const box=byId('nmHistory'); if(!box)return;
    const session=await getSession();
    if(!session){box.textContent='Sign in to keep your check-ins safely synced.';return}
    const {data,error}=await window.nmSupabase.from('nm_recovery').select('day,data').eq('owner_id',session.user.id).order('day',{ascending:false}).limit(7);
    if(error){box.textContent='Your check-in history will appear here.';return}
    if(!data?.length){box.innerHTML='<div class="nm-plus-muted">No check-ins yet. Your first one takes about 30 seconds.</div>';return}
    box.innerHTML=data.map(row=>{const x=row.data||{};return `<div class="nm-history-row"><b>${new Date(`${row.day}T12:00:00`).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</b><div class="small">${escapeHtml(x.mood||'Check-in')} · Sleep ${escapeHtml(x.sleep??'—')}h · Energy ${escapeHtml(x.energy??'—')}/5 · Supported ${escapeHtml(x.supported??'—')}/5</div></div>`}).join('');
  }

  function restoreLastSuggestion(){
    try{const x=JSON.parse(localStorage.getItem('nurturemom_last_checkin')||'null');if(x&&x.date===todayISO())renderSuggestions(x)}catch{}
  }

  function install(){
    installStyles();createView();createCheckinModal();createRequestModal();patchHideViews();restoreLastSuggestion();
    let attempts=0;const ready=()=>{attempts++;if(window.nmSupabase){loadHistory();return}if(attempts<40)setTimeout(ready,150)};ready();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
