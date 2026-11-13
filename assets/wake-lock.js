// Screen Wake Lock is requested only by an explicit tap on an individual recipe page.
(() => {
  const button = document.getElementById('wake-toggle');
  const status = document.getElementById('wake-status');
  if (!button || !status) return;

  let desired = false;
  let lock = null;
  let busy = false;

  function display(message) {
    button.setAttribute('aria-pressed', String(desired && !!lock));
    button.textContent = lock ? 'Keep screen awake: On' : 'Keep screen awake: Off';
    status.textContent = message || (lock ? 'Screen will stay awake while this page is visible.' : 'Screen follows your phone settings.');
  }

  if (!('wakeLock' in navigator)) {
    button.disabled = true;
    status.textContent = 'Screen wake lock is not supported by this browser.';
    return;
  }

  async function acquire() {
    if (!desired || document.visibilityState !== 'visible' || lock || busy) return;
    busy = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      lock = sentinel;
      sentinel.addEventListener('release', () => {
        if (lock === sentinel) {
          lock = null;
          display(desired ? 'Screen wake lock paused. Reopen the page to retry.' : undefined);
        }
      });
      if (!desired) {
        lock = null;
        await sentinel.release();
      }
    } catch (error) {
      // Some devices deny wake locks in power saving mode or when not visible.
      status.textContent = 'Your browser or phone could not keep the screen awake.';
    } finally {
      busy = false;
      display(lock ? undefined : (desired ? 'Wake lock unavailable; normal screen timeout may apply.' : undefined));
    }
  }

  button.addEventListener('click', async () => {
    if (desired) {
      desired = false;
      const oldLock = lock;
      lock = null;
      if (oldLock) await oldLock.release();
      display();
    } else {
      desired = true;
      status.textContent = 'Requesting screen wake lock…';
      await acquire();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && desired) {
      acquire();
    } else if (document.visibilityState === 'hidden' && lock) {
      // Browsers normally release the lock automatically; explicitly release too.
      const oldLock = lock;
      lock = null;
      oldLock.release().catch(() => {});
      display('Screen wake lock paused while this page is hidden.');
    }
  });
  window.addEventListener('pagehide', () => {
    desired = false;
    if (lock) lock.release().catch(() => {});
    lock = null;
  });
  display();
})();
