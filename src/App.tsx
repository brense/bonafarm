import { Route, Routes } from 'react-router'
import SignInPage from './auth/SignInPage.tsx'
import { useAuth } from './auth/useAuth.ts'
import OrgDataProvider from './org/OrgDataProvider.tsx'
import { useOrg } from './org/useOrg.ts'
import LeveringPage from './pages/LeveringPage.tsx'
import MuterenPage from './pages/MuterenPage.tsx'
import StoragePage from './pages/StoragePage.tsx'
import VoorraadPage from './pages/VoorraadPage.tsx'
import AppShell from './shell/AppShell.tsx'
import Splash from './shell/Splash.tsx'
import StatusPage from './shell/StatusPage.tsx'

export default function App() {
  const { user, loading } = useAuth()
  const { status } = useOrg()

  if (loading) return <Splash />
  if (!user) return <SignInPage />
  if (status === 'loading') return <Splash />
  if (status === 'none') {
    return (
      <StatusPage
        title="Geen organisatie"
        text="Je account is nog aan geen enkele organisatie gekoppeld. Vraag een beheerder om je toe te voegen."
      />
    )
  }
  if (status === 'denied') {
    return <StatusPage title="Geen toegang" text="Je bent geen lid van deze organisatie." />
  }

  return (
    <OrgDataProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/voorraad/*" element={<VoorraadPage />} />
          <Route path="/levering/*" element={<LeveringPage />} />
          <Route path="/muteren" element={<MuterenPage />} />
          <Route path="/muteren/:storageId" element={<StoragePage />} />
          <Route path="*" element={<VoorraadPage />} />
        </Route>
      </Routes>
    </OrgDataProvider>
  )
}
