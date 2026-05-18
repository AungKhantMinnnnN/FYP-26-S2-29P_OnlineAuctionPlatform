import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import FormInput from '../components/FormInput'
import TextAreaField from '../components/TextAreaField'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { currentUser } from '../data/mockData'

export default function ProfilePage() {
  const [tab, setTab] = useState('profile')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button onClick={() => setTab('profile')} className={`px-4 py-3 text-sm font-medium ${tab === 'profile' ? 'text-accent-600 border-b-2 border-accent-600' : 'text-gray-500 hover:text-gray-700'}`}>Profile</button>
          <button onClick={() => setTab('security')} className={`px-4 py-3 text-sm font-medium ${tab === 'security' ? 'text-accent-600 border-b-2 border-accent-600' : 'text-gray-500 hover:text-gray-700'}`}>Security</button>
          <button onClick={() => setTab('danger')} className={`px-4 py-3 text-sm font-medium ${tab === 'danger' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Danger Zone</button>
        </div>

        <div className="p-6">
          {tab === 'profile' && (
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="Full Name" defaultValue={currentUser.fullName} />
                <FormInput label="Username" defaultValue={currentUser.username} />
              </div>
              <FormInput label="Email" type="email" defaultValue={currentUser.email} />
              <FormInput label="Phone" defaultValue={currentUser.phone} />
              <FormInput label="Address" defaultValue={currentUser.address} />
              <TextAreaField label="Bio" defaultValue={currentUser.bio} rows={3} />
              <div className="flex justify-end">
                <PrimaryButton type="submit">Save Changes</PrimaryButton>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <form className="space-y-4 max-w-md" onSubmit={e => e.preventDefault()}>
              <FormInput label="Current Password" type="password" />
              <FormInput label="New Password" type="password" />
              <FormInput label="Confirm New Password" type="password" />
              <div className="flex justify-end">
                <PrimaryButton type="submit">Update Password</PrimaryButton>
              </div>
            </form>
          )}

          {tab === 'danger' && (
            <div className="border border-red-200 rounded-lg bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-700 mt-1 mb-4">This will permanently remove your profile, bids, and listings. This action cannot be undone.</p>
                  <SecondaryButton onClick={() => alert('Account deletion simulated')}>Delete My Account</SecondaryButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}