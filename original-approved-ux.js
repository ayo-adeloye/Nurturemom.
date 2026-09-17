(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??d}catch{return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const CHECKINS='nurturemom_plus_checkins',VILLAGE='nurturemom_village',REQUESTS='nurturemom_help_requests',SCHEDULE='nurturemom_schedule';
  const seedVillage=[{name:'Temi',role:'Partner',status:'Available to help',careCount:1}];
  const seedRequests=[
    {id:'seed1',type:'Meal',title:'Dinner for tired papa',details:'A little support makes a difference.',when:'2026-09-11T18:00:00',status:'Claimed',helper:'Temi'},
    {id:'seed2',type:'Ride',title:'Need a ride to my appt',details:'A little support makes a difference.',when:'2026-09-11T18:00:00',status:'Completed'}
  ];
  let requestType='Meal', requestFilter='All';

  function addStyles(){
    if($('#nmOriginalApprovedStyles'))return;
    const s=document.createElement('style');s.id='nmOriginalApprovedStyles';s.textContent=`
      .orig-kicker{font-size:11px;letter-spacing:.17em;font-weight:800;color:#967b56;text-transform:uppercase;margin-bottom:14px}
      .orig-title{font:40px/1.12 Georgia,"Times New Roman",serif;color:#543047;font-weight:400;margin:0 0 13px}
      .orig-sub{color:#7c7074;font-size:15.5px;line-height:1.5;margin-bottom:26px}
      .orig-card{background:#fff;border:1px solid #e8dfd9;border-radius:20px;padding:18px;box-shadow:0 2px 12px rgba(78,48,62,.035)}
      .orig-home-card{background:#fff;border:1px solid #e7ded8;border-radius:18px;padding:17px;margin-top:16px;box-shadow:0 2px 12px rgba(78,48,62,.03)}
      .orig-home-card h3{font:20px Georgia,serif;color:#513047;font-weight:400;margin:0 0 5px}.orig-cardcopy{font-size:11px;color:#7f7478;line-height:1.55}
      .orig-cardtop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.orig-mini-kicker{font-size:9px;letter-spacing:.15em;font-weight:800;color:#967b56;margin:0 0 9px}
      .orig-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #eee5df;margin-top:14px;padding-bottom:15px}.orig-metric{text-align:center;min-height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid #eee5df;color:#5e5358;font-size:10.5px}.orig-metric:last-child{border-right:0}.orig-metric i{font-style:normal;font-size:17px;color:#796371;margin-bottom:5px}.orig-metric b{font-weight:500;margin-bottom:3px}
      .orig-link{border:0;background:none;padding:14px 0 0;color:#674c5c;font-size:10.5px;font-weight:700}.orig-avatar{width:34px;height:34px;border-radius:50%;background:#ece6de;display:grid;place-items:center;color:#66585b;font:14px Georgia,serif;margin:12px 0}
      .orig-quote{padding:29px 12px 10px;text-align:center;color:#9a806f;font:italic 16px/1.5 Georgia,serif}.orig-quote b{display:block;font:20px Georgia,serif;margin-top:7px}
      .orig-formhead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:18px}.orig-formhead h2{font:23px Georgia,serif;color:#503047;font-weight:400;margin:0}.orig-datepill{background:#eaf0e3;color:#708165;border-radius:999px;padding:7px 11px;font-size:11px}
      .orig-label{display:block;font-size:12px;color:#665b60;margin:14px 0 7px}.orig-field{width:100%;border:1px solid #e0d7d2;border-radius:10px;background:#fff;padding:12px;color:#51454a;outline:none}.orig-field:focus{border-color:#8a5b77;box-shadow:0 0 0 2px rgba(113,66,95,.08)}.orig-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.orig-textarea{min-height:104px;resize:vertical;line-height:1.45}
      .orig-privacy{display:flex;gap:8px;align-items:center;color:#8a7e82;font-size:10.5px;margin:15px 0}.orig-save,.orig-action{border:0;background:#71425f;color:#fff;border-radius:10px;padding:13px 15px;font-weight:700}.orig-save{width:100%}.orig-action{padding:14px 20px}
      .orig-recent-title{font:27px Georgia,serif;color:#523046;font-weight:400;margin:28px 0 15px}.orig-day{background:#fff;border:1px solid #e7ded8;border-radius:18px;padding:18px;margin-bottom:12px}.orig-day h3{font:22px Georgia,serif;color:#553149;font-weight:400;margin:15px 0 7px}.orig-day p{font-size:12px;color:#6f6468;line-height:1.55;margin:0 0 5px}.orig-day .faded{color:#94888b}.orig-footnote{color:#9a8e91;font-size:10.5px;margin-top:10px}.orig-mother-footer{text-align:center;color:#b19a8c;font:italic 15px Georgia,serif;margin:55px 0 2px}
      .orig-banner{display:grid;grid-template-columns:48px 1fr;align-items:center;gap:12px;background:#e9eee2;border-radius:17px;padding:20px 18px;margin:26px 0 20px;color:#65745c}.orig-banner b{display:block;font-size:13px;margin-bottom:4px}.orig-banner span{font-size:12px;line-height:1.45}
      .orig-member{text-align:center;padding:28px 18px;margin-top:16px}.orig-member-avatar{width:70px;height:70px;border-radius:50%;background:#ead8d0;display:grid;place-items:center;margin:0 auto 16px;font:31px Georgia,serif;color:#6b4758}.orig-member-name{font:27px Georgia,serif;color:#533149;margin-bottom:8px}.orig-role{color:#7b6f73;font-size:15px}.orig-pill{display:inline-block;border-radius:999px;padding:6px 11px;font-size:11px;background:#e6eee0;color:#68795f;margin:18px 0}.orig-membermeta{font-size:11.5px;color:#8d8184;margin-bottom:20px}.orig-secondary{width:100%;border:1px solid #dfd5d0;background:#fff;color:#694a5e;border-radius:10px;padding:12px;font-weight:700}
      .orig-info{display:grid;grid-template-columns:40px 1fr;gap:12px;margin-top:22px}.orig-info h3{font:23px Georgia,serif;color:#533149;font-weight:400;margin:0 0 8px}.orig-info p{color:#75696d;font-size:12px;line-height:1.55;margin:0}.orig-shield{font-size:25px;color:#81956f}
      .orig-tabs{display:grid;grid-template-columns:repeat(4,1fr);background:#f1e8e7;border-radius:9px;padding:5px;margin:25px 0 18px}.orig-tab{border:0;background:transparent;padding:11px 4px;border-radius:7px;color:#7a6d72;font-weight:700;font-size:12px}.orig-tab.active{background:#fff;box-shadow:0 2px 5px rgba(83,49,72,.07);color:#493b41}
      .orig-request{margin-bottom:14px}.orig-reqtop{display:flex;justify-content:space-between;align-items:flex-start}.orig-reqicon{width:44px;height:44px;border-radius:12px;background:#f2e5e1;display:grid;place-items:center;color:#7f6264;font-size:22px}.orig-status{font-size:11px;padding:6px 11px;border-radius:999px;background:#e7efe3;color:#697d63}.orig-status.done{background:#eee7f3;color:#7d6688}.orig-reqtype{font-size:11px;letter-spacing:.13em;color:#9a805c;font-weight:700;margin-top:17px}.orig-request h3{font:25px Georgia,serif;color:#553149;font-weight:400;margin:9px 0 10px}.orig-request p{font-size:12px;color:#7e7276;line-height:1.45}.orig-reqline{display:flex;align-items:center;gap:9px;color:#7d7074;font-size:11.5px;margin-top:21px}.orig-helper{display:flex;align-items:center;gap:10px;margin:18px 0 14px;color:#594d52;font-size:12px}
      .orig-schedule-empty{min-height:214px;border:1px dashed #d8cec7;border-radius:18px;background:#faf7f2;display:grid;place-items:center;text-align:center;color:#8b7f7c;padding:28px 20px;font-size:13px;line-height:1.5;margin-top:26px}.orig-leaf{font-size:40px;color:#866e65;margin-bottom:12px}.orig-schedule-list{display:grid;gap:12px;margin-top:20px}.orig-schedule-item{border:1px solid #e7ded8;border-radius:16px;padding:15px;background:#fff;display:grid;grid-template-columns:42px 1fr;gap:12px}.orig-schedule-item h3{font:19px Georgia,serif;color:#553149;font-weight:400;margin:0 0 5px}.orig-schedule-item p{font-size:11.5px;color:#817579;margin:0}
      .orig-modal{position:fixed;inset:0;background:rgba(46,32,39,.48);display:none;align-items:flex-end;justify-content:center;z-index:950}.orig-modal.open{display:flex}.orig-sheet{width:min(520px,100%);max-height:90vh;overflow:auto;background:#fffdf9;border-radius:24px 24px 0 0;padding:20px 18px calc(28px + env(safe-area-inset-bottom))}.orig-sheet h2{font:25px Georgia,serif;color:#533149;font-weight:400;margin:0 0 5px}.orig-actions{display:flex;gap:9px;margin-top:16px}.orig-actions>*{flex:1}.orig-cancel{border:1px solid #ded4cf;background:#fff;color:#674c5d;border-radius:10px;padding:12px;font-weight:700}
      #home .support-empty + .orig-home-card{margin-top:16px}
      @media(max-width:380px){.orig-title{font-size:35px}}
    `;document.head.appendChild(s);
  }

  function fmtDate(x){return new Date(x).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}
  function fmtDT(x){return new Date(x).toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
  function dayISO(){return new Date().toISOString().slice(0,10)}
  function latest(){return read(CHECKINS,[])[0]||null}

  function restoreHome(){
    const home=$('#home'); if(!home)return;
    const d=$('.date',home); if(d)d.textContent=new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
    if($('#origRecoveryHome'))return;
    $('.support-empty',home)?.insertAdjacentHTML('afterend',`
      <section class="orig-home-card" id="origRecoveryHome">
        <div class="orig-cardtop"><div><div class="orig-mini-kicker">ONE DAY AT A TIME</div><h3>Your recovery</h3><div class="orig-cardcopy" id="origPostpartumAge">6 days with Nurt</div></div><div style="color:#80566e;font-size:20px">❀</div></div>
        <div class="orig-metrics"><div class="orig-metric"><i>☾</i><b>Sleep</b><span id="origHomeSleep">–</span></div><div class="orig-metric"><i>♧</i><b>Water</b><span id="origHomeWater">–</span></div><div class="orig-metric"><i>♜</i><b>Meals</b><span id="origHomeMeals">–</span></div></div>
        <button class="orig-link" data-orig-go="recovery" id="origRecoveryLink">Log your first check-in →</button>
      </section>
      <section class="orig-home-card" id="origCircleHome">
        <div class="orig-cardtop"><h3>Your circle of care</h3><div style="font-size:19px">♧</div></div><div class="orig-avatar" id="origVillageInitial">T</div>
        <div class="orig-cardcopy"><b id="origVillageCount" style="color:#55494e;font-weight:500">1 person in your corner.</b><br><br>A meal, a quiet hour, a listening ear.<br>You’re held by your village.</div>
        <button class="orig-link" data-orig-go="village">Meet your village →</button>
      </section>
      <div class="orig-quote">“You are allowed to be both a masterpiece and a<br>work in progress.”<b>♡</b></div>`);
    $$('[data-orig-go]',home).forEach(b=>b.onclick=()=>navTo(b.dataset.origGo));
  }

  function restoreRecovery(){
    const el=$('#recovery');if(!el)return;
    el.innerHTML=`<div class="orig-kicker">A MOMENT FOR YOU</div><h1 class="orig-title">Your recovery</h1><div class="orig-sub">No perfect days required. Just an honest check-in.</div>
    <section class="orig-card"><div class="orig-formhead"><h2>How are you, really?</h2><span class="orig-datepill" id="origRecoveryDate"></span></div>
    <label class="orig-label">How are you feeling?</label><select id="origMood" class="orig-field"><option>Doing okay</option><option>Could use some help</option><option selected>Need support today</option></select>
    <div class="orig-two"><div><label class="orig-label">Hours of sleep</label><input id="origSleep" class="orig-field" type="number" min="0" max="24" step=".5" value="0"></div><div><label class="orig-label">Glasses of water</label><input id="origWater" class="orig-field" type="number" min="0" max="30" value="0"></div><div><label class="orig-label">Meals today</label><input id="origMeals" class="orig-field" type="number" min="0" max="10" value="0"></div><div><label class="orig-label">Discomfort (0–10)</label><input id="origDiscomfort" class="orig-field" type="number" min="0" max="10" value="0"></div></div>
    <label class="orig-label">What’s on your mind?</label><textarea id="origNotes" class="orig-field orig-textarea" placeholder="A small win, a hard moment, anything you want to remember..."></textarea>
    <label class="orig-label">Medication or care notes (optional)</label><input id="origCareNotes" class="orig-field" placeholder="Your own notes from your care plan">
    <div class="orig-privacy">♢ <span>Your recovery notes are private to your account.</span></div><button id="origSaveRecovery" class="orig-save">✓ &nbsp; Save my check-in</button></section>
    <h2 class="orig-recent-title">Your recent days</h2><div id="origRecentDays"></div><div class="orig-footnote">A personal journal, not a medical assessment.</div><div class="orig-mother-footer">Made for the mother, too. ♡</div>`;
    $('#origSaveRecovery').onclick=saveRecovery;
  }

  function restoreVillage(){
    const el=$('#village');if(!el)return;
    el.innerHTML=`<div class="orig-kicker">YOUR PEOPLE, CLOSE BY</div><h1 class="orig-title">My Village</h1><div class="orig-sub">A circle of people who care about you.</div><button class="orig-action" id="origAddVillage">＋ &nbsp; Add a village member</button>
    <div class="orig-banner"><div style="font-size:27px">♧</div><div><b>No one is meant to do this alone.</b><span>Let your village take care of the little things.</span></div></div><div id="origVillageMembers"></div>
    <section class="orig-card orig-info"><div class="orig-shield">♢</div><div><h3>Your circle, your choice</h3><p>Village members see help requests. Recovery notes stay in Mom’s view. An invitation is available when they sign in with the invited email and accept. Email delivery status appears below.</p></div></section>`;
    $('#origAddVillage').onclick=()=>openModal('origVillageModal');
  }

  function restoreRequests(){
    const el=$('#requests');if(!el)return;
    el.innerHTML=`<div class="orig-kicker">MAKE SPACE FOR SUPPORT</div><h1 class="orig-title">Help requests</h1><div class="orig-sub">Tell your village what would make today a little easier.</div><button class="orig-action" id="origAskHelp">＋ &nbsp; Ask for help</button>
    <div class="orig-tabs"><button class="orig-tab active" data-orig-filter="All">All</button><button class="orig-tab" data-orig-filter="Open">Open</button><button class="orig-tab" data-orig-filter="Claimed">Claimed</button><button class="orig-tab" data-orig-filter="Completed">Completed</button></div><div id="origRequestList"></div>`;
    $('#origAskHelp').onclick=()=>openModal('origRequestModal');
    $$('[data-orig-filter]',el).forEach(b=>b.onclick=()=>{$$('[data-orig-filter]',el).forEach(x=>x.classList.remove('active'));b.classList.add('active');requestFilter=b.dataset.origFilter;renderRequests()});
  }

  function restoreSchedule(){
    const el=$('#schedule');if(!el)return;
    el.innerHTML=`<div class="orig-kicker">A LITTLE MORE BREATHING ROOM</div><h1 class="orig-title">Your schedule</h1><div class="orig-sub">Help, visits, and moments of care — all in one place.</div><button class="orig-action" id="origAddAppointment">＋ &nbsp; Add appointment</button><div id="origScheduleBody"></div><div class="orig-mother-footer" style="margin-top:47px">Made for the mother, too. ♡</div>`;
    $('#origAddAppointment').onclick=()=>openModal('origScheduleModal');
  }

  function addModals(){
    if($('#origRequestModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
    <div class="orig-modal" id="origRequestModal"><div class="orig-sheet"><h2>What would make today easier?</h2><div class="orig-sub">A simple ask is enough. Your village can take it from there.</div>
      <div class="needs" style="margin-bottom:12px"><button class="need request-chip active" data-orig-type="Meal"><i>🍴</i>Meal</button><button class="need request-chip" data-orig-type="Rest"><i>☾</i>Rest</button><button class="need request-chip" data-orig-type="Errand"><i>▣</i>Errand</button><button class="need request-chip" data-orig-type="Ride"><i>🚗</i>Ride</button><button class="need request-chip" data-orig-type="Baby Help"><i>☺</i>Baby Help</button><button class="need request-chip" data-orig-type="House Help"><i>⌂</i>House Help</button></div>
      <label class="orig-label">What do you need?</label><textarea id="origRequestText" class="orig-field orig-textarea request-box" placeholder="A meal, a ride, a quiet hour — whatever would help."></textarea><label class="orig-label">When?</label><input id="origRequestWhen" class="orig-field" type="datetime-local"><div class="orig-actions"><button class="orig-cancel" data-orig-close="origRequestModal">Not now</button><button class="orig-save" id="origSaveRequest">Ask my village</button></div></div></div>
    <div class="orig-modal" id="origVillageModal"><div class="orig-sheet"><h2>Add someone to your village</h2><div class="orig-sub">Invite someone you trust to help carry the little things.</div><div class="orig-two"><div><label class="orig-label">Name</label><input id="origVillageName" class="orig-field" placeholder="e.g. Temi"></div><div><label class="orig-label">Relationship</label><input id="origVillageRole" class="orig-field" placeholder="e.g. Partner"></div></div><label class="orig-label">Email</label><input id="origVillageEmail" class="orig-field" type="email" placeholder="name@example.com"><div class="orig-actions"><button class="orig-cancel" data-orig-close="origVillageModal">Not now</button><button class="orig-save" id="origSaveVillage">Add to my village</button></div></div></div>
    <div class="orig-modal" id="origScheduleModal"><div class="orig-sheet"><h2>Add an appointment</h2><div class="orig-sub">One place for the moments you want to remember.</div><label class="orig-label">Appointment</label><input id="origScheduleTitle" class="orig-field" placeholder="e.g. Postpartum check-up"><label class="orig-label">Date and time</label><input id="origScheduleWhen" class="orig-field" type="datetime-local"><label class="orig-label">Note (optional)</label><textarea id="origScheduleNote" class="orig-field" style="min-height:80px"></textarea><div class="orig-actions"><button class="orig-cancel" data-orig-close="origScheduleModal">Not now</button><button class="orig-save" id="origSaveSchedule">Add to my schedule</button></div></div></div>`);
    $$('[data-orig-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.origClose));
    $$('.orig-modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
    $$('[data-orig-type]').forEach(b=>b.onclick=()=>{$$('[data-orig-type]').forEach(x=>x.classList.remove('active'));b.classList.add('active');requestType=b.dataset.origType});
    $('#origSaveRequest').onclick=saveRequest;$('#origSaveVillage').onclick=saveVillage;$('#origSaveSchedule').onclick=saveSchedule;
  }

  function openModal(id){$('#'+id)?.classList.add('open');document.body.style.overflow='hidden'}
  function closeModal(id){$('#'+id)?.classList.remove('open');document.body.style.overflow=''}
  function navTo(id){const b=$(`.nav button[data-screen="${id}"]`);if(b)b.click()}

  function saveRecovery(){
    const x={id:crypto.randomUUID?.()||String(Date.now()),date:dayISO(),created_at:new Date().toISOString(),mood:$('#origMood').value,sleep:Number($('#origSleep').value)||0,water:Number($('#origWater').value)||0,meals:Number($('#origMeals').value)||0,discomfort:Number($('#origDiscomfort').value)||0,notes:$('#origNotes').value.trim(),care_notes:$('#origCareNotes').value.trim(),supported:3,energy:3};
    const rows=read(CHECKINS,[]).filter(r=>r.date!==x.date);rows.unshift(x);write(CHECKINS,rows.slice(0,90));renderAll();const btn=$('#origSaveRecovery');btn.textContent='Saved with care ♡';setTimeout(()=>btn.textContent='✓   Save my check-in',1500)
  }
  function saveVillage(){
    const name=$('#origVillageName').value.trim();if(!name)return;const rows=read(VILLAGE,seedVillage);rows.push({name,role:$('#origVillageRole').value.trim()||'Village member',email:$('#origVillageEmail').value.trim(),status:'Invitation pending',careCount:0});write(VILLAGE,rows);closeModal('origVillageModal');renderVillage();renderHomeSummary()
  }
  function saveRequest(){
    const text=$('#origRequestText').value.trim();if(!text)return;const rows=read(REQUESTS,seedRequests);rows.unshift({id:crypto.randomUUID?.()||String(Date.now()),type:requestType,title:text.split('\n')[0].slice(0,70),details:'A little support makes a difference.',when:$('#origRequestWhen').value||new Date(Date.now()+86400000).toISOString(),status:'Open'});write(REQUESTS,rows);$('#origRequestText').value='';closeModal('origRequestModal');renderRequests()
  }
  function saveSchedule(){
    const title=$('#origScheduleTitle').value.trim(),when=$('#origScheduleWhen').value;if(!title||!when)return;const rows=read(SCHEDULE,[]);rows.push({id:crypto.randomUUID?.()||String(Date.now()),title,when,note:$('#origScheduleNote').value.trim()});write(SCHEDULE,rows);closeModal('origScheduleModal');renderSchedule();renderHomeSummary()
  }

  function renderHomeSummary(){
    const c=latest();if($('#origHomeSleep')){$('#origHomeSleep').textContent=c?.sleep??'–';$('#origHomeWater').textContent=c?.water??'–';$('#origHomeMeals').textContent=c?.meals??'–';$('#origRecoveryLink').textContent=c?'See my recovery →':'Log your first check-in →'}
    const v=read(VILLAGE,seedVillage);if($('#origVillageCount')){$('#origVillageCount').textContent=`${v.length} ${v.length===1?'person':'people'} in your corner.`;$('#origVillageInitial').textContent=(v[0]?.name||'♡').slice(0,1).toUpperCase()}
  }
  function renderRecent(){
    if(!$('#origRecentDays'))return;$('#origRecoveryDate').textContent=new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
    const rows=read(CHECKINS,[]);$('#origRecentDays').innerHTML=rows.length?rows.slice(0,5).map(r=>`<article class="orig-day"><div style="display:flex;justify-content:space-between"><strong style="font-size:12px">${esc(fmtDate(r.created_at||r.date))}</strong><span style="color:#76566a">❀</span></div><h3>${esc(r.mood||'A day worth noticing')}</h3><p>${Number(r.sleep)||0}h sleep · ${Number(r.water)||0} glasses · ${Number(r.meals)||0} meals</p><p>Discomfort: ${Number(r.discomfort)||0}/10</p>${r.notes?`<p>${esc(r.notes)}</p>`:''}${r.care_notes?`<p class="faded">Care notes: ${esc(r.care_notes)}</p>`:''}</article>`).join(''):`<article class="orig-day"><h3>Your first check-in can start here.</h3><p>There is nothing to catch up on. Today can start softly.</p></article>`
  }
  function renderVillage(){
    if(!$('#origVillageMembers'))return;const v=read(VILLAGE,seedVillage);$('#origVillageMembers').innerHTML=v.map((m,i)=>`<article class="orig-card orig-member"><div class="orig-member-avatar">${esc((m.name||'?').slice(0,1).toUpperCase())}</div><div class="orig-member-name">${esc(m.name)}</div><div class="orig-role">${esc(m.role||'Village member')}</div><div class="orig-pill">${esc(m.status||'Available to help')}</div><div class="orig-membermeta">${Number(m.careCount||0)} acts of care completed</div><button class="orig-secondary" data-orig-unavailable="${i}">Set as unavailable</button></article>`).join('');$$('[data-orig-unavailable]').forEach(b=>b.onclick=()=>{const rows=read(VILLAGE,seedVillage),m=rows[Number(b.dataset.origUnavailable)];m.status=m.status==='Unavailable'?'Available to help':'Unavailable';write(VILLAGE,rows);renderVillage();renderHomeSummary()})
  }
  function icon(type){return ({Meal:'🍴',Rest:'☾',Errand:'▣',Ride:'🚗','Baby Help':'☺','House Help':'⌂'})[type]||'♡'}
  function renderRequests(){
    if(!$('#origRequestList'))return;const rows=read(REQUESTS,seedRequests).filter(r=>requestFilter==='All'||r.status===requestFilter);$('#origRequestList').innerHTML=rows.length?rows.map(r=>`<article class="orig-card orig-request"><div class="orig-reqtop"><div class="orig-reqicon">${icon(r.type)}</div><span class="orig-status ${r.status==='Completed'?'done':''}">${r.status==='Claimed'?'✓ ':''}${esc(r.status||'Open')}</span></div><div class="orig-reqtype">${esc(r.type||'Support')}</div><h3>${esc(r.title||r.details||'A little help')}</h3><p>${esc(r.details||'A little support makes a difference.')}</p>${r.when?`<div class="orig-reqline">▣ ${esc(fmtDT(r.when))}</div>`:''}${r.helper?`<div class="orig-helper"><div class="orig-avatar" style="margin:0;width:31px;height:31px">${esc(r.helper.slice(0,1))}</div><span>${esc(r.helper)} is helping</span></div>`:''}${r.status==='Claimed'?`<button class="orig-secondary" data-orig-complete="${esc(r.id)}">✓ &nbsp; Mark completed</button>`:''}</article>`).join(''):`<div class="support-empty"><div><b>♧</b>No requests here right now. Ask only when it would help.</div></div>`;$$('[data-orig-complete]').forEach(b=>b.onclick=()=>{const all=read(REQUESTS,seedRequests),r=all.find(x=>String(x.id)===String(b.dataset.origComplete));if(r)r.status='Completed';write(REQUESTS,all);renderRequests()})
  }
  function renderSchedule(){
    if(!$('#origScheduleBody'))return;const rows=read(SCHEDULE,[]);$('#origScheduleBody').innerHTML=rows.length?`<div class="orig-schedule-list">${rows.sort((a,b)=>new Date(a.when)-new Date(b.when)).map(s=>`<article class="orig-schedule-item"><div class="orig-reqicon">▣</div><div><h3>${esc(s.title)}</h3><p>${esc(fmtDT(s.when))}</p>${s.note?`<p style="margin-top:6px">${esc(s.note)}</p>`:''}</div></article>`).join('')}</div>`:`<div class="orig-schedule-empty"><div><div class="orig-leaf">♧</div><div>Your schedule has room to breathe. Upcoming help and appointments will appear here.</div></div></div>`
  }
  function bindHomeNeeds(){
    $$('.need',$('#home')).forEach(b=>b.addEventListener('click',()=>{const t=b.textContent.trim();requestType=t;openModal('origRequestModal');const hit=$$('[data-orig-type]').find(x=>x.dataset.origType===t);hit?.click()}))
  }
  function renderAll(){renderHomeSummary();renderRecent();renderVillage();renderRequests();renderSchedule()}
  function install(){
    addStyles();restoreHome();restoreRecovery();restoreVillage();restoreRequests();restoreSchedule();addModals();bindHomeNeeds();renderAll();
    window.addEventListener('nurturemom:plus-activity-saved',renderAll);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();