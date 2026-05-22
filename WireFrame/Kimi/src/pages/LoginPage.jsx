import { Link } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-1 dark:text-slate-50">Welcome back</h1>
        <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Log in to your AuctionHub account.</p>

        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <FormInput label="Email or Username" placeholder="alex@example.com" />
          <FormInput label="Password" type="password" placeholder="••••••••" />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" className="rounded border-slate-300 text-accent-600 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900" />
              Remember me
            </label>
            <Link to="/login" className="text-sm font-medium text-accent-600 hover:text-accent-700">Forgot password?</Link>
          </div>

          <PrimaryButton fullWidth type="submit">Log In</PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account? <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">Register</Link>
        </p>
      </div>
    </div>
  )
}