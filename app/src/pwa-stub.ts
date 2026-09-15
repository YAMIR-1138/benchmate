// Stand-in for virtual:pwa-register in the single-file build, which has no service worker.
export function registerSW(): (reload?: boolean) => Promise<void> { return async () => undefined; }
