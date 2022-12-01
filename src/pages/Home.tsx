import { useState, useCallback } from 'react'
import { Stack, Typography, Icon } from '@mui/material'
import CardButtonWithIcon from '../components/CardButtonWithIcon'
import QrReaderDialog from '../components/QrReaderDialog'
import { useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import { useAppBarContext } from '../App'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()

  useAppBarContext(() => ({ showLogo: true }))

  const handleScannerClose = useCallback(() => {
    setShowScanner(false)
    window.location.href = `${window.location.protocol}//${window.location.host}/`
  }, [])

  return <>
    <CenteredContent>
      <Stack direction="column" gap={2}>
        <QrReaderDialog open={showScanner} onClose={handleScannerClose} />
        <CardButtonWithIcon onClick={() => setShowScanner(true)} color="primary">
          <Icon fontSize="large">qr_code</Icon>
          <Typography variant="h6">Scan QR Code</Typography>
        </CardButtonWithIcon>
        <CardButtonWithIcon onClick={() => navigate('/stock')}>
          <Icon fontSize="large">list</Icon>
          <Typography variant="h6">Alle voorraad bekijken</Typography>
        </CardButtonWithIcon>
      </Stack>
    </CenteredContent>
  </>
}
