// NurtureMom runtime configuration. Keep secrets out of this file.
window.NURTUREMOM_API_BASE = window.NURTUREMOM_API_BASE || '';

// Load production upgrades after the main page has finished defining its UI functions.
window.addEventListener('DOMContentLoaded', () => {
  const bridge = document.createElement('script');
  bridge.src = 'supabase-bridge.js?v=20260916-1';
  bridge.defer = true;
  bridge.onload = () => {
    const runtime = document.createElement('script');
    runtime.src = 'runtime-upgrade.js?v=20260916-2';
    runtime.defer = true;
    runtime.onload = () => {
      const premium = document.createElement('script');
      premium.src = 'premium-checkin.js?v=20260916-1';
      premium.defer = true;
      premium.onload = () => {
        const weeklyCare = document.createElement('script');
        weeklyCare.src = 'weekly-care.js?v=20260916-1';
        weeklyCare.defer = true;
        weeklyCare.onload = () => {
          const companion = document.createElement('script');
          companion.src = 'ai-companion.js?v=20260917-1';
          companion.defer = true;
          document.body.appendChild(companion);
        };
        document.body.appendChild(weeklyCare);
      };
      document.body.appendChild(premium);
    };
    document.body.appendChild(runtime);
  };
  document.body.appendChild(bridge);
}, { once: true });

// Phase 2 preview modules. These are additive and preserve the approved
// production runtime while the Care Engine and Find My Circle are tested.
window.addEventListener('DOMContentLoaded', () => {
  const careEngine = document.createElement('script');
  careEngine.src = 'care-engine.js?v=20260918-preview-1';
  careEngine.defer = true;
  careEngine.onload = () => {
    const community = document.createElement('script');
    community.src = 'community-prototype.js?v=20260918-preview-1';
    community.defer = true;
    document.body.appendChild(community);
  };
  document.body.appendChild(careEngine);
}, { once: true });
