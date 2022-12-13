import { useState, useCallback, useMemo } from 'react'
import { Stack, Typography, Icon, Divider, Box } from '@mui/material'
import CardButtonWithIcon from '../components/CardButtonWithIcon'
import QrReaderDialog from '../components/QrReaderDialog'
import { useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import { useAppBarContext } from '../App'
import CustomAutocomplete from '../components/CustomAutocomplete'
import { useStoragesQuery } from '../graphql'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()
  const { data } = useStoragesQuery({ fetchPolicy: 'no-cache' })
  const itemOptions = useMemo(() => data?.storages.reduce((arr, storage) => {
    storage.logs.filter(l => l.slug && l.title).forEach(({ slug, title }) => {
      if (arr.find(a => a.slug === slug)) return
      arr.push({ slug, title } as any)
    })
    return arr
  }, [] as Array<{ slug: string, title: string, inputValue?: string }>) || [], [data?.storages])

  useAppBarContext(() => ({ showLogo: true }))

  const handleScannerClose = useCallback(() => {
    setShowScanner(false)
    window.location.href = `${window.location.protocol}//${window.location.host}/`
  }, [])

  const handleSelectFeed = useCallback((feed: { slug: string } | null) => {
    feed?.slug && navigate(`/feed/${feed?.slug}`)
  }, [navigate])

  return <>
    <CenteredContent>
      <Stack direction="column" gap={2}>
        <QrReaderDialog open={showScanner} onClose={handleScannerClose} />
        <CardButtonWithIcon onClick={() => setShowScanner(true)} color="primary">
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
          idKey="slug"
          labelKey="title"
        />
      </Stack>
    </CenteredContent>
  </>
}
