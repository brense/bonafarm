/// <reference types="vitest/config" />
import { serwist } from '@serwist/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Serves api/manifest.ts under the Vite dev server, so the dynamic manifest
 * works without `vercel dev`. Vercel runs the same file as a function.
 */
function devApiManifest(): Plugin {
  return {
    name: 'dev-api-manifest',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/manifest', async (req, res) => {
        const mod = (await server.ssrLoadModule('/api/manifest.ts')) as { GET: (r: Request) => Promise<Response> }
        const response = await mod.GET(new Request(`http://localhost${req.originalUrl ?? req.url ?? ''}`))
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    devApiManifest(),
    // The service worker is only built for real builds; Vitest runs without it.
    ...(mode === 'test'
      ? []
      : [
          serwist({
            swSrc: 'src/sw.ts',
            swDest: 'sw.js',
            globDirectory: 'dist',
            injectionPoint: 'self.__SW_MANIFEST',
            rollupFormat: 'iife',
            devOptions: { bundle: false },
          }),
        ]),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    // MUI dialogs render slowly in jsdom; the default 5 s flakes under load.
    testTimeout: 20000,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}))
