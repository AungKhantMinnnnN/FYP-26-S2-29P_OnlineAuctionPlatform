import { Link } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Log in to your AuctionHub account.</p>

        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <FormInput label="Email or Username" placeholder="alex@example.com" />
          <FormInput label="Password" type="password" placeholder="••••••••" />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
              Remember me
            </label>
            <Link to="/login" className="text-sm font-medium text-accent-600 hover:text-accent-700">Forgot password?</Link>
          </div>

          <PrimaryButton fullWidth type="submit">Log In</PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">Register</Link>
        </p>
      </div>
    </div>
  )
}