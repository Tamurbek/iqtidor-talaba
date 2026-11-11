import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import client from '../api/client'
import type { User } from '../types/user'

interface AuthContextValue {
  currentUser: User | null
  isLoading: boolean
  isAdmin: boolean
  activeRole: string | null
  setActiveRole: (roleCode: string) => void
  login: (hemisId: string, password: string, rememberMe?: boolean) => Promise<User>
  loginWithToken: (accessToken: string, user: User) => void
  logout: () => Promise<void>
  updateCurrentUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ACTIVE_ROLE_KEY = 'active_role'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeRole, setActiveRoleState] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('current_user')
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User
        setCurrentUser(user)
        const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY)
        const validRole = user.assigned_roles?.some((r) => r.code === storedRole)
        setActiveRoleState(validRole ? storedRole : user.role)

        // localStorage'dagi rol ro'yxati eski sessiyadan qolgan bo'lishi mumkin
        // (masalan, admin rollar sxemasi backendda yangilangan bo'lsa). Har safar
        // ilova ochilganda eng so'nggi rol/huquqlarni serverdan qayta tortib,
        // foydalanuvchini qayta login qilishga majburlamasdan yangilab turamiz.
        client.get<{ role: string; assigned_roles?: User['assigned_roles'] }>('/users/me')
          .then(({ data }) => {
            setCurrentUser((prev) => {
              if (!prev) return prev
              const next = { ...prev, role: data.role, assigned_roles: data.assigned_roles }
              localStorage.setItem('current_user', JSON.stringify(next))
              return next
            })
            setActiveRoleState((prevActiveRole) => {
              const stillValid = data.assigned_roles?.some((r) => r.code === prevActiveRole)
              return stillValid ? prevActiveRole : data.role
            })
          })
          .catch(() => {
            // Tarmoq xatosi bo'lsa localStorage'dagi eski ma'lumot bilan davom etamiz.
          })
      } catch {
        localStorage.removeItem('current_user')
      }
    }
    setIsLoading(false)
  }, [])

  const setActiveRole = useCallback((roleCode: string) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, roleCode)
    setActiveRoleState(roleCode)
  }, [])

  const loginWithToken = useCallback((accessToken: string, user: User) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('current_user', JSON.stringify(user))
    localStorage.setItem(ACTIVE_ROLE_KEY, user.role)
    setCurrentUser(user)
    setActiveRoleState(user.role)
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

  const updateCurrentUser = useCallback((patch: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('current_user', JSON.stringify(next))
      return next
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout')
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('current_user')
    localStorage.removeItem(ACTIVE_ROLE_KEY)
    setCurrentUser(null)
    setActiveRoleState(null)
  }, [])

  const isAdmin = currentUser?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{ currentUser, isLoading, isAdmin, activeRole, setActiveRole, login, loginWithToken, logout, updateCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
