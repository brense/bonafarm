import { Container } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface Props extends PropsWithChildren {
  title: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false
  /** No side gutters: for full-width tables. */
  flush?: boolean
}

/** Common page frame: content width; the title is only the accessible name of the section. */
export default function Page({ title, maxWidth = 'md', flush = false, children }: Props) {
  return (
    <Container maxWidth={maxWidth} disableGutters={flush} component="section" aria-label={title} sx={{ py: flush ? 0 : 2 }}>
      {children}
    </Container>
  )
}
