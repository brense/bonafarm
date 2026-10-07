import { useCallback, useMemo } from 'react'
import { Stack, Typography, Icon, Divider, Box } from '@mui/material'
import CardButtonWithIcon from '../components/CardButtonWithIcon'
import { useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import CustomAutocomplete from '../components/CustomAutocomplete'
import { useIcon, useQRScanner, useTitle } from '../App'
import { useSubscribeCollection } from '../hooks/firestore'

export default function Home() {
  useTitle(null)
  useIcon(null)
  const navigate = useNavigate()
  const feeds = useSubscribeCollection<{ name: string, hidden?: boolean }>('feeds')
  const visibleFeeds = useMemo(() => feeds.filter(f => f.hidden !== true), [feeds])
  const qrScanner = useQRScanner()

  const handleSelectFeed = useCallback((feed: { id: string } | null) => {
    feed?.id && navigate(`/feed/${feed?.id}`)
  }, [navigate])

  return <>
    <CenteredContent>
      <Stack direction="column" gap={2}>
        <CardButtonWithIcon onClick={() => qrScanner.show()} color="secondary">
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
          options={visibleFeeds}
          idKey="id"
          labelKey="name"
          noOptionsText="Niets gevonden..."
        />
      </Stack>
    </CenteredContent>
  </>
}
