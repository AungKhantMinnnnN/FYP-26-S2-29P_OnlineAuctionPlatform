import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'

import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const email = location.state?.email || ''

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    if (!email) {
      setError('Email is missing. Please start from the Forgot Password page.')
      return
    }

    if (!otp.trim()) {
      setError('Please enter the verification code.')
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
      await axios.post('/v1.0.0/auth/reset_password', {
        email,
        otp,
        new_password: newPassword,
      })

      setSuccess(
        'Password has been reset successfully! Redirecting to login...'
      )

      setTimeout(() => {
        navigate('/login')
      }, 2000)

    } catch (err: any) {
      setError(
        err.response?.data?.detail ??
        'Unable to reset password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">

        <h1 className="text-2xl font-bold mb-2">
          Reset Password
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          Enter the verification code sent to your email and choose a new password.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <FormInput
            label="Email"
            value={email}
            disabled
          />

          <FormInput
            label="Verification Code"
            placeholder="Enter the 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <FormInput
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <FormInput
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <PrimaryButton
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="text-accent-600 hover:text-accent-700"
          >
            Back to Login
          </Link>
        </p>

      </div>
    </div>
  )
}