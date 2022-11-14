import React from 'react'
import { Stack, Card, CardActionArea, ButtonProps } from '@mui/material'

export default function CardButtonWithIcon({ onClick, color, disableStack = false, children }: React.PropsWithChildren<Pick<ButtonProps, 'onClick' | 'color'> & { disableStack?: boolean }>) {
  return <Card sx={{ bgcolor: `${color}.dark` }}>
    <CardActionArea onClick={onClick}>
      {disableStack ? children : <Stack direction="row" gap={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, minWidth: 280 }}>
        {children}
      </Stack>}
    </CardActionArea>
  </Card>
}
