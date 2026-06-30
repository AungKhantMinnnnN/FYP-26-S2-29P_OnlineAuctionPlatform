import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import { confirmPasswordReset } from '../api/authApi'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!token) {
      setError('Reset link is missing or invalid. Please request a new one.')
      return
    }
    if (!newPassword) {
      setError('Please enter a new password.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(token, newPassword)
      setSuccess('Password reset successfully. Redirecting to login…')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold mb-2 text-slate-950">Reset password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a new password for your account.</p>

        {!token && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No reset token found in the URL. Open the link from your email, or{' '}
            <Link to="/forgot-password" className="font-medium underline">request a new one</Link>.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="New password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <FormInput
            label="Confirm password"
            type="password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <PrimaryButton type="submit" fullWidth disabled={loading || !token}>
            {loading ? 'Resetting…' : 'Reset password'}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
