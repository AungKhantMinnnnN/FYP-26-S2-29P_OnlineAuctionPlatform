import { useEffect, useState } from 'react'
import { User as UserIcon, CreditCard, Bell, Mail, CheckCircle2, AlertTriangle } from 'lucide-react'
import FormInput from '../components/FormInput'
import TextAreaField from '../components/TextAreaField'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getSubscriptionTiers, manageSubscription } from '../api/usersApi'
import type { SubscriptionTierItem } from '../api/usersApi'
import { sendEmailVerification } from '../api/authApi'

type ToggleProps = {
  title: string
  subtitle: string
  enabled: boolean
  onChange: (value: boolean) => void
}

function NotificationToggle({ title, subtitle, enabled, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-4">
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${enabled ? 'bg-accent-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  // Profile form
  const [fullName, setFullName] = useState(user?.profile?.full_name || '')
  const [phone, setPhone] = useState(user?.profile?.phone || '')
  const [address, setAddress] = useState(user?.profile?.address || '')
  const [bio, setBio] = useState(user?.profile?.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user?.profile?.full_name || '')
    setPhone(user?.profile?.phone || '')
    setAddress(user?.profile?.address || '')
    setBio(user?.profile?.bio || '')
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      await updateProfile({ full_name: fullName, phone, address, bio })
      await refreshUser()
      setProfileMessage('Profile updated successfully.')
    } catch {
      setProfileMessage('Unable to update profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Email verification
  const [sendingVerification, setSendingVerification] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)

  const handleResendVerification = async () => {
    setSendingVerification(true)
    setVerificationMessage(null)
    try {
      const res = await sendEmailVerification()
      setVerificationMessage(res.message)
    } catch {
      setVerificationMessage('Unable to send verification email. Please try again.')
    } finally {
      setSendingVerification(false)
    }
  }

  // Subscription
  const [tiers, setTiers] = useState<SubscriptionTierItem[]>([])
  const [subscriptionBusy, setSubscriptionBusy] = useState(false)
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null)

  useEffect(() => {
    getSubscriptionTiers()
      .then((res) => setTiers(res.items))
      .catch(() => {})
  }, [])

  const isPremium = user?.subscription_tier === 'premium'
  const premiumTier = tiers.find((t) => t.tier === 'premium')

  const handleSubscriptionAction = async () => {
    setSubscriptionBusy(true)
    setSubscriptionMessage(null)
    try {
      const res = await manageSubscription(isPremium ? 'cancel' : 'renew')
      await refreshUser()
      setSubscriptionMessage(res.message)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSubscriptionMessage(detail || 'Unable to update subscription.')
    } finally {
      setSubscriptionBusy(false)
    }
  }

  // Notifications — local preference only; no backend endpoint persists these yet.
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  const initials = (user?.profile?.full_name || user?.username || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your AuctionHub account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <UserIcon size={20} className="text-accent-600" /> Profile Information
            </h2>
            <p className="mt-1 text-sm text-slate-500">Update your personal information.</p>
          </div>
          <form onSubmit={handleSaveProfile} className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex flex-col items-center sm:w-32">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-100 text-2xl font-bold text-accent-700">
                  {initials}
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <FormInput label="Username" value={user?.username || ''} disabled />
                </div>
                <FormInput label="Email" type="email" value={user?.email || ''} disabled />
                <FormInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <FormInput label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                <TextAreaField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />

                {profileMessage && <p className="text-sm font-medium text-accent-700">{profileMessage}</p>}

                <div className="flex justify-end">
                  <PrimaryButton type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Email Verification */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Mail size={20} className="text-accent-600" /> Email Verification
            </h2>
          </div>
          <div className="flex flex-col items-center p-6 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${user?.email_verified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <CheckCircle2 className={user?.email_verified ? 'text-emerald-600' : 'text-amber-600'} size={28} />
            </div>
            <span className={`mt-4 rounded-full px-3 py-1 text-sm font-medium ${user?.email_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {user?.email_verified ? 'Verified' : 'Not Verified'}
            </span>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {user?.email_verified
                ? 'Your email address has been verified.'
                : 'Verify your email to unlock full account features.'}
            </p>
            {!user?.email_verified && (
              <div className="mt-4">
                <SecondaryButton onClick={handleResendVerification} disabled={sendingVerification}>
                  {sendingVerification ? 'Sending…' : 'Resend Verification Email'}
                </SecondaryButton>
              </div>
            )}
            {verificationMessage && <p className="mt-3 text-sm text-slate-600">{verificationMessage}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subscription Tier */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <CreditCard size={20} className="text-accent-600" /> Subscription Tier
            </h2>
            <p className="mt-1 text-sm text-slate-500">Manage your AuctionHub membership.</p>
          </div>
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full bg-accent-100 px-3 py-1 text-sm font-semibold text-accent-700">
                {isPremium ? 'Premium' : 'Free'}
              </span>
              <h3 className="mt-4 text-2xl font-bold text-slate-950">{isPremium ? 'Premium Plan' : 'Free Plan'}</h3>
              {isPremium && user?.subscription_expires_at && (
                <p className="mt-1 text-sm text-slate-500">
                  Renews/expires {new Date(user.subscription_expires_at).toLocaleDateString()}
                </p>
              )}
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                {isPremium
                  ? 'Unlock featured listings, priority customer support, advanced bidding insights and exclusive marketplace privileges.'
                  : `Upgrade to Premium${premiumTier ? ` for $${premiumTier.price.toFixed(2)} / ${premiumTier.duration_days} days` : ''} to unlock featured listings, priority support and advanced bidding insights.`}
              </p>
              {subscriptionMessage && <p className="mt-3 text-sm font-medium text-accent-700">{subscriptionMessage}</p>}
            </div>
            <PrimaryButton onClick={handleSubscriptionAction} disabled={subscriptionBusy}>
              {subscriptionBusy ? 'Processing…' : isPremium ? 'Cancel Plan' : 'Upgrade to Premium'}
            </PrimaryButton>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Bell size={20} className="text-accent-600" /> Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-500">Choose how you receive updates.</p>
          </div>
          <div className="px-6">
            <NotificationToggle title="Email Alerts" subtitle="Receive bid updates via email." enabled={emailAlerts} onChange={setEmailAlerts} />
            <NotificationToggle title="Push Notifications" subtitle="Instant alerts when you're outbid." enabled={pushNotifications} onChange={setPushNotifications} />
            <NotificationToggle title="Marketing Emails" subtitle="Receive promotions and platform news." enabled={marketingEmails} onChange={setMarketingEmails} />
          </div>
        </div>
      </div>

      {/* Security + Danger Zone — carried over from the previous profile page */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-950">Security</h2>
          </div>
          <form className="space-y-4 p-6" onSubmit={(e) => e.preventDefault()}>
            <FormInput label="Current Password" type="password" />
            <FormInput label="New Password" type="password" />
            <FormInput label="Confirm New Password" type="password" />
            <div className="flex justify-end">
              <PrimaryButton type="submit">Update Password</PrimaryButton>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Delete Account</h3>
              <p className="mt-1 mb-4 text-sm text-red-700">
                This will permanently remove your profile, bids, and listings. This action cannot be undone.
              </p>
              <SecondaryButton onClick={() => alert('Account deletion simulated')}>Delete My Account</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
