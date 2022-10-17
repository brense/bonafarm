import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, ApolloClientProvider } from './config'
import App from './App'

const rootContainer = document.getElementById('root')

const root = createRoot(rootContainer!)
root.render(<React.StrictMode>
  <BrowserRouter>
    <ThemeProvider>
      <ApolloClientProvider>
        <App />
      </ApolloClientProvider>
    </ThemeProvider>
  </BrowserRouter>
</React.StrictMode>)
