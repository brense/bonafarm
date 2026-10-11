import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { theme } from './theme.ts'

export default function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
