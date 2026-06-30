import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setLoading(true)

    try {
      await axios.post('/v1.0.0/auth/forgot_password', {
        email,
      })

      setSuccess('Verification code sent to your email.')

      // Go to reset password page after 2 seconds
      setTimeout(() => {
        navigate('/reset-password', {
          state: { email },
        })
      }, 2000)
    } catch (err: any) {
      setError(
        err.response?.data?.detail ??
          'Unable to send verification code.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">

        <h1 className="text-2xl font-bold mb-2">
          Forgot Password
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          Enter your email and we'll send you a verification code.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 text-sm">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <FormInput
            label="Email"
            placeholder="alex@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PrimaryButton
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
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