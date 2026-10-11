import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material'
import { Route, Routes } from 'react-router'

function Home() {
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Bonafarm
      </Typography>
      <Typography color="text.secondary">
        Nieuwe versie in aanbouw. Voorraad, leveringen en bestellingen per organisatie.
      </Typography>
    </Container>
  )
}

export default function App() {
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div">
            Bonafarm
          </Typography>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Box>
  )
}
