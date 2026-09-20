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

  function normalizePlusAccount() {
    document.querySelectorAll('.plus-profile-entry').forEach((entry) => {
      const strong = entry.querySelector('strong');
      const small = entry.querySelector('small');
      if (strong && /NurtureMom Plus|Plus account/i.test(normalize(strong.textContent))) {
        strong.textContent = 'Plus account';
      }
      if (small) {
        small.textContent = 'Your Plus benefits are active on this account';
      }
      entry.setAttribute('aria-label', 'Open Plus benefits for this account');
      entry.hidden = true;
      entry.setAttribute('aria-hidden', 'true');
      entry.setAttribute('data-nm-plus-profile-status', 'navigation-only');
    });

    document.querySelectorAll('h1, h2, [data-slot="dialog-title"]').forEach((el) => {
      if (normalize(el.textContent) === 'NurtureMom Plus') {
        el.textContent = 'Your Plus benefits';
      }
    });
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

  function applyProductState() {
    normalizePlusAccount();
    hideAskNurtureMom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyProductState, { once: true });
  } else {
    applyProductState();
  }

  window.addEventListener('hashchange', applyProductState);
  window.addEventListener('nurturemom:session-changed', applyProductState);
  setTimeout(applyProductState, 500);
  setTimeout(applyProductState, 1500);

  window.NurtureMomPausedFeatures = Object.freeze({
    askNurtureMom: true,
    reason: 'Paused for later reactivation'
  });
})();
