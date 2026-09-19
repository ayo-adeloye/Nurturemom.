(() => {
  'use strict';

  const FEATURE = 'ask-nurturemom';
  const paused = true;
  if (!paused) return;

  window.NurtureMomFeatures = Object.freeze({
    ...(window.NurtureMomFeatures || {}),
    askNurtureMom: false
  });

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function hideAskNurtureMom() {
    document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      const text = normalize(el.textContent);
      if (/Ask NurtureMom/i.test(text) || (/PRIVATE COMPANION/i.test(text) && /NurtureMom/i.test(text))) {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('data-nm-paused-feature', FEATURE);
        if ('tabIndex' in el) el.tabIndex = -1;
      }
    });

    document.querySelectorAll('.companion-dialog').forEach((dialog) => {
      dialog.hidden = true;
      dialog.setAttribute('aria-hidden', 'true');
      dialog.setAttribute('data-nm-paused-feature', FEATURE);
    });

    document.querySelectorAll('.plus-profile-entry small').forEach((el) => {
      if (/private companion/i.test(normalize(el.textContent))) {
        el.textContent = 'Care plans, movement and celebrations';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideAskNurtureMom, { once: true });
  } else {
    hideAskNurtureMom();
  }

  const observer = new MutationObserver(hideAskNurtureMom);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.NurtureMomPausedFeatures = Object.freeze({
    askNurtureMom: true,
    reason: 'Paused for later reactivation'
  });
})();
