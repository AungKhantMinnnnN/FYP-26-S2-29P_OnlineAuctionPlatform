import { createContext, useContext, useMemo, useState } from 'react'

const USERS = {
  bidder: { id: 1, username: 'ethan_bidder', name: 'Ethan Bidder', email: 'bidder@auctionhub.test', role: 'normal_user', status: 'active', balance: 500 },
  seller: { id: 2, username: 'sarah_seller', name: 'Sarah Seller', email: 'seller@auctionhub.test', role: 'normal_user', status: 'active', balance: 780 },
  admin: { id: 3, username: 'admin_user', name: 'Admin User', email: 'admin@auctionhub.test', role: 'admin', status: 'active', balance: 0 },
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

  const updateBalance = (nextBalance) => {
    setUser((current) => {
      if (!current) return current
      const nextUser = { ...current, balance: Number(nextBalance.toFixed ? nextBalance.toFixed(2) : nextBalance) }
      localStorage.setItem('auctionhub_user', JSON.stringify(nextUser))
      return nextUser
    })
  }

  const adjustBalance = (amount) => {
    setUser((current) => {
      if (!current) return current
      const nextBalance = Number(((current.balance ?? 0) + amount).toFixed(2))
      const nextUser = { ...current, balance: nextBalance }
      localStorage.setItem('auctionhub_user', JSON.stringify(nextUser))
      return nextUser
    })
  }

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), role: user?.role, login, logout, updateBalance, adjustBalance }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
