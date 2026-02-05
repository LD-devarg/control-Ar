import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import DesktopLayout from './layouts/DesktopLayout.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'
import WhatsApp from './pages/WhatsApp.jsx'
import Landing from './pages/Landing.jsx'
import Agenda from './pages/Contacts.jsx'
import TipoCambio from './pages/TipoCambio.jsx'
import LandingConfig from './pages/LandingConfig.jsx'
import TabletLayout from './layouts/TabletLayout.jsx'
import MobileLayout from './layouts/MobileLayout.jsx'


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

function App() {
  const [viewportType, setViewportType] = useState(() => getViewportType())

  useEffect(() => {
    const onResize = () => setViewportType(getViewportType())

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
          <Route path="/" element={<Login />} />
          <Route element={<ActiveLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/contacts" element={<Agenda />} />
            <Route path="/landing-config" element={<LandingConfig />} />
            <Route path="/tipo-cambio" element={<TipoCambio />} />
          </Route>
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </div>
    </>
  )
}

export default App
