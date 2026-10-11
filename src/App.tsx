import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material'
import { Route, Routes } from 'react-router'
import { useBranding } from './branding/useBranding.ts'

function Home() {
  const { branding } = useBranding()
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {branding.appName}
      </Typography>
      <Typography color="text.secondary">
        Nieuwe versie in aanbouw. Voorraad, leveringen en bestellingen per organisatie.
      </Typography>
    </Container>
  )
}

export default function App() {
  const { branding } = useBranding()
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div">
            {branding.appName}
          </Typography>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Box>
  )
}
