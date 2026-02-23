import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from '../App.jsx'
import { startTokenRefresh } from '../services/auth'
import { TenantProvider } from '../context/TenantContext'
import { getUISettings, subscribeUISettings } from '../services/uiSettings'

export default function AdminBootstrap() {
  const [mode, setMode] = useState(() =>
    getUISettings().theme === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    const unsubscribe = subscribeUISettings((settings) => {
      setMode(settings?.theme === 'light' ? 'light' : 'dark')
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    startTokenRefresh()
  }, [])

  useEffect(() => {
    document.documentElement.style.colorScheme = mode
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [mode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <TenantProvider>
          <App />
        </TenantProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
