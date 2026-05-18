import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
          <Shield size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Portal</h1>
        <p className="text-sm text-gray-500 mb-6">Restricted access. Authorized personnel only.</p>

        <form className="space-y-4 text-left" onSubmit={e => e.preventDefault()}>
          <FormInput label="Admin ID / Email" placeholder="admin@auctionhub.sg" />
          <FormInput label="Password" type="password" placeholder="••••••••" />
          <PrimaryButton fullWidth type="submit">Log In</PrimaryButton>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          <Link to="/" className="text-accent-600 hover:text-accent-700">← Back to public site</Link>
        </p>
      </div>
    </div>
  )
}