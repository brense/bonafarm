import { Container } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface Props extends PropsWithChildren {
  title: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false
}

/** Common page frame: content width; the title is only the accessible name of the section. */
export default function Page({ title, maxWidth = 'md', children }: Props) {
  return (
    <Container maxWidth={maxWidth} disableGutters={maxWidth === false} component="section" aria-label={title} sx={{ py: 2 }}>
      {children}
    </Container>
  )
}
