import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material'
import { useMemo, type PropsWithChildren } from 'react'
import { useBranding } from './branding/useBranding.ts'

export default function ThemeProvider({ children }: PropsWithChildren) {
  const { branding } = useBranding()
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: branding.mode,
          primary: { main: branding.primaryColor },
          secondary: { main: branding.secondaryColor },
        },
        components: {
          MuiTextField: { defaultProps: { variant: 'filled' } },
        },
      }),
    [branding.mode, branding.primaryColor, branding.secondaryColor],
  )
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
