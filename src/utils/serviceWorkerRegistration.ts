// Robust Service Worker Registration & Auto-Update Manager

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    // Old production workers on localhost must not serve stale Vite/React modules.
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let removed = false;
      for (const registration of registrations) {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        if (worker && new URL(worker.scriptURL).pathname === '/sw.js') {
          removed = await registration.unregister() || removed;
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('aura-monrovia-')).map(key => caches.delete(key)));
      }
      if (removed && navigator.serviceWorker.controller && new URL(navigator.serviceWorker.controller.scriptURL).pathname === '/sw.js') {
        window.location.reload();
      }
    })().catch(error => console.warn('Development cache cleanup failed:', error));
    return;
  }

  let refreshing = false;

  // Whenever a new service worker takes control (after code change), reload the app seamlessly
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('New AURA version activated — updating application...');
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('AURA Service Worker registered:', registration.scope);

      // Check if there is an updated worker waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Detect newly installed service workers
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New code version found. Activating immediately...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Periodically check for code updates (every 2 minutes)
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('Service worker background update check notice:', err);
        });
      }, 1000 * 60 * 2);

      // Check for code updates when the user re-opens or switches back to the app tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
