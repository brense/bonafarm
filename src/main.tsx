import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import AuthProvider from './auth/AuthProvider.tsx'
import OrgBranding from './branding/OrgBranding.tsx'
import { registerServiceWorker } from './lib/pwa.ts'
import OrgProvider from './org/OrgProvider.tsx'
import ThemeProvider from './ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OrgProvider>
        <OrgBranding>
          <ThemeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </OrgBranding>
      </OrgProvider>
    </AuthProvider>
  </StrictMode>,
)

registerServiceWorker()
