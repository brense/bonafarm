import { useState, useCallback } from 'react'
import { Stack, Typography, Icon, Divider, Box } from '@mui/material'
import CardButtonWithIcon from '../components/CardButtonWithIcon'
import QrReaderDialog from '../components/QrReaderDialog'
import { useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import CustomAutocomplete from '../components/CustomAutocomplete'
import { Feed, useFeed } from '../hooks/firebase'
import { useIcon, useTitle } from '../App'

export default function Home() {
  useTitle(null)
  useIcon(null)
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()
  const { data: itemOptions } = useFeed()

  const handleScannerClose = useCallback(() => {
    setShowScanner(false)
    window.location.href = `${window.location.protocol}//${window.location.host}/`
  }, [])

  const handleSelectFeed = useCallback((feed: Feed | null) => {
    feed?.id && navigate(`/feed/${feed?.id}`)
  }, [navigate])

  return <>
    <CenteredContent>
      <Stack direction="column" gap={2}>
        <QrReaderDialog open={showScanner} onClose={handleScannerClose} />
        <CardButtonWithIcon onClick={() => setShowScanner(true)} color="secondary">
          <Icon fontSize="large">qr_code_scanner</Icon>
          <Typography variant="h6">Scan QR Code</Typography>
        </CardButtonWithIcon>
        <CardButtonWithIcon onClick={() => navigate('/stock')}>
          <Icon fontSize="large">list</Icon>
          <Typography variant="h6">Alle voorraad bekijken</Typography>
        </CardButtonWithIcon>
        <Box><Divider><Typography color="textSecondary" variant="button">Of</Typography></Divider></Box>
        <CustomAutocomplete
          label="Zoek op voertype"
          onChange={handleSelectFeed}
          options={itemOptions}
          idKey="id"
          labelKey="name"
          noOptionsText="Niets gevonden..."
        />
      </Stack>
    </CenteredContent>
  </>
}
