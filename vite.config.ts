import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import apolloServerPlugin from 'vite-plugin-apollo-server'
import mkcert from 'vite-plugin-mkcert'
import { schema } from './src/_makeSchema'

const { PORT = 3000 } = process.env

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: Number(PORT),
    open: true
  },
  build: {
    outDir: 'dist',
  },
  plugins: [react(), eslint(), mkcert(), apolloServerPlugin({ schema })]
})
