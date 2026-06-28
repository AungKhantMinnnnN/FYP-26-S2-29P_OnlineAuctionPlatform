import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLocalLoading(true)
    try {
      await register(fullName, username, email, password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Registration failed. Try again.')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-1">Create account</h1>
        <p className="text-sm text-slate-500 mb-6">Join AuctionHub to start bidding and selling.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl" id="register-error-alert">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl" id="register-success-alert">
            Account created successfully! Redirecting to login...
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput
            label="Full Name"
            placeholder="e.g. Alex Tan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <FormInput
            label="Username"
            placeholder="e.g. alextan"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <FormInput
            label="Email"
            type="email"
            placeholder="alex@example.com"
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
          <FormInput
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            <span className="text-xs text-slate-600">
              I agree to the Terms of Service and Privacy Policy (PDPA compliant).
            </span>
          </label>

          <PrimaryButton fullWidth type="submit" disabled={!agreed || localLoading}>
            {localLoading ? 'Registering...' : 'Register'}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">Log in</Link>
        </p>
      </div>
    </div>
  )
}