import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'

const AdminBootstrap = lazy(() => import('./bootstrap/AdminBootstrap.jsx'))
const LandingBootstrap = lazy(() => import('./bootstrap/LandingBootstrap.jsx'))

const isLandingPath = /^\/landing(?:\/|$)/.test(window.location.pathname)
const Bootstrap = isLandingPath ? LandingBootstrap : AdminBootstrap

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div />}>
      <Bootstrap />
    </Suspense>
  </StrictMode>,
)
