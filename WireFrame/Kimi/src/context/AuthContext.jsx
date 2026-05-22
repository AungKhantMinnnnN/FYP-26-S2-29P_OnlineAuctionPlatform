import { createContext, useContext, useMemo, useState } from 'react'

const USERS = {
  bidder: { id: 1, name: 'Ethan Bidder', email: 'bidder@auctionhub.test', role: 'user' },
  seller: { id: 2, name: 'Sarah Seller', email: 'seller@auctionhub.test', role: 'user' },
  admin: { id: 3, name: 'Admin User', email: 'admin@auctionhub.test', role: 'admin' },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auctionhub_user')) } catch { return null }
  })

  const login = async ({ email = '' }) => {
    const key = email.includes('admin') ? 'admin' : email.includes('seller') ? 'seller' : 'bidder'
    const nextUser = USERS[key]
    localStorage.setItem('token', `mock-${nextUser.role}-token`)
    localStorage.setItem('auctionhub_user', JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('auctionhub_user')
    setUser(null)
  }

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), role: user?.role, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
