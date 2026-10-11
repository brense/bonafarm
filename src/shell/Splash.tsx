import { Box, CircularProgress } from '@mui/material'

export default function Splash() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} role="status" aria-label="Laden">
      <CircularProgress />
    </Box>
  )
}
