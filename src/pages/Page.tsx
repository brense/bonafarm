import { Container } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface Props extends PropsWithChildren {
  title: string
}

/** Common page frame: content width; the title is only the accessible name of the section. */
export default function Page({ title, children }: Props) {
  return (
    <Container maxWidth="md" component="section" aria-label={title} sx={{ py: 2 }}>
      {children}
    </Container>
  )
}
