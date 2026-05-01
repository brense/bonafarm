import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './config'
import App from './App'
import './index.css'
import ConfirmDialogProvider from './components/ConfirmDialog'

const rootContainer = document.getElementById('root')

const root = createRoot(rootContainer!)
root.render(<React.StrictMode>
  <ThemeProvider>
    <BrowserRouter>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </BrowserRouter>
  </ThemeProvider>
</React.StrictMode>)
