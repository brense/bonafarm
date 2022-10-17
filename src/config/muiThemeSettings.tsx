import { ThemeProvider as MuiThemeProvider, CssBaseline, createTheme } from '@mui/material'
import { blue, pink } from '@mui/material/colors'
import React from 'react'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: blue,
    secondary: pink
  }
})

export default function ThemeProvider({ children }: React.PropsWithChildren<unknown>) {
  return <MuiThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </MuiThemeProvider>
}
