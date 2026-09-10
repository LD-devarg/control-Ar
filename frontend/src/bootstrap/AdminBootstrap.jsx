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
          ...(mode === 'dark'
            ? {
                primary: {
                  main: '#3b82f6',
                  light: '#60a5fa',
                  dark: '#2563eb',
                  contrastText: '#ffffff',
                },
                background: {
                  default: '#090a0f',
                  paper: '#10131b',
                },
                text: {
                  primary: '#f4f4f5',
                  secondary: '#9ca3af',
                },
                divider: 'rgba(255, 255, 255, 0.08)',
              }
            : {
                primary: {
                  main: '#2563eb',
                  light: '#3b82f6',
                  dark: '#1d4ed8',
                  contrastText: '#ffffff',
                },
                background: {
                  default: '#f8fafc',
                  paper: '#ffffff',
                },
                text: {
                  primary: '#0f172a',
                  secondary: '#64748b',
                },
                divider: 'rgba(0, 0, 0, 0.08)',
              }),
        },
        typography: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          button: {
            textTransform: 'none',
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                boxShadow: 'none',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              outlined: {
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)',
                '&:hover': {
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                },
              },
              contained: {
                '&:hover': {
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.4)',
                },
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.16)',
                  transition: 'border-color 0.15s ease-in-out',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.32)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                  borderWidth: '1px',
                },
              },
              input: {
                fontSize: '0.875rem',
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                fontSize: '0.875rem',
                color: mode === 'dark' ? '#9ca3af' : '#64748b',
                '&.Mui-focused': {
                  color: '#3b82f6',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                ...(mode === 'dark' && {
                  backgroundColor: '#11141c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }),
              },
            },
          },
          MuiPopover: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.5)',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 16,
                boxShadow: '0 24px 48px -8px rgba(0, 0, 0, 0.6)',
              },
            },
          },
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
