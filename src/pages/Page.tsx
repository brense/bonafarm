import { Container, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface Props extends PropsWithChildren {
  title: string
}

/** Common page frame: title and content width. */
export default function Page({ title, children }: Props) {
  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      {children}
    </Container>
  )
}
