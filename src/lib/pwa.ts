/**
 * Registers the Serwist service worker. Only in production builds: in dev the
 * worker is not bundled (see devOptions in vite.config.ts) and would only get
 * in the way of hot reloading.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    const { getSerwist } = await import('virtual:serwist')
    const serwist = await getSerwist()
    serwist?.addEventListener('installed', () => {
      console.info('[pwa] service worker installed')
    })
    await serwist?.register()
  })
}
