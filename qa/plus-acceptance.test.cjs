const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class StorageMock {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k,v) { this.map.set(String(k), String(v)); }
  removeItem(k) { this.map.delete(String(k)); }
}

function element(tag='div') {
  return {
    tagName: tag.toUpperCase(),
    children: [],
    dataset: {},
    disabled: false,
    textContent: '',
    innerHTML: '',
    parentNode: null,
    appendChild(child){ child.parentNode=this; this.children.push(child); return child; },
    insertBefore(child){ child.parentNode=this; this.children.push(child); return child; },
    setAttribute(){},
    addEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    replaceChildren(...kids){ this.children=kids; kids.forEach(k=>{ if(k) k.parentNode=this; }); }
  };
}

const localStorage = new StorageMock();
const sessionStorage = new StorageMock();
const listeners = new Map();
const documentListeners = new Map();
const document = {
  readyState: 'complete',
  documentElement: element('html'),
  head: element('head'),
  body: element('body'),
  createElement: element,
  createTextNode(text){ return { textContent:String(text) }; },
  getElementById(){ return null; },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  addEventListener(type, cb){ documentListeners.set(type, cb); }
};

let fetchPayload = { has_access:false, plan:'free' };
async function fetchMock(){
  return {
    ok: true,
    async json(){ return fetchPayload; }
  };
}

const speechSynthesis = {
  speaking:false,
  paused:false,
  speak(){ this.speaking=true; },
  cancel(){ this.speaking=false; this.paused=false; },
  pause(){ this.paused=true; },
  resume(){ this.paused=false; }
};

const windowObj = {
  speechSynthesis,
  addEventListener(type, cb){ listeners.set(type, cb); },
  dispatchEvent(){},
};

const context = {
  window: windowObj,
  document,
  localStorage,
  sessionStorage,
  Storage: StorageMock,
  CustomEvent: function(type, init){ this.type=type; this.detail=init && init.detail; },
  MutationObserver: function(){ this.observe=function(){}; },
  requestAnimationFrame(){},
  SpeechSynthesisUtterance: function(text){ this.text=text; this.rate=1; this.pitch=1; this.volume=1; this.lang=''; this.voice=null; this.addEventListener=function(){}; },
  fetch: fetchMock,
  alert(){},
  location:{ reload(){} },
  setTimeout(fn){ if (typeof fn === 'function') fn(); return 1; },
  clearTimeout(){},
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Set,
  Map,
  Promise,
  atob: s => Buffer.from(s, 'base64').toString('binary')
};
windowObj.window = windowObj;
Object.assign(windowObj, {
  document, localStorage, sessionStorage, Storage: StorageMock,
  CustomEvent: context.CustomEvent,
  SpeechSynthesisUtterance: context.SpeechSynthesisUtterance
});

vm.createContext(context);
let source = fs.readFileSync('plus-qa-fixes.js','utf8');
source = source.replace(
  /\}\)\(\);\s*$/,
  'window.__NURTUREMOM_QA_TEST__={weeklyRecommendations,weeklyLetterParts};})();'
);
vm.runInContext(source, context, { filename:'plus-qa-fixes.js' });

function setSession(id){
  const session = { user:{ id }, access_token:'header.payload.sig' };
  localStorage.setItem('nurturemom.supabase.session', JSON.stringify(session));
}

(async()=>{
  // Private storage must be isolated by signed-in user.
  setSession('mom-a');
  localStorage.setItem('nurturemom.private.companion.v1','A conversation');
  localStorage.setItem('nurturemom.gentle.steps.v1','A steps');

  setSession('mom-b');
  assert.strictEqual(localStorage.getItem('nurturemom.private.companion.v1'), null);
  assert.strictEqual(localStorage.getItem('nurturemom.gentle.steps.v1'), null);
  localStorage.setItem('nurturemom.private.companion.v1','B conversation');

  setSession('mom-a');
  assert.strictEqual(localStorage.getItem('nurturemom.private.companion.v1'),'A conversation');
  assert.strictEqual(localStorage.getItem('nurturemom.gentle.steps.v1'),'A steps');

  // Entitlement acceptance: Free denied, Plus allowed, Founder allowed.
  fetchPayload = { has_access:false, plan:'free', plus_access:false, founder_access:false };
  let access = await windowObj.NurtureMomPlusAccess.refresh();
  assert.strictEqual(access.has_access,false);

  fetchPayload = { has_access:true, plan:'plus', plus_access:true, founder_access:false };
  access = await windowObj.NurtureMomPlusAccess.refresh();
  assert.strictEqual(access.has_access,true);
  assert.strictEqual(access.plus_access,true);

  fetchPayload = { has_access:true, plan:'free', plus_access:false, founder_access:true };
  access = await windowObj.NurtureMomPlusAccess.refresh();
  assert.strictEqual(access.has_access,true);
  assert.strictEqual(access.founder_access,true);

  // Weekly care must adapt to difficult weeks.
  const qa = windowObj.__NURTUREMOM_QA_TEST__;
  assert.ok(qa && typeof qa.weeklyRecommendations === 'function');
  const today = new Date().toISOString().slice(0,10);
  const recommendations = qa.weeklyRecommendations({
    recovery:[{
      date:today,
      sleep:3,
      water:2,
      meals:1,
      discomfort:7,
      energy:2,
      supported:1,
      mood:'Need support today'
    }]
  });
  assert.strictEqual(recommendations.length,3);
  assert.ok(recommendations.some(r => /rest/i.test(r[0])));
  assert.ok(recommendations.some(r => /Village|support/i.test(r[0] + ' ' + r[1])));
  assert.ok(recommendations.some(r => /water|gentler/i.test(r[0] + ' ' + r[1])));

  // Weekly letter must be personalized rather than fixed boilerplate.
  localStorage.setItem('nurturemom.gentle.steps.v1', JSON.stringify([{date:today,minutes:12}]));
  const letter = qa.weeklyLetterParts({
    profile:{name:'Amina Example'},
    recovery:[{date:today,sleep:4,supported:2,mood:'Need support today'}]
  });
  assert.strictEqual(letter.name,'Amina');
  assert.ok(/checked in 1 time/i.test(letter.body));
  assert.ok(/hard moments/i.test(letter.body));
  assert.ok(/12 minute/i.test(letter.body));

  console.log('NurtureMom Plus behavioral acceptance tests passed.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
