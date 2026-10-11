import { Avatar } from '@mui/material'
import { useState } from 'react'
import type { Storage } from '../model/types.ts'

/** Storage picture; falls back to its colour, then to a grey square. */
export default function StorageAvatar({ storage, size = 48 }: { storage: Pick<Storage, 'name' | 'color' | 'image'>; size?: number }) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = !!storage.image && failedImage !== storage.image
  return (
    <Avatar
      variant="rounded"
      src={showImage ? storage.image : undefined}
      alt=""
      slotProps={{ img: { loading: 'lazy', onError: () => setFailedImage(storage.image ?? null) } }}
      sx={{
        width: size,
        height: size,
        borderRadius: '8px',
        flexShrink: 0,
        bgcolor: storage.color || 'action.disabledBackground',
      }}
    >
      {null}
    </Avatar>
  )
}
