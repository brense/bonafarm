import { ThemeProvider as MuiThemeProvider, CssBaseline, createTheme } from '@mui/material'
import { lightBlue, pink } from '@mui/material/colors'
import React from 'react'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: pink,
    secondary: lightBlue
  }
})

export default function ThemeProvider({ children }: React.PropsWithChildren<unknown>) {
  return <MuiThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </MuiThemeProvider>
}
