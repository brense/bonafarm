import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, ApolloClientProvider } from './config'
import App from './App'
import './index.css'
import ConfirmDialogProvider from './components/ConfirmDialog'

const rootContainer = document.getElementById('root')

const root = createRoot(rootContainer!)
root.render(<React.StrictMode>
  <ThemeProvider>
    <ApolloClientProvider>
      <BrowserRouter>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </BrowserRouter>
    </ApolloClientProvider>
  </ThemeProvider>
</React.StrictMode>)
