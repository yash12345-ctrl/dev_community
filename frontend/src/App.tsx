import { useEffect, useState } from 'react'
import Login from './login/Login'
import DashboardLayout from './dashboard/DashboardLayout'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 1. Check if we just came back from GitHub with a token in the URL
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')

    if (tokenFromUrl) {
      // Save it to localStorage and clear the URL
      localStorage.setItem('github_token', tokenFromUrl)
      window.history.replaceState({}, document.title, window.location.pathname)
      setIsAuthenticated(true)
    } else {
      // 2. Check if we already have a token saved
      const savedToken = localStorage.getItem('github_token')
      if (savedToken) {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Show dashboard if logged in, otherwise show login page
  if (isAuthenticated) {
    return <DashboardLayout />
  }

  return <Login />
}

export default App
