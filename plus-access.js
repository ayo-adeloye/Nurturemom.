(() => {
  const SUPABASE_URL = 'https://ocorbzbkzfdmurolngdf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unerunySitlxOS8BLKyboA_z1vNhY5W';
  const PREVIEW = window.NURTUREMOM_PLUS_PREVIEW === true;
  const CHECKINS = 'nurturemom_plus_checkins';
  const MOVEMENT = 'nurturemom_plus_movement';
  const MOM_MOMENTS = 'nurturemom_plus_mom_moments';
  const watched = new Set([CHECKINS, MOVEMENT, MOM_MOMENTS]);
  const state = window.NURTUREMOM_PLUS_STATE = {
    ready: false,
    preview: PREVIEW,
    signedIn: false,
    email: '',
    plan: 'free',
    plusAccess: false,
    founderAccess: false,
    entitled: false,
    allowed: PREVIEW,
    syncing: false,
    lastSyncAt: null,
    error: ''
  };

  let client = null;
  let session = null;
  let suppressSync = false;
  let resolveReady;
  window.NURTUREMOM_PLUS_READY = new Promise((resolve) => { resolveReady = resolve; });

  function emit() {
    window.dispatchEvent(new CustomEvent('nurturemom:plus-state', { detail: { ...state } }));
  }

  function setState(patch) {
    Object.assign(state, patch);
    emit();
  }

  function safeRows(key) {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function latestByDate(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!row?.date) continue;
      const current = map.get(row.date);
      const currentAt = current?.created_at ? Date.parse(current.created_at) : 0;
      const rowAt = row?.created_at ? Date.parse(row.created_at) : 0;
      if (!current || rowAt >= currentAt) map.set(row.date, row);
    }
    return [...map.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async function hydrateFromCloud() {
    if (!client || !session || !state.entitled) return;
    setState({ syncing: true, error: '' });
    try {
      const { data, error } = await client
        .from('nm_plus_activity')
        .select('kind,activity_date,payload,created_at')
        .eq('user_id', session.user.id)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(400);
      if (error) throw error;

      const cloud = { checkin: [], movement: [], mom_moment: [] };
      for (const row of data || []) {
        const payload = { ...(row.payload || {}) };
        payload.date = payload.date || row.activity_date;
        payload.created_at = payload.created_at || row.created_at;
        if (cloud[row.kind]) cloud[row.kind].push(payload);
      }

      suppressSync = true;
      const mergedCheckins = latestByDate([...safeRows(CHECKINS), ...cloud.checkin]).slice(0, 90);
      const mergedMovement = latestByDate([...safeRows(MOVEMENT), ...cloud.movement]).slice(0, 120);
      const mergedMom = latestByDate([...safeRows(MOM_MOMENTS), ...cloud.mom_moment]).slice(0, 90);
      localStorage.setItem(CHECKINS, JSON.stringify(mergedCheckins));
      localStorage.setItem(MOVEMENT, JSON.stringify(mergedMovement));
      localStorage.setItem(MOM_MOMENTS, JSON.stringify(mergedMom));
      suppressSync = false;
      setState({ syncing: false, lastSyncAt: new Date().toISOString() });
    } catch (e) {
      suppressSync = false;
      setState({ syncing: false, error: e?.message || 'Cloud sync is temporarily unavailable.' });
    }
  }

  async function refreshAccess(nextSession = session) {
    session = nextSession || null;
    if (!session) {
      setState({
        signedIn: false, email: '', plan: 'free', plusAccess: false,
        founderAccess: false, entitled: false, allowed: PREVIEW, error: ''
      });
      return;
    }

    try {
      const { data, error } = await client.rpc('nm_plus_access');
      if (error) throw error;
      const entitlement = data || {};
      const founderAccess = entitlement.founder_access === true;
      const plusAccess = entitlement.plus_access === true || entitlement.plan === 'plus';
      const entitled = founderAccess || plusAccess;
      setState({
        signedIn: true,
        email: session.user?.email || '',
        plan: entitlement.plan || (entitled ? 'plus' : 'free'),
        plusAccess,
        founderAccess,
        entitled,
        allowed: entitled || PREVIEW,
        error: ''
      });
      if (entitled) await hydrateFromCloud();
    } catch (e) {
      setState({
        signedIn: true,
        email: session.user?.email || '',
        allowed: PREVIEW,
        error: e?.message || 'We could not verify Plus access yet.'
      });
    }
  }

  async function cloudSave(kind, payload) {
    if (!client || !session || !state.entitled || !payload) return false;
    const activityDate = payload.date || new Date().toISOString().slice(0, 10);
    try {
      setState({ syncing: true, error: '' });
      const { error } = await client.from('nm_plus_activity').insert({
        user_id: session.user.id,
        kind,
        activity_date: activityDate,
        payload
      });
      if (error) throw error;
      setState({ syncing: false, lastSyncAt: new Date().toISOString() });
      return true;
    } catch (e) {
      setState({ syncing: false, error: e?.message || 'This entry is saved on this device and will sync later.' });
      return false;
    }
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (suppressSync || !watched.has(key)) return;
    try {
      const rows = JSON.parse(value || '[]');
      const latest = Array.isArray(rows) ? rows[0] : null;
      if (!latest) return;
      const kind = key === CHECKINS ? 'checkin' : key === MOVEMENT ? 'movement' : 'mom_moment';
      queueMicrotask(() => cloudSave(kind, latest));
    } catch (_) {}
  };

  window.nmPlusCloudSave = cloudSave;
  window.nmPlusRefreshAccess = () => refreshAccess(session);
  window.nmPlusGetState = () => ({ ...state });
  window.nmPlusSignIn = async (email, password) => {
    if (!client) throw new Error('Account connection is still loading.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshAccess(data.session);
    return { ...state };
  };
  window.nmPlusSignOut = async () => {
    if (!client) return;
    await client.auth.signOut();
    await refreshAccess(null);
  };

  async function init() {
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.116.0');
      client = mod.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      window.nmPlusSupabase = client;
      const { data } = await client.auth.getSession();
      await refreshAccess(data?.session || null);
      client.auth.onAuthStateChange((_event, nextSession) => {
        setTimeout(() => refreshAccess(nextSession), 0);
      });
    } catch (e) {
      setState({ error: e?.message || 'Account connection is temporarily unavailable.', allowed: PREVIEW });
    } finally {
      state.ready = true;
      emit();
      resolveReady?.({ ...state });
    }
  }

  init();
})();