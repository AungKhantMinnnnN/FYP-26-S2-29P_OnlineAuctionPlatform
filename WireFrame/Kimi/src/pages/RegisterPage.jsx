import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Join AuctionHub to start bidding and selling.</p>

        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <FormInput label="Full Name" placeholder="e.g. Alex Tan" />
          <FormInput label="Username" placeholder="e.g. alextan" />
          <FormInput label="Email" type="email" placeholder="alex@example.com" />
          <FormInput label="Password" type="password" placeholder="••••••••" />
          <FormInput label="Confirm Password" type="password" placeholder="••••••••" />

          <label className="flex items-start gap-2">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
            <span className="text-xs text-gray-600">I agree to the Terms of Service and Privacy Policy (PDPA compliant).</span>
          </label>

          <PrimaryButton fullWidth type="submit" disabled={!agreed}>Register</PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">Log in</Link>
        </p>
      </div>
    </div>
  )
}