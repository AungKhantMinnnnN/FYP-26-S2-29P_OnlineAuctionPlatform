import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Shield } from 'lucide-react'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'

export default function AdminLoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 dark:bg-accent-950/40 dark:text-accent-300">
          <Shield size={24} />
        </div>
        <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50 mb-1">Admin Portal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Restricted access. Authorized personnel only.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form className="space-y-4 text-left" onSubmit={handleSubmit}>
          <FormInput
            label="Admin ID / Email"
            placeholder="admin@auctionhub.sg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PrimaryButton fullWidth type="submit" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          <Link to="/" className="text-accent-600 hover:text-accent-700">← Back to public site</Link>
        </p>
      </div>
    </div>
  )
}