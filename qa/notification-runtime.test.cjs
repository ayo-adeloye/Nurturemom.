const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class StorageMock {
  constructor(){ this.map = new Map(); }
  getItem(k){ return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k,v){ this.map.set(String(k), String(v)); }
  removeItem(k){ this.map.delete(String(k)); }
}

function response(body, status=200){
  return {
    ok: status >= 200 && status < 300,
    status,
    async json(){ return body; }
  };
}

(async()=>{
  const localStorage = new StorageMock();
  const sessionStorage = new StorageMock();
  const future = Math.floor(Date.now()/1000)+3600;
  localStorage.setItem('nurturemom.supabase.session', JSON.stringify({
    access_token:'qa-token',
    refresh_token:'qa-refresh',
    expires_at:future,
    user:{id:'qa-user'}
  }));
  localStorage.setItem('nurturemom.v1', JSON.stringify({
    version:1,
    profile:{
      reminders:true,
      notifications:true,
      reminderTime:'08:30'
    }
  }));

  const calls=[];
  let activeSubscription = null;
  let backendRoutine = null;
  let unsubscribed = false;

  const subscription = {
    endpoint:'https://fcm.googleapis.com/fcm/send/qa-browser',
    toJSON(){
      return {
        endpoint:this.endpoint,
        expirationTime:null,
        keys:{auth:'A'.repeat(22),p256dh:'B'.repeat(87)}
      };
    },
    async unsubscribe(){ unsubscribed=true; activeSubscription=null; return true; }
  };

  const registration = {
    pushManager:{
      async getSubscription(){ return activeSubscription; },
      async subscribe(){ activeSubscription=subscription; return subscription; }
    }
  };

  const navigator = {
    serviceWorker:{
      async register(path, opts){
        calls.push({type:'sw-register',path,scope:opts&&opts.scope});
        return registration;
      },
      ready:Promise.resolve(registration)
    }
  };

  const Notification = {
    permission:'granted',
    async requestPermission(){ return 'granted'; }
  };

  const paragraphs=[];
  const document = {
    readyState:'complete',
    documentElement:{},
    querySelectorAll(selector){ return selector==='p' ? paragraphs : []; },
    addEventListener(){}
  };

  async function fetchMock(url, options={}){
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({type:'fetch',url,body,headers:options.headers||{}});

    if(url.includes('/functions/v1/nm-notifications')){
      assert.strictEqual(body.action,'config');
      return response({publicKey:'B'.repeat(88)});
    }

    if(url.includes('/rest/v1/rpc/nm_push_register')){
      assert.strictEqual(body.s.endpoint,subscription.endpoint);
      return response(null);
    }

    if(url.includes('/rest/v1/rpc/nm_push_remove')){
      assert.strictEqual(body.e,subscription.endpoint);
      return response(null);
    }

    if(url.includes('/functions/v1/nm-care-routines')){
      if(body.action==='list') return response({routines:backendRoutine?[backendRoutine]:[]});
      if(body.action==='create'){
        backendRoutine={
          id:'routine-1',
          title:body.title,
          enabled:true,
          reminder_time:body.reminder_time,
          timezone:body.timezone
        };
        return response({routine:backendRoutine},201);
      }
      if(body.action==='update'){
        backendRoutine={...backendRoutine,...body};
        return response({routine:backendRoutine});
      }
      if(body.action==='toggle'){
        backendRoutine={...backendRoutine,enabled:body.enabled};
        return response({routine:backendRoutine});
      }
    }

    throw new Error('Unexpected fetch: '+url);
  }

  const context={
    window:{},
    document,
    navigator,
    Notification,
    PushManager:function(){},
    Storage:StorageMock,
    localStorage,
    sessionStorage,
    MutationObserver:function(){ this.observe=function(){}; },
    fetch:fetchMock,
    setTimeout,
    clearTimeout,
    console,
    JSON,Math,Number,String,Array,Object,Promise,Date,Intl,Uint8Array,
    atob:s=>Buffer.from(s,'base64').toString('binary')
  };
  Object.assign(context.window,{
    Notification,
    PushManager:context.PushManager,
    localStorage,
    sessionStorage,
    navigator
  });

  vm.createContext(context);
  vm.runInContext(fs.readFileSync('notification-runtime.js','utf8'),context,{filename:'notification-runtime.js'});

  await new Promise(r=>setTimeout(r,260));

  assert.ok(calls.some(c=>c.type==='sw-register' && c.path==='/sw.js'));
  assert.ok(calls.some(c=>c.type==='fetch' && c.url.includes('/functions/v1/nm-notifications') && c.body.action==='config'));
  assert.ok(calls.some(c=>c.type==='fetch' && c.url.includes('/rest/v1/rpc/nm_push_register')));
  assert.ok(calls.some(c=>c.type==='fetch' && c.url.includes('/functions/v1/nm-care-routines') && c.body.action==='create'));
  assert.ok(backendRoutine);
  assert.strictEqual(backendRoutine.reminder_time,'08:30');
  assert.strictEqual(backendRoutine.enabled,true);

  const nextState={
    version:1,
    profile:{reminders:true,notifications:false,reminderTime:'08:30'}
  };
  localStorage.setItem('nurturemom.v1',JSON.stringify(nextState));
  await new Promise(r=>setTimeout(r,180));

  assert.ok(calls.some(c=>c.type==='fetch' && c.url.includes('/rest/v1/rpc/nm_push_remove')));
  assert.strictEqual(unsubscribed,true);
  assert.strictEqual(backendRoutine.enabled,false);

  console.log('NurtureMom background notification runtime acceptance passed.');
})().catch(err=>{
  console.error(err);
  process.exit(1);
});
