import { Box } from '@mui/material'

export default function CenteredContent({ children }: React.PropsWithChildren<unknown>) {
  return <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</Box>
}
