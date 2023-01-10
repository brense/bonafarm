import { Box, Button, Card, CardActions, CardContent, CardHeader, Divider, Icon, TextField, Typography } from '@mui/material'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { AuthProvider, getAuth, GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from 'firebase/auth'
import GoogleIcon from '../assets/icons/GoogleIcon'

const auth = getAuth()
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const actionCodeSettings = {
  url: window.location.href.replace(window.location.pathname, '/'),
  handleCodeInApp: true
}

function validateEmail(email: string) {
  return emailRegex.test(String(email).toLowerCase()) ? null : 'Dit is geen correct e-mailadres'
}

export default function Singin() {
  const inputRef = useRef<HTMLInputElement>()
  const navigate = useNavigate()
  const match = useMatch('/signin/verify')
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const data = new FormData(e.target as HTMLFormElement)
    const email = data.get('email') as string || ''
    const isInvalid = validateEmail(email)
    if (!isInvalid) {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      localStorage.setItem('emailForSignIn', email)
      navigate('/signin/verify')
    } else {
      setEmailError(isInvalid)
    }
  }, [navigate])

  const handleAuthProviderSignin = useCallback(async (provider: AuthProvider) => {
    await signInWithPopup(auth, provider)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
    {match ? <Card sx={{ maxWidth: 300 }}>
      <CardHeader title="E-mail verstuurd!" />
      <CardContent>Er is een login link gestuurd naar je e-mailadres.</CardContent>
      <CardActions><Button onClick={() => navigate('/signin')}><Icon>chevron_left</Icon>&nbsp;&nbsp;Terug</Button></CardActions>
    </Card> : <Card sx={{ maxWidth: 300 }} component="form" onSubmit={handleSubmit}>
      <CardHeader title="Welkom!" />
      <CardContent>
        <Typography variant="subtitle1">Aanmelden met e-mail</Typography><Typography variant="body2" gutterBottom>Er wordt een login link gestuurd<br />naar je e-mailadres.</Typography>
        <TextField label="E-mail" name="email" type="email" inputRef={inputRef} variant="filled" error={Boolean(emailError)} helperText={emailError || undefined} fullWidth />
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <Button type="submit"><Icon>mail</Icon>&nbsp;&nbsp;Verstuur link</Button>
      </CardActions>
      <Divider><Typography variant="button" color="textSecondary">Of</Typography></Divider>
      <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button size="large" variant="contained" onClick={() => handleAuthProviderSignin(new GoogleAuthProvider())}><GoogleIcon />&nbsp;&nbsp;Login met Google</Button>
      </CardContent>
    </Card>}
  </Box>
}
