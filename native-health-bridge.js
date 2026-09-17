(() => {
  const MOVEMENT = 'nurturemom_plus_movement';
  const GOAL = 'nurturemom_plus_movement_goal';
  let state = { available:false, permission:false, steps:null, source:'', lastSyncAt:null, platform:'web' };

  const todayISO = () => new Date().toISOString().slice(0,10);
  const readRows = () => { try { const x=JSON.parse(localStorage.getItem(MOVEMENT)||'[]'); return Array.isArray(x)?x:[]; } catch { return []; } };

  function saveNativeSteps(detail){
    if (!detail || !Number.isFinite(Number(detail.steps))) return;
    const date = detail.date || todayISO();
    const rows = readRows();
    const existing = rows.find(r => r.date === date) || {};
    const item = {
      ...existing,
      id: existing.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      date,
      steps: Math.max(0, Number(detail.steps)),
      auto_steps: Math.max(0, Number(detail.steps)),
      source: detail.source || 'health_connect',
      goal: existing.goal || Number(localStorage.getItem(GOAL) || 10),
      created_at: existing.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const next = rows.filter(r => r.date !== date); next.unshift(item);
    localStorage.setItem(MOVEMENT, JSON.stringify(next.slice(0,120)));
  }

  function ensureCard(){
    const overlay = document.getElementById('nmPlusMovement');
    if (!overlay || overlay.querySelector('#nmNativeHealthCard')) return;
    const sheet = overlay.querySelector('.nm-plus-sheet');
    const firstGrid = overlay.querySelector('.nm-plus-grid');
    if (!sheet || !firstGrid) return;
    const card = document.createElement('div');
    card.id='nmNativeHealthCard';
    card.className='nm-plus-card';
    card.innerHTML=`<div class="nm-plus-row"><div><h3>♡ Your movement, noticed for you</h3><p id="nmNativeHealthCopy">Checking your phone’s movement data…</p></div><button class="nm-plus-secondary" id="nmNativeHealthAction" type="button">Connect</button></div><div id="nmNativeHealthMetric" class="nm-plus-metric" style="display:none"><div><b id="nmNativeSteps">—</b><span>steps today</span></div><div><b id="nmNativeStatus">—</b><span>tracker</span></div><div><b id="nmNativeUpdated">—</b><span>last sync</span></div></div><div class="nm-plus-small">Private by default. NurtureMom reads only the movement permission you choose to share.</div>`;
    firstGrid.parentNode.insertBefore(card, firstGrid);
    card.querySelector('#nmNativeHealthAction').addEventListener('click', () => {
      if (window.NurtureMomHealth?.requestAccess) window.NurtureMomHealth.requestAccess();
      else if (window.AndroidHealth?.requestHealthAccess) window.AndroidHealth.requestHealthAccess();
    });
    render();
  }

  function render(){
    ensureCard();
    const copy=document.getElementById('nmNativeHealthCopy'), action=document.getElementById('nmNativeHealthAction'), metric=document.getElementById('nmNativeHealthMetric');
    if(!copy||!action||!metric) return;
    const isNative = state.platform === 'android' || state.platform === 'ios';
    if(!isNative){ copy.textContent='Install the NurtureMom app to let Plus notice your daily steps automatically.'; action.style.display='none'; metric.style.display='none'; return; }
    action.style.display='inline-block';
    if(!state.available){ copy.textContent=state.message || 'Health tracking is not available on this device yet.'; action.textContent='Check again'; metric.style.display='none'; return; }
    if(!state.permission){ copy.textContent='Connect your health data once, then NurtureMom can notice your steps whenever you open the app.'; action.textContent='Connect'; metric.style.display='none'; return; }
    copy.textContent='Your steps are picked up automatically when you open NurtureMom — no manual entry needed.';
    action.textContent='Refresh'; metric.style.display='grid';
    document.getElementById('nmNativeSteps').textContent = Number(state.steps||0).toLocaleString();
    document.getElementById('nmNativeStatus').textContent='Live';
    document.getElementById('nmNativeUpdated').textContent=state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : 'Now';
  }

  function apply(detail={}){
    state={...state,...detail};
    if(state.permission && Number.isFinite(Number(state.steps))) saveNativeSteps(state);
    render();
    window.dispatchEvent(new CustomEvent('nurturemom:movement-sync',{detail:{...state}}));
  }

  window.addEventListener('nurturemom:native-health', e => apply(e.detail||{}));
  window.NurtureMomNativeHealth = { getState:()=>({...state}), refresh:()=>window.AndroidHealth?.syncToday?.(), requestAccess:()=>window.AndroidHealth?.requestHealthAccess?.() };

  const observer=new MutationObserver(()=>ensureCard()); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{ensureCard(); setTimeout(()=>window.AndroidHealth?.syncToday?.(),700);},{once:true});
  else { ensureCard(); setTimeout(()=>window.AndroidHealth?.syncToday?.(),700); }
})();