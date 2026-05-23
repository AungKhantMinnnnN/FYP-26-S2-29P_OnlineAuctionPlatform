import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLocalLoading(true)
    try {
      await login(usernameOrEmail, password)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Invalid username/email or password')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-1 dark:text-slate-55 mb-1 dark:text-slate-50">Welcome back</h1>
        <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Log in to your AuctionHub account.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl" id="login-error-alert">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput
            label="Email or Username"
            placeholder="alex@example.com"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" className="rounded border-slate-300 text-accent-600 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900" />
              Remember me
            </label>
            <Link to="/login" className="text-sm font-medium text-accent-600 hover:text-accent-700">Forgot password?</Link>
          </div>

          <PrimaryButton fullWidth type="submit" disabled={localLoading}>
            {localLoading ? 'Logging In...' : 'Log In'}
          </PrimaryButton>
        </form>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950">Demo: bidder@auctionhub.test and seller@auctionhub.test both log in as marketplace users. Use admin@auctionhub.test for admin.</p>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account? <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">Register</Link>
        </p>
      </div>
    </div>
  )
}