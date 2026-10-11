import { createTheme } from '@mui/material/styles'
import { lightBlue, pink } from '@mui/material/colors'

// Same palette as the current app: dark mode, light blue primary, pink secondary.
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: lightBlue,
    secondary: pink,
  },
})
