import { useState } from 'react'
import { Link } from 'react-router-dom'

import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import { requestPasswordReset } from '../api/authApi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Unable to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold mb-2 text-slate-950">Forgot password</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter the email tied to your account. We'll send you a link to reset your password.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              If an account with that email exists, a password reset link has been sent. The link expires in 1 hour.
            </div>
            <p className="text-xs text-slate-500">
              Didn't get it? Check your spam folder, then try again with the same email.
            </p>
            <PrimaryButton fullWidth onClick={() => { setSubmitted(false); setEmail('') }}>
              Send another link
            </PrimaryButton>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <PrimaryButton type="submit" fullWidth disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </PrimaryButton>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
