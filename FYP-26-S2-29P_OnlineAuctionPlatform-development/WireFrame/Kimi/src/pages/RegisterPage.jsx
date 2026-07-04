import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-1 dark:text-slate-50">Create account</h1>
        <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Join AuctionHub to start bidding and selling.</p>

        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <FormInput label="Full Name" placeholder="e.g. Alex Tan" />
          <FormInput label="Username" placeholder="e.g. alextan" />
          <FormInput label="Email" type="email" placeholder="alex@example.com" />
          <FormInput label="Password" type="password" placeholder="••••••••" />
          <FormInput label="Confirm Password" type="password" placeholder="••••••••" />

          <label className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900" />
            <span className="text-xs text-slate-600 dark:text-slate-400">I agree to the Terms of Service and Privacy Policy (PDPA compliant).</span>
          </label>

          <PrimaryButton fullWidth type="submit" disabled={!agreed}>Register</PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account? <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">Log in</Link>
        </p>
      </div>
    </div>
  )
}