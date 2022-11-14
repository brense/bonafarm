import { useRef } from 'react'
import { QrReader, QrReaderProps } from 'react-qr-reader'

export default function QrReaderWrapper({ onResult, ...props }: QrReaderProps) {
  const scanResult = useRef('')
  return <QrReader
    onResult={(result, error) => {
      const { timestamp, ...rest } = result || {} as any
      if (result && scanResult.current !== JSON.stringify(rest)) {
        scanResult.current = JSON.stringify(rest)
        onResult && onResult(result, error)
      }
      if (error && onResult) {
        onResult(result, error)
      }
    }}
    {...props}
  />
}
