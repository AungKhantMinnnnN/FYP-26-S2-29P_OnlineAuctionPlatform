import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

import PrimaryButton from '../components/PrimaryButton'
import { confirmEmailVerification } from '../api/authApi'

type Status = 'pending' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>('pending')
  const [message, setMessage] = useState<string>('Verifying your email…')

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setStatus('error')
        setMessage('Verification link is missing a token.')
        return
      }
      try {
        const res = await confirmEmailVerification(token)
        if (cancelled) return
        setStatus('success')
        setMessage(res.message ?? 'Your email has been verified.')
      } catch (err: any) {
        if (cancelled) return
        setStatus('error')
        setMessage(err.response?.data?.detail ?? 'Unable to verify email. The link may be expired or invalid.')
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 text-center">
        <div className="mb-4 flex justify-center">
          {status === 'pending' && <Loader2 size={42} className="animate-spin text-accent-600" />}
          {status === 'success' && <CheckCircle size={42} className="text-emerald-500" />}
          {status === 'error' && <XCircle size={42} className="text-red-500" />}
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-950">
          {status === 'pending' && 'Verifying email'}
          {status === 'success' && 'Email verified'}
          {status === 'error' && 'Verification failed'}
        </h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>

        {status === 'success' && (
          <PrimaryButton fullWidth to="/login">Go to login</PrimaryButton>
        )}
        {status === 'error' && (
          <div className="space-y-3">
            <PrimaryButton fullWidth to="/login">Back to login</PrimaryButton>
            <p className="text-xs text-slate-500">
              Already logged in? Open your account settings and request a new verification email.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-accent-600 hover:text-accent-700">
            Return home
          </Link>
        </p>
      </div>
    </div>
  )
}
