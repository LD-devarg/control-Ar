import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import DesktopLayout from './layouts/DesktopLayout.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'
import WhatsApp from './pages/WhatsApp.jsx'
import Landing from './pages/Landing.jsx'
import Agenda from './pages/Contacts.jsx'
import TipoCambio from './pages/TipoCambio.jsx'
import PautaDatabase from './pages/PautaDatabase.jsx'
import LandingConfig from './pages/LandingConfig.jsx'
import TabletLayout from './layouts/TabletLayout.jsx'
import MobileLayout from './layouts/MobileLayout.jsx'
import PautaKPI from './pages/PautaKPI.jsx'
import Health from './pages/Health.jsx'
import Tenant from './pages/Tenant.jsx'
import Users from './pages/Users.jsx'
import Organizaciones from './pages/Organizaciones.jsx'
import MetaEvents from './pages/MetaEvents.jsx'
import CRMWhatsApp from './pages/CRMWhatsApp.jsx'
import DemoApp from './pages/DemoApp.jsx'
import { canAccessPath, getDefaultPath } from './services/access'
import { getCurrentUser, initializeAuthSession } from './services/auth'

const MOBILE_MAX_WIDTH = 767
const TABLET_MAX_WIDTH = 1024

function isIpadDevice() {
  const userAgent = navigator.userAgent || ''
  const isiPadUA = /iPad/i.test(userAgent)
  const isiPadOSDesktopUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return isiPadUA || isiPadOSDesktopUA
}

function getViewportType() {
  const width = window.innerWidth

  if (isIpadDevice()) return 'tablet'
  if (width <= MOBILE_MAX_WIDTH) return 'mobile'
  if (width <= TABLET_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

function GuardedRoute({ path, element }) {
  const currentUser = getCurrentUser()
  if (!currentUser) return <Navigate to="/" replace />
  if (!canAccessPath(path, currentUser)) {
    return <Navigate to={getDefaultPath(currentUser)} replace />
  }
  return element
}

function LoginRoute() {
  const currentUser = getCurrentUser()
  if (currentUser) {
    return <Navigate to={getDefaultPath(currentUser)} replace />
  }
  return <Login />
}

function App() {
  const [viewportType, setViewportType] = useState(() => getViewportType())
  const [, setAuthVersion] = useState(0)

  useEffect(() => {
    const onResize = () => setViewportType(getViewportType())

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    initializeAuthSession()

    const syncAuthState = () => setAuthVersion((value) => value + 1)
    window.addEventListener('auth:user-changed', syncAuthState)
    return () => window.removeEventListener('auth:user-changed', syncAuthState)
  }, [])

  const ActiveLayout =
    viewportType === 'mobile'
      ? MobileLayout
      : viewportType === 'tablet'
        ? TabletLayout
        : DesktopLayout

  return (
    <>
      <div>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
          <Route element={<ActiveLayout />}>
            <Route path="/home" element={<GuardedRoute path="/home" element={<Home />} />} />
            <Route path="/stats" element={<GuardedRoute path="/stats" element={<Stats />} />} />
            <Route path="/whatsapp" element={<GuardedRoute path="/whatsapp" element={<WhatsApp />} />} />
            <Route path="/crm" element={<GuardedRoute path="/crm" element={<CRMWhatsApp />} />} />
            <Route path="/contacts" element={<GuardedRoute path="/contacts" element={<Agenda />} />} />
            <Route path="/landing-config" element={<GuardedRoute path="/landing-config" element={<LandingConfig />} />} />
            <Route path="/tipo-cambio" element={<GuardedRoute path="/tipo-cambio" element={<TipoCambio />} />} />
            <Route path="/health" element={<GuardedRoute path="/health" element={<Health />} />} />
            <Route path="/pauta-database" element={<GuardedRoute path="/pauta-database" element={<PautaDatabase />} />} />
            <Route path="/pauta-kpi" element={<GuardedRoute path="/pauta-kpi" element={<PautaKPI />} />} />
            <Route path="/empresas" element={<GuardedRoute path="/empresas" element={<Tenant />} />} />
            <Route path="/organizaciones" element={<GuardedRoute path="/organizaciones" element={<Organizaciones />} />} />
            <Route path="/usuarios" element={<GuardedRoute path="/usuarios" element={<Users />} />} />
            <Route path="/meta-events" element={<GuardedRoute path="/meta-events" element={<MetaEvents />} />} />
          </Route>
          <Route path="/landing" element={<Landing />} />
          <Route path="/demo/*" element={<DemoApp />} />
        </Routes>
      </div>
    </>
  )
}

export default App
