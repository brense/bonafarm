import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import { nopeusVitePlugin } from 'nopeus'
import mkcert from 'vite-plugin-mkcert'
import { makeSchema } from './src/makeSchema'

const { PORT = 3000 } = process.env

const schema = makeSchema()

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: Number(PORT),
    open: true
  },
  build: {
    outDir: 'dist',
  },
  plugins: [react(), eslint(), mkcert(), nopeusVitePlugin({ schema })]
})
