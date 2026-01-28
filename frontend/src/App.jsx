import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import DesktopLayout from './layouts/DesktopLayout.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'

function App() {

  return (
    <>
      <div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<DesktopLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/stats" element={<Stats />} />
          </Route>
        </Routes>
      </div>
    </>
  )
}

export default App
