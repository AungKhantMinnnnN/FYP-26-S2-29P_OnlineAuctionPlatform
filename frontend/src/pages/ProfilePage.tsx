import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { User as UserIcon, CreditCard, Bell, AlertTriangle, ShieldCheck, Tags, Check, Loader2 } from 'lucide-react'
import FormInput from '../components/FormInput'
import TextAreaField from '../components/TextAreaField'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getSubscriptionTiers, manageSubscription } from '../api/usersApi'
import type { SubscriptionTierItem } from '../api/usersApi'
import { changePassword } from '../api/authApi'
import { getFormMetadata } from '../api/auctionsApi'
import type { Category } from '../api/auctionsApi'
import { getMyInterests, updateMyInterests } from '../api/interestsApi'
import EmptyState from '../components/EmptyState'

type InterestsResponseWithItems = {
  category_ids?: string[]
  items?: { id: string }[]
}

const getProfileInterestCategoryIds = (interests?: InterestsResponseWithItems): string[] => {
  if (!interests) return []
  if (interests.category_ids) return interests.category_ids
  return interests.items?.map((item) => item.id) ?? []
}

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

type PendingAction =
  | { type: 'save-profile' }
  | { type: 'subscription'; nextAction: 'renew' | 'cancel' }
  | { type: 'password' }
  | { type: 'delete-account' }

function confirmCopy(action: PendingAction): { title: string; description: string; confirmLabel: string; danger?: boolean } {
  switch (action.type) {
    case 'save-profile':
      return { title: 'Save changes?', description: 'This will update your profile information.', confirmLabel: 'Save Changes' }
    case 'subscription':
      return action.nextAction === 'renew'
        ? { title: 'Upgrade to Premium?', description: 'This will deduct the plan price from your wallet balance and activate Premium.', confirmLabel: 'Upgrade to Premium' }
        : { title: 'Cancel your subscription?', description: 'You will lose Premium benefits immediately. This cannot be undone.', confirmLabel: 'Cancel Plan', danger: true }
    case 'password':
      return { title: 'Update your password?', description: "You'll need to use your new password the next time you log in.", confirmLabel: 'Update Password' }
    case 'delete-account':
      return { title: 'Delete your account?', description: 'This will permanently remove your profile, bids, and listings. This cannot be undone.', confirmLabel: 'Delete My Account', danger: true }
  }
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState<'personal' | 'security' | 'interests'>('personal')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(user?.profile?.full_name || '')
  const [phone, setPhone] = useState(user?.profile?.phone || '')
  const [address, setAddress] = useState(user?.profile?.address || '')
  const [city, setCity] = useState(user?.profile?.city || '')
  const [country, setCountry] = useState(user?.profile?.country || '')
  const [bio, setBio] = useState(user?.profile?.bio || '')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user?.profile?.full_name || '')
    setPhone(user?.profile?.phone || '')
    setAddress(user?.profile?.address || '')
    setCity(user?.profile?.city || '')
    setCountry(user?.profile?.country || '')
    setBio(user?.profile?.bio || '')
  }, [user])

  const runSaveProfile = async () => {
    await updateProfile({ full_name: fullName, phone, address, city, country, bio })
    await refreshUser()
    setProfileMessage('Profile updated successfully.')
  }

  // Subscription
  const [tiers, setTiers] = useState<SubscriptionTierItem[]>([])
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null)

  useEffect(() => {
    getSubscriptionTiers()
      .then((res) => setTiers(res.items))
      .catch(() => {})
  }, [])

  const isPremium = user?.subscription_tier === 'premium'
  const premiumTier = tiers.find((t) => t.tier === 'premium')
  const insufficientWalletMessage = 'The wallet amount is not enough, please top up.'

  const runSubscriptionAction = async (nextAction: 'renew' | 'cancel') => {
    const res = await manageSubscription(nextAction)
    await refreshUser()
    setSubscriptionMessage(res.message)
  }

  // Notifications — local preference only; no backend endpoint persists these yet.
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [interestsMessage, setInterestsMessage] = useState<string | null>(null)
  const [interestsError, setInterestsError] = useState<string | null>(null)

  const {
    data: metadata,
    isLoading: categoriesLoading,
    isError: categoriesError
  } = useQuery({
    queryKey: ['form_metadata'],
    queryFn: getFormMetadata
  })

  const { data: savedInterests } = useQuery({
    queryKey: ['my-interests'],
    queryFn: getMyInterests,
    retry: false
  })

  useEffect(() => {
    const savedInterestIds = getProfileInterestCategoryIds(savedInterests)
    setSelectedInterests(new Set(savedInterestIds))
  }, [savedInterests])

  const categories: Category[] = metadata?.categories ?? []

  const toggleInterest = (id: string) => {
    setInterestsMessage(null)
    setInterestsError(null)
    setSelectedInterests((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveInterestsMutation = useMutation({
    mutationFn: () => updateMyInterests(Array.from(selectedInterests)),
    onSuccess: (res) => {
      setSelectedInterests(new Set(getProfileInterestCategoryIds(res)))
      setInterestsError(null)
      setInterestsMessage('Interests updated successfully.')
    },
    onError: () => {
      setInterestsMessage(null)
      setInterestsError("We couldn't update your interests right now. Please try again.")
    }
  })

  const handleSaveInterests = () => {
    setInterestsMessage(null)
    setInterestsError(null)
    if (selectedInterests.size === 0) {
      setInterestsError('Select at least one interest.')
      return
    }
    saveInterestsMutation.mutate()
  }

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPendingAction({ type: 'password' })
  }

  const runChangePassword = async () => {
    const res = await changePassword(currentPassword, newPassword)
    setPasswordMessage(res.message)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  const runDeleteAccount = async () => {
    // No account-deletion endpoint exists yet — simulated, matching the previous page's behavior.
    setPasswordMessage('Account deletion simulated.')
  }

  const handleConfirm = async () => {
    if (!pendingAction) return
    setConfirmBusy(true)
    try {
      if (pendingAction.type === 'save-profile') await runSaveProfile()
      else if (pendingAction.type === 'subscription') await runSubscriptionAction(pendingAction.nextAction)
      else if (pendingAction.type === 'password') await runChangePassword()
      else if (pendingAction.type === 'delete-account') await runDeleteAccount()
      setPendingAction(null)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (pendingAction.type === 'password') setPasswordError(detail || 'Unable to update password.')
      else if (pendingAction.type === 'subscription') {
        setSubscriptionMessage(detail?.toLowerCase().includes('insufficient balance') ? insufficientWalletMessage : detail || 'Unable to update subscription.')
      }
      else if (pendingAction.type === 'save-profile') setProfileMessage(detail || 'Unable to update profile.')
      setPendingAction(null)
    } finally {
      setConfirmBusy(false)
    }
  }

  const initials = (user?.profile?.full_name || user?.username || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const activeCopy = pendingAction ? confirmCopy(pendingAction) : null

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your AuctionHub account settings and preferences.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80">
        <button
          onClick={() => setTab('personal')}
          className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
            tab === 'personal' ? 'border-b-2 border-accent-600 text-accent-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setTab('security')}
          className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
            tab === 'security' ? 'border-b-2 border-accent-600 text-accent-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Password and Security
        </button>
        <button
          onClick={() => setTab('interests')}
          className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
            tab === 'interests' ? 'border-b-2 border-accent-600 text-accent-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Update Interests
        </button>
      </div>

      {tab === 'personal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Profile Information */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <UserIcon size={20} className="text-accent-600" /> Profile Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">Update your personal information.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setProfileMessage(null)
                  setPendingAction({ type: 'save-profile' })
                }}
                className="p-6"
              >
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormInput label="City" placeholder="e.g. Singapore" value={city} onChange={(e) => setCity(e.target.value)} />
                      <FormInput label="Country" placeholder="e.g. Singapore" value={country} onChange={(e) => setCountry(e.target.value)} />
                    </div>
                    <TextAreaField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />

                    {profileMessage && <p className="text-sm font-medium text-accent-700">{profileMessage}</p>}

                    <div className="flex justify-end">
                      <PrimaryButton type="submit">Save Changes</PrimaryButton>
                    </div>
                  </div>
                </div>
              </form>
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

          {/* Subscription Tier — full width, own row */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <CreditCard size={20} className="text-accent-600" /> Subscription Tier
              </h2>
              <p className="mt-1 text-sm text-slate-500">Manage your AuctionHub membership.</p>
            </div>
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
              <PrimaryButton
                onClick={() => {
                  setSubscriptionMessage(null)
                  if (!isPremium && premiumTier && (user?.balance ?? 0) < premiumTier.price) {
                    setSubscriptionMessage(insufficientWalletMessage)
                    return
                  }
                  setPendingAction({ type: 'subscription', nextAction: isPremium ? 'cancel' : 'renew' })
                }}
              >
                {isPremium ? 'Cancel Plan' : 'Upgrade to Premium'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <ShieldCheck size={20} className="text-accent-600" /> Change Password
              </h2>
              <p className="mt-1 text-sm text-slate-500">Your current password is required to make changes.</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 p-6">
              <FormInput
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <FormInput
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <FormInput
                label="Confirm New Password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {passwordError && <p className="text-sm font-medium text-red-600">{passwordError}</p>}
              {passwordMessage && <p className="text-sm font-medium text-accent-700">{passwordMessage}</p>}
              <div className="flex justify-end">
                <PrimaryButton type="submit">Update Password</PrimaryButton>
              </div>
            </form>
          </div>

          <div className="self-start rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-600" size={20} />
              <div>
                <h3 className="font-semibold text-red-900">Delete Account</h3>
                <p className="mt-1 mb-4 text-sm text-red-700">
                  This will permanently remove your profile, bids, and listings. This action cannot be undone.
                </p>
                <SecondaryButton onClick={() => setPendingAction({ type: 'delete-account' })}>
                  Delete My Account
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'interests' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Tags size={20} className="text-accent-600" /> Update Interests
            </h2>
            <p className="mt-1 text-sm text-slate-500">Choose the categories you want to see more often.</p>
          </div>

          <div className="p-6">
            {interestsError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {interestsError}
              </div>
            )}
            {interestsMessage && <p className="mb-4 text-sm font-medium text-accent-700">{interestsMessage}</p>}

            {categoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-accent-600" size={28} />
              </div>
            ) : categoriesError ? (
              <EmptyState message="We couldn't load categories right now. Please try again later." />
            ) : categories.length === 0 ? (
              <EmptyState message="No categories are available yet." />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {categories.map((cat) => {
                  const isSelected = selectedInterests.has(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleInterest(cat.id)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-accent-600 bg-accent-50 text-accent-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-accent-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check size={15} />}
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <PrimaryButton
                type="button"
                onClick={handleSaveInterests}
                disabled={saveInterestsMutation.isPending || selectedInterests.size === 0 || categoriesLoading || categoriesError}
              >
                {saveInterestsMutation.isPending ? 'Saving...' : `Save Interests${selectedInterests.size > 0 ? ` (${selectedInterests.size})` : ''}`}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!pendingAction} onClose={() => (confirmBusy ? null : setPendingAction(null))} title={activeCopy?.title}>
        <p className="text-sm leading-6 text-slate-600">{activeCopy?.description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={() => setPendingAction(null)} disabled={confirmBusy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={confirmBusy} variant={activeCopy?.danger ? 'danger' : 'primary'}>
            {confirmBusy ? 'Please wait…' : activeCopy?.confirmLabel}
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  )
}
