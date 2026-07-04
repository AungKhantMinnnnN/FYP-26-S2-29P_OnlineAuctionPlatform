import { Link } from 'react-router-dom'
import { useState } from 'react'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Recover account</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Enter your email and we will mock-send a recovery link for this wireframe.</p>
        {submitted ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">If an account exists for this email, a recovery link has been sent.</p>
            <PrimaryButton to="/login" fullWidth>Back to Login</PrimaryButton>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormInput label="Email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <PrimaryButton fullWidth type="submit">Send Recovery Link</PrimaryButton>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400"><Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">Return to login</Link></p>
      </div>
    </div>
  )
}
