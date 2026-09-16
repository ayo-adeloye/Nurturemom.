// NurtureMom runtime configuration. Keep secrets out of this file.
window.NURTUREMOM_API_BASE = window.NURTUREMOM_API_BASE || '';

// Load production upgrades after the main page has finished defining its UI functions.
window.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = 'runtime-upgrade.js?v=20260916-1';
  script.defer = true;
  document.body.appendChild(script);
}, { once: true });
