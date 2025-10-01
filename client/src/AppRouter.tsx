import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthService } from './services/authService'
import { AuthForm } from './components/AuthForm'
import { ChatLayout } from './components/ChatLayout'
import { ChatView } from './components/ChatView'
import { RoomChatView } from './components/RoomChatView'
import { RoomsPage } from './components/RoomsPage'
import { UsersPage } from './components/UsersPage'
import { SettingsPage } from './components/SettingsPage'
import { ProfilePage } from './components/ProfilePage'
import { VersionPage } from './components/VersionPage'
import { ClackProvider, useClackContext } from './contexts/ClackContext'
import { themeService } from './services/themeService'
import { VersionBadge } from './components/VersionBadge'

function AppContent() {
  React.useEffect(() => {
    themeService.init()
  }, [])

  const [authService] = React.useState(() => new AuthService())
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const {
    authenticate,
    isConnected
  } = useClackContext()

  const handleAuthSuccess = async (user: any) => {
    const token = authService.getToken()
    if (token) {
      await authenticate(token, user)
      setCurrentUser(user)
      setIsAuthenticated(true)
    }
  }

  // Try to authenticate with stored token on app load
  React.useEffect(() => {
    const tryAutoAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const token = authService.getToken()
          if (token) {
            // Try to validate the token by making a request to get user info
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const user = await response.json()
              await authenticate(token, user)
              setCurrentUser(user)
              setIsAuthenticated(true)
            } else {
              // Token is invalid, clear it
              authService.logout()
            }
          }
        } catch (error) {
          console.error('Auto-auth failed:', error)
          authService.logout()
        }
      }
      setIsLoading(false)
    }

    tryAutoAuth()
  }, [authService, authenticate])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AuthForm 
          authService={authService} 
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">

            <Routes>
              <Route path="/" element={<ChatLayout />}>
                <Route index element={<div className="flex-1 flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Clack Chat</h2><p className="text-gray-600">Select a user or room from the sidebar to start chatting</p></div></div>} />
                <Route path="chat/:username" element={<ChatView />} />
                <Route path="room/:roomName" element={<RoomChatView />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="version" element={<VersionPage />} />
              </Route>
            </Routes>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ClackProvider>
      <AppContent />
    </ClackProvider>
  )
}

export default App
