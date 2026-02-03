import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import DesktopLayout from './layouts/DesktopLayout.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'
import WhatsApp from './pages/WhatsApp.jsx'
import Landing from './pages/Landing.jsx'
import Agenda from './pages/Contacts.jsx'
import LandingConfig from './pages/LandingConfig.jsx'

function App() {

  return (
    <>
      <div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<DesktopLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/contacts" element={<Agenda />} />
            <Route path="/landing-config" element={<LandingConfig />} />
          </Route>
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </div>
    </>
  )
}

export default App
