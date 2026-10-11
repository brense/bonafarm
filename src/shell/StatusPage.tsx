import { Button, Container, Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth.ts'
import { useBranding } from '../branding/useBranding.ts'

interface Props {
  title: string
  text: string
}

/** Full-page message for the no-organisation and no-access states. */
export default function StatusPage({ title, text }: Props) {
  const { branding } = useBranding()
  const { user, signOut } = useAuth()
  return (
    <Container maxWidth="xs" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
      <Stack spacing={2} sx={{ width: '100%', py: 4 }}>
        <Typography variant="overline" color="text.secondary">
          {branding.appName}
        </Typography>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        <Typography color="text.secondary">{text}</Typography>
        {user && (
          <Typography variant="body2" color="text.secondary">
            Ingelogd als {user.email ?? user.displayName}
          </Typography>
        )}
        <Button variant="outlined" size="large" onClick={() => void signOut()}>
          Uitloggen
        </Button>
      </Stack>
    </Container>
  )
}
