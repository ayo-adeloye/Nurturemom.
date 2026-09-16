(() => {
  let attempts = 0;
  const expose = () => {
    attempts += 1;
    try {
      if (typeof nmSupabase !== 'undefined' && nmSupabase) {
        window.nmSupabase = nmSupabase;
        window.dispatchEvent(new CustomEvent('nurturemom:supabase-ready'));
        return;
      }
    } catch (_) {}
    if (attempts < 120) setTimeout(expose, 100);
  };
  expose();
})();
