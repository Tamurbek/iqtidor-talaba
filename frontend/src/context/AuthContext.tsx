import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import client from '../api/client'
import type { User } from '../types/user'

interface AuthContextValue {
  currentUser: User | null
  isLoading: boolean
  isAdmin: boolean
  login: (hemisId: string, password: string, rememberMe?: boolean) => Promise<User>
  loginWithToken: (accessToken: string, user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('current_user')
    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('current_user')
      }
    }
    setIsLoading(false)
  }, [])

  const loginWithToken = useCallback((accessToken: string, user: User) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('current_user', JSON.stringify(user))
    setCurrentUser(user)
  }, [])

  const login = useCallback(async (hemisId: string, password: string, rememberMe = false) => {
    const { data } = await client.post('/auth/login', {
      login: hemisId,
      password,
      remember_me: rememberMe,
    })
    loginWithToken(data.access_token, data.user)
    return data.user as User
  }, [loginWithToken])

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout')
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('current_user')
    setCurrentUser(null)
  }, [])

  const isAdmin = currentUser?.role === 'admin'

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, isAdmin, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
