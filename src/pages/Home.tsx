import { useState } from 'react'
import { Stack, Card, Typography, Icon } from '@mui/material'
import CardButtonWithIcon from '../components/CardButtonWithIcon'
import QrReaderDialog from '../components/QrReaderDialog'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()

  return <Card sx={{ width: '100%', height: '100%', maxWidth: 380, maxHeight: 760 }}>
    <Stack direction="column" gap={2} sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <QrReaderDialog open={showScanner} onClose={() => setShowScanner(false)} />
      <CardButtonWithIcon onClick={() => setShowScanner(true)} color="primary">
        <Icon fontSize="large">qr_code</Icon>
        <Typography variant="h6">Scan QR Code</Typography>
      </CardButtonWithIcon>
      <CardButtonWithIcon onClick={() => navigate('/voorraad')}>
        <Icon fontSize="large">list</Icon>
        <Typography variant="h6">Alle voorraad bekijken</Typography>
      </CardButtonWithIcon>
    </Stack>
  </Card>
}
