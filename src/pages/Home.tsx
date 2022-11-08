import { useState } from 'react'
import { QrReader } from 'react-qr-reader'
import { Stack, Box, Button } from '@mui/material'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)

  return <Stack direction="column" sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
    {showScanner &&
      <Box sx={{ width: 300, height: 300 }}>
        <QrReader
          onResult={(result, error) => {
            console.log('QR', result)
          }}
          constraints={{ facingMode: 'environment' }}
        />
      </Box>
    }
    {!showScanner && <Button onClick={() => setShowScanner(true)}>Scan QR Code</Button>}
    {!showScanner && <Button>Alle voorraad bekijken</Button>}
  </Stack>
}
