// Service-worker updates: check on load, when the app comes to the foreground, and hourly. Offer a reload when one is ready.
import { el } from './lib/dom';

export function setupUpdates() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (document.querySelector('.update-banner')) return;
        const b = el('div', { class: 'update-banner' });
        b.innerHTML = `<span>New version ready</span><button class="btn orange" id="upd">Update</button>`;
        b.querySelector('#upd')!.addEventListener('click', () => { b.textContent = 'Updating…'; update(true); });
        document.body.append(b);
      },
      onRegisteredSW(_url, reg) {
        if (!reg) return;
        const check = () => reg.update().catch(() => undefined);
        setInterval(check, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      },
    });
  }).catch(() => undefined);
}
