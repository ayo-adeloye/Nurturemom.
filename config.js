// NurtureMom runtime configuration. Keep secrets out of this file.
window.NURTUREMOM_API_BASE = window.NURTUREMOM_API_BASE || '';

// Load production upgrades after the main page has finished defining its UI functions.
window.addEventListener('DOMContentLoaded', () => {
  const runtime = document.createElement('script');
  runtime.src = 'runtime-upgrade.js?v=20260916-2';
  runtime.defer = true;
  runtime.onload = () => {
    const premium = document.createElement('script');
    premium.src = 'premium-checkin.js?v=20260916-1';
    premium.defer = true;
    document.body.appendChild(premium);
  };
  document.body.appendChild(runtime);
}, { once: true });
