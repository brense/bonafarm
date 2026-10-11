import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth } from '../lib/firebase.ts'
import { useBranding } from '../branding/useBranding.ts'

/** Maps a Firebase auth error code to a Dutch message, or null when nothing should be shown. */
// oxlint-disable-next-line react/only-export-components -- exported for tests
export function signInErrorMessage(code: string): string | null {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail of wachtwoord klopt niet.'
    case 'auth/invalid-email':
      return 'Dit is geen geldig e-mailadres.'
    case 'auth/too-many-requests':
      return 'Te veel pogingen. Probeer het later opnieuw.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/network-request-failed':
      return 'Geen verbinding. Controleer je internet.'
    default:
      return 'Inloggen is mislukt. Probeer het opnieuw.'
  }
}

type Pending = 'password' | 'google' | null

export default function SignInPage() {
  const { branding } = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: Exclude<Pending, null>, action: () => Promise<unknown>) {
    setPending(kind)
    setError(null)
    try {
      await action()
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? ''
      setError(signInErrorMessage(code))
    } finally {
      setPending(null)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    void run('password', () => signInWithEmailAndPassword(auth, email, password))
  }

  function handleGoogle() {
    if (pending) return
    void run('google', () => signInWithPopup(auth, new GoogleAuthProvider()))
  }

  const busy = pending !== null

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', py: 3 }}>
      <Paper sx={{ width: '100%', p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1">
              {branding.appName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log in om verder te gaan
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
              fullWidth
            />
            <TextField
              label="Wachtwoord"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
              {pending === 'password' ? <CircularProgress size={20} color="inherit" /> : 'Inloggen'}
            </Button>
          </Stack>
          <Divider>of</Divider>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            disabled={busy}
            onClick={handleGoogle}
            startIcon={pending === 'google' ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          >
            Inloggen met Google
          </Button>
        </Stack>
      </Paper>
    </Container>
  )
}
