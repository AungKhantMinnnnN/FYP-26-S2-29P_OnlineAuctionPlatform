import React, {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Gavel,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldBan,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DataTable from '../components/DataTable'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import AdminListingsPage from './AdminListingsPage'
import {
  createFeedbackType,
  deleteFeedbackType,
  getAllFeedbackTypes,
  updateFeedbackType,
} from '../api/feedbackApi'

import type { FeedbackType } from '../api/feedbackApi'
import { getPlatformStats, getSystemLogs, getAuditLogs } from '../api/adminApi'

import {
  adminUsersApi,
  type AdminUserDetails,
  type AdminUserSummary,
  type UserAccountStatus,
} from '../services/adminUsersApi'

// TODO: Replace these sections with backend data later.
const auctions: any[] = []
const categories: any[] = []
const bids: any[] = []
const adminCases: any[] = []

const titleMap: Record<string, string> = {
  users: 'User Management',
  listings: 'Listing Moderation',
  categories: 'Category Management',
  'feedback-types': 'Feedback Types',
  cases: 'Case Queue',
  bids: 'Bid Oversight',
}

const USERS_PAGE_SIZE = 10

function getErrorMessage(
  error: any,
  fallback: string,
): string {
  return error?.response?.data?.detail || fallback
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return 'Not available'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function DetailRow({
  label,
  value,
  preserveCapitalisation = false,
}: {
  label: string
  value: string
  preserveCapitalisation?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`max-w-[65%] text-right text-sm font-semibold text-slate-900 ${
          preserveCapitalisation ? '' : 'capitalize'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [roleFilter, setRoleFilter] = useState<
    'all' | 'user' | 'admin'
  >('all')

  const [statusFilter, setStatusFilter] = useState<
    UserAccountStatus | ''
  >('')

  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedUser, setSelectedUser] =
    useState<AdminUserSummary | null>(null)

  const [userDetails, setUserDetails] =
    useState<AdminUserDetails | null>(null)

  const [modalType, setModalType] = useState<
    'details' | 'suspend' | 'unsuspend' | 'delete' | null
  >(null)

  const [suspensionReason, setSuspensionReason] =
    useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await adminUsersApi.getUsers(
        searchQuery,
        page,
        USERS_PAGE_SIZE,
        statusFilter || undefined,
      )

      setUsers(response.items)
      setTotal(response.total)
      setPages(response.pages)
    } catch (error: any) {
      setUsers([])
      setTotal(0)
      setPages(0)

      setError(
        getErrorMessage(
          error,
          'Failed to load users. The admin user-management backend API may not be available yet.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, statusFilter])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const displayedUsers = users.filter(user => {
    if (roleFilter === 'all') {
      return true
    }

    return user.role === roleFilter
  })

  const activeUsers = users.filter(
    user => user.status === 'active',
  ).length

  const suspendedUsers = users.filter(
    user => user.status === 'suspended',
  ).length

  const adminUsers = users.filter(
    user => user.role === 'admin',
  ).length

  const handleSearch = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setPage(1)
    setSearchQuery(searchInput.trim())
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const closeModal = () => {
    if (actionLoading) {
      return
    }

    setModalType(null)
    setSelectedUser(null)
    setUserDetails(null)
    setSuspensionReason('')
  }

  const openDetails = async (
    user: AdminUserSummary,
  ) => {
    clearMessages()
    setSelectedUser(user)
    setUserDetails(null)
    setModalType('details')

    try {
      const details =
        await adminUsersApi.getUserById(user.id)

      setUserDetails(details)
    } catch (error: any) {
      closeModal()

      setError(
        getErrorMessage(
          error,
          'Failed to load the selected user account.',
        ),
      )
    }
  }

  const openSuspendModal = (
    user: AdminUserSummary,
  ) => {
    clearMessages()
    setSelectedUser(user)
    setSuspensionReason('')
    setModalType('suspend')
  }

  const openUnsuspendModal = (
    user: AdminUserSummary,
  ) => {
    clearMessages()
    setSelectedUser(user)
    setModalType('unsuspend')
  }

  const openDeleteModal = (
    user: AdminUserSummary,
  ) => {
    clearMessages()
    setSelectedUser(user)
    setModalType('delete')
  }

  const handleSuspendUser = async () => {
    if (!selectedUser) {
      return
    }

    const reason = suspensionReason.trim()

    if (!reason) {
      setError('Please enter a suspension reason.')
      return
    }

    setActionLoading(true)
    clearMessages()

    try {
      await adminUsersApi.suspendUser(
        selectedUser.id,
        {
          reason,
        },
      )

      const username = selectedUser.username

      setModalType(null)
      setSelectedUser(null)
      setSuspensionReason('')

      setSuccess(
        `${username}'s account was suspended successfully. The suspension notification should be sent by the backend.`,
      )

      await loadUsers()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to suspend the user account.',
        ),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnsuspendUser = async () => {
    if (!selectedUser) {
      return
    }

    setActionLoading(true)
    clearMessages()

    try {
      await adminUsersApi.unsuspendUser(selectedUser.id)

      const username = selectedUser.username

      setModalType(null)
      setSelectedUser(null)

      setSuccess(
        `${username}'s account was reinstated successfully.`,
      )

      await loadUsers()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to unsuspend the user account.',
        ),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      return
    }

    setActionLoading(true)
    clearMessages()

    try {
      await adminUsersApi.deleteUser(selectedUser.id)

      const username = selectedUser.username

      setModalType(null)
      setSelectedUser(null)

      setSuccess(
        `${username}'s account was deleted successfully. The deletion notification should be sent by the backend.`,
      )

      if (users.length === 1 && page > 1) {
        setPage(currentPage => currentPage - 1)
      } else {
        await loadUsers()
      }
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to delete the user account.',
        ),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const rows: React.ReactNode[][] =
    displayedUsers.map(user => [
      <div
        key={`${user.id}-profile`}
        className="flex items-center gap-3"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 font-bold uppercase text-accent-700">
          {user.username.slice(0, 1)}
        </span>

        <div>
          <p className="font-semibold text-slate-900">
            {user.username}
          </p>

          <p className="text-xs text-slate-500">
            {user.email}
          </p>
        </div>
      </div>,

      <span
        key={`${user.id}-role`}
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
          user.role === 'admin'
            ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
            : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
        }`}
      >
        {user.role}
      </span>,

      <StatusBadge
        key={`${user.id}-status`}
        status={user.status}
      />,

      <span key={`${user.id}-joined`}>
        {formatDate(user.created_at)}
      </span>,

      <div
        key={`${user.id}-actions`}
        className="flex items-center justify-end gap-1"
      >
        <button
          type="button"
          title="View account details"
          onClick={() => void openDetails(user)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <Eye size={16} />
        </button>

        <button
          type="button"
          title="Suspend account"
          onClick={() => openSuspendModal(user)}
          disabled={
            user.role === 'admin' ||
            user.status !== 'active'
          }
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ShieldBan size={16} />
        </button>

        <button
          type="button"
          title="Unsuspend account"
          onClick={() => openUnsuspendModal(user)}
          disabled={user.status !== 'suspended'}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <UserCheck size={16} />
        </button>

        <button
          type="button"
          title="Delete account"
          onClick={() => openDeleteModal(user)}
          disabled={
            user.role === 'admin' ||
            user.status === 'deleted'
          }
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>,
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          User Management
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Search, review, suspend and delete registered
          platform accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Total Users"
          value={total}
          icon={Users}
          trend="All registered accounts"
        />

        <DashboardStatCard
          title="Active Users"
          value={activeUsers}
          icon={UserCheck}
          trend="Shown on this page"
        />

        <DashboardStatCard
          title="Suspended Users"
          value={suspendedUsers}
          icon={UserX}
          trend="Shown on this page"
        />

        <DashboardStatCard
          title="Administrators"
          value={adminUsers}
          icon={UserRound}
          trend="Protected accounts"
        />
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row"
      >
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={searchInput}
            onChange={event =>
              setSearchInput(event.target.value)
            }
            placeholder="Search by username, email or full name"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <select
          value={roleFilter}
          onChange={event => {
            setRoleFilter(
              event.target.value as
                | 'all'
                | 'user'
                | 'admin',
            )
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Administrators</option>
        </select>

        <select
          value={statusFilter}
          onChange={event => {
            setStatusFilter(
              event.target.value as
                | UserAccountStatus
                | '',
            )
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">
            Suspended
          </option>
          <option value="deleted">Deleted</option>
        </select>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-700"
        >
          <Search size={15} />
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {roleFilter === 'all'
            ? total
            : displayedUsers.length}{' '}
          user
          {(roleFilter === 'all'
            ? total
            : displayedUsers.length) === 1
            ? ''
            : 's'}{' '}
          found
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
          Loading users…
        </div>
      ) : (
        <DataTable
          headers={[
            'User Profile',
            'Role',
            'Status',
            'Join Date',
            'Actions',
          ]}
          rows={rows}
          emptyMessage="No users matched your search."
        />
      )}

      {!loading && pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage(currentPage =>
                Math.max(1, currentPage - 1),
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <span className="text-sm font-medium text-slate-500">
            Page {page} of {pages}
          </span>

          <button
            type="button"
            disabled={page >= pages}
            onClick={() =>
              setPage(currentPage =>
                Math.min(
                  pages,
                  currentPage + 1,
                ),
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {modalType && selectedUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {modalType === 'details' && (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">
                      User Account Details
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Review the registered user's account
                      and profile information.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close details"
                  >
                    <X size={18} />
                  </button>
                </div>

                {!userDetails ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    Loading account details…
                  </p>
                ) : (
                  <div className="rounded-2xl border border-slate-200 px-4">
                    <DetailRow
                      label="Username"
                      value={userDetails.username}
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Email"
                      value={userDetails.email}
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Full name"
                      value={
                        userDetails.profile
                          ?.full_name ||
                        'Not provided'
                      }
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Phone"
                      value={
                        userDetails.profile?.phone ||
                        'Not provided'
                      }
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Address"
                      value={
                        userDetails.profile?.address ||
                        'Not provided'
                      }
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Date of birth"
                      value={
                        userDetails.profile?.dob ||
                        'Not provided'
                      }
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Role"
                      value={userDetails.role}
                    />

                    <DetailRow
                      label="Status"
                      value={userDetails.status}
                    />

                    <DetailRow
                      label="Subscription"
                      value={
                        userDetails.subscription_tier
                      }
                    />

                    <DetailRow
                      label="Wallet balance"
                      value={`$${userDetails.balance.toFixed(
                        2,
                      )}`}
                      preserveCapitalisation
                    />

                    <DetailRow
                      label="Registered"
                      value={formatDate(
                        userDetails.created_at,
                      )}
                      preserveCapitalisation
                    />

                    {userDetails.suspended_at && (
                      <DetailRow
                        label="Suspended at"
                        value={formatDate(
                          userDetails.suspended_at,
                        )}
                        preserveCapitalisation
                      />
                    )}

                    {userDetails.suspension_reason && (
                      <DetailRow
                        label="Suspension reason"
                        value={
                          userDetails.suspension_reason
                        }
                        preserveCapitalisation
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {modalType === 'suspend' && (
              <>
                <h2 className="text-xl font-bold text-slate-950">
                  Suspend User Account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Suspend{' '}
                  <strong className="text-slate-800">
                    {selectedUser.username}
                  </strong>
                  ? The user should receive a suspended-account
                  notification after the backend completes this
                  action.
                </p>

                <label
                  htmlFor="suspension-reason"
                  className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Suspension reason
                </label>

                <textarea
                  id="suspension-reason"
                  rows={4}
                  value={suspensionReason}
                  onChange={event =>
                    setSuspensionReason(
                      event.target.value,
                    )
                  }
                  placeholder="Explain why this account is being suspended"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleSuspendUser()
                    }
                    disabled={
                      actionLoading ||
                      !suspensionReason.trim()
                    }
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? 'Suspending…'
                      : 'Suspend Account'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'unsuspend' && (
              <>
                <h2 className="text-xl font-bold text-slate-950">
                  Unsuspend User Account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Reinstate{' '}
                  <strong className="text-slate-800">
                    {selectedUser.username}
                  </strong>
                  ? The user will regain full access and be
                  notified that their account is active again.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleUnsuspendUser()
                    }
                    disabled={actionLoading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? 'Unsuspending…'
                      : 'Unsuspend Account'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'delete' && (
              <>
                <h2 className="text-xl font-bold text-slate-950">
                  Delete User Account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Delete{' '}
                  <strong className="text-slate-800">
                    {selectedUser.username}
                  </strong>
                  's account?
                </p>

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700">
                  This action will prevent the user from
                  accessing the account. The backend should
                  preserve historical auction records and send
                  the user an account-deletion notification.
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleDeleteUser()
                    }
                    disabled={actionLoading}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? 'Deleting…'
                      : 'Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackTypesSection() {
  const [types, setTypes] = useState<FeedbackType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<
    'buyer' | 'seller'
  >('buyer')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<
    string | null
  >(null)
  const [editName, setEditName] = useState('')

  const reload = async () => {
    try {
      const data = await getAllFeedbackTypes()
      setTypes(data)
    } catch {
      setError('Failed to load feedback types.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleCreate = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault()

    if (!newName.trim()) {
      return
    }

    setCreating(true)
    setError('')

    try {
      await createFeedbackType({
        name: newName.trim(),
        reviewer_role: newRole,
      })

      setNewName('')
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to create feedback type.',
        ),
      )
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      return
    }

    setError('')

    try {
      await updateFeedbackType(id, {
        name: editName.trim(),
      })

      setEditId(null)
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(error, 'Failed to rename.'),
      )
    }
  }

  const handleToggle = async (
    feedbackType: FeedbackType,
  ) => {
    setError('')

    try {
      await updateFeedbackType(feedbackType.id, {
        is_active: !feedbackType.is_active,
      })

      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(error, 'Failed to update.'),
      )
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      'Delete this feedback type? This cannot be undone.',
    )

    if (!shouldDelete) {
      return
    }

    setError('')

    try {
      await deleteFeedbackType(id)
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to delete. Deactivate it instead if records reference it.',
        ),
      )
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-400">
        Loading…
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Name
          </label>

          <input
            value={newName}
            onChange={event =>
              setNewName(event.target.value)
            }
            placeholder="e.g. Buyer to Seller"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Reviewer role
          </label>

          <select
            value={newRole}
            onChange={event =>
              setNewRole(
                event.target.value as
                  | 'buyer'
                  | 'seller',
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />

          {creating ? 'Adding…' : 'Add Type'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">
                Name
              </th>

              <th className="px-4 py-3 text-left">
                Reviewer Role
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

              <th className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {types.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No feedback types yet.
                </td>
              </tr>
            ) : (
              types.map(feedbackType => (
                <tr
                  key={feedbackType.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {editId === feedbackType.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={event =>
                            setEditName(
                              event.target.value,
                            )
                          }
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              void handleRename(
                                feedbackType.id,
                              )
                            }

                            if (event.key === 'Escape') {
                              setEditId(null)
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-accent-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            void handleRename(
                              feedbackType.id,
                            )
                          }
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">
                        {feedbackType.name}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        feedbackType.reviewer_role ===
                        'buyer'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {feedbackType.reviewer_role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        feedbackType.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {feedbackType.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setEditId(feedbackType.id)
                          setEditName(feedbackType.name)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        title={
                          feedbackType.is_active
                            ? 'Deactivate'
                            : 'Activate'
                        }
                        onClick={() =>
                          void handleToggle(
                            feedbackType,
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {feedbackType.is_active ? (
                          <ToggleRight
                            size={16}
                            className="text-emerald-600"
                          />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          void handleDelete(
                            feedbackType.id,
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Shared pagination footer — hidden until there is more than one page of results.
function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium text-slate-700">Page {page} of {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// System Monitoring — Platform Activity Stats. Aggregate platform metrics as stat cards.
function ActivityStatsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: getPlatformStats,
  })

  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
        Couldn't load platform stats. The endpoint may not be available yet.
      </div>
    )
  }

  // Never render a hardcoded 0 — show a placeholder until real numbers load.
  const fmt = (v: number | undefined) => (isLoading || v === undefined ? '—' : v.toLocaleString())
  const volume =
    isLoading || data?.total_bid_volume === undefined ? '—' : `$${data.total_bid_volume.toLocaleString()}`

  const cards: { title: string; value: string; icon: LucideIcon }[] = [
    { title: 'Total Users', value: fmt(data?.total_users), icon: Users },
    { title: 'Active Auctions', value: fmt(data?.active_auctions), icon: Gavel },
    { title: 'Total Listings', value: fmt(data?.total_listings), icon: Package },
    { title: 'Total Bids', value: fmt(data?.total_bids), icon: TrendingUp },
    { title: 'Completed Auctions', value: fmt(data?.completed_auctions), icon: CheckCircle2 },
    { title: 'Total Bid Volume', value: volume, icon: DollarSign },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(c => (
        <DashboardStatCard key={c.title} title={c.title} value={c.value} icon={c.icon} />
      ))}
    </div>
  )
}

// System Monitoring — System Logs. Paginated application/service log lines.
function SystemLogsSection() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'system-logs', page],
    queryFn: () => getSystemLogs({ page, size: 20 }),
  })

  if (isLoading) return <p className="text-sm text-slate-400">Loading logs…</p>
  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
        Couldn't load system logs. The endpoint may not be available yet.
      </div>
    )
  }

  const rows = (data?.items ?? []).map(log => [
    new Date(log.timestamp).toLocaleString(),
    <StatusBadge key={log.id} status={log.level} />,
    log.service,
    log.message,
  ])

  return (
    <>
      <DataTable headers={['Timestamp', 'Level', 'Service', 'Message']} rows={rows} emptyMessage="No system logs yet." />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
    </>
  )
}

// System Monitoring — Audit Logs. Paginated record of admin actions (admin_logs table).
function AuditLogsSection() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'audit-logs', page],
    queryFn: () => getAuditLogs({ page, size: 20 }),
  })

  if (isLoading) return <p className="text-sm text-slate-400">Loading audit logs…</p>
  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
        Couldn't load audit logs. The endpoint may not be available yet.
      </div>
    )
  }

  const rows = (data?.items ?? []).map(entry => [
    new Date(entry.created_at).toLocaleString(),
    entry.admin?.username ?? '—',
    entry.action,
    entry.target_id ?? '—',
    entry.details ?? '—',
  ])

  return (
    <>
      <DataTable headers={['Timestamp', 'Admin', 'Action', 'Target', 'Details']} rows={rows} emptyMessage="No audit log entries yet." />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
    </>
  )
}

export default function AdminManagementPage() {
  const { section = 'users' } = useParams<{
    section?: string
  }>()

  if (section === 'users') {
    return <UsersSection />
  }

  if (section === 'feedback-types') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Feedback Types"
          subtitle="Create and manage the feedback types users can submit for auctions."
        />

        <FeedbackTypesSection />
      </div>
    )
  }

  if (section === 'activity-stats') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Platform Activity Stats"
          subtitle="Live platform-wide activity and volume metrics."
        />
        <ActivityStatsSection />
      </div>
    )
  }

  if (section === 'system-logs') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="System Logs"
          subtitle="Application and service logs across the platform."
        />
        <SystemLogsSection />
      </div>
    )
  }

  if (section === 'audit-logs') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Audit Logs"
          subtitle="Record of administrative actions taken on the platform."
        />
        <AuditLogsSection />
      </div>
    )
  }

  if (section === 'listings') {
    return <AdminListingsPage />
  }

  const configs: Record<
    string,
    {
      headers: string[]
      rows: React.ReactNode[][]
    }
  > = {
    listings: {
      headers: [
        'Listing ID',
        'Title',
        'Seller',
        'Current Bid',
        'Status',
      ],

      rows: auctions.map(auction => [
        auction.id,
        auction.title,
        auction.seller.name,
        `$${auction.currentBid.toFixed(2)}`,
        <StatusBadge
          key={auction.id}
          status={auction.status}
        />,
      ]),
    },

    categories: {
      headers: [
        'Category ID',
        'Name',
        'Active Listings',
      ],

      rows: categories.map((category, index) => [
        index + 1,
        category,
        auctions.filter(
          auction => auction.category === category,
        ).length,
      ]),
    },

    cases: {
      headers: [
        'Case ID',
        'Type',
        'Subject',
        'Status',
        'Created',
      ],

      rows: adminCases.map(adminCase => [
        adminCase.case_id,
        adminCase.case_type,
        adminCase.subject,
        <StatusBadge
          key={adminCase.case_id}
          status={adminCase.status}
        />,
        adminCase.created_at,
      ]),
    },

    bids: {
      headers: [
        'Bid ID',
        'Listing',
        'Bidder',
        'Amount',
        'Status',
      ],

      rows: bids.map(bid => [
        bid.bid_id,
        bid.listing_title,
        bid.bidder_id,
        `$${bid.bid_amount.toFixed(2)}`,
        <StatusBadge
          key={bid.bid_id}
          status={bid.status}
        />,
      ]),
    },
  }

  const config = configs[section] || configs.listings

  return (
    <div className="space-y-6">
      <SectionHeader
        title={
          titleMap[section] || 'Admin Management'
        }
        subtitle="Administrative management table ready for backend integration."
      />

      <DataTable
        headers={config.headers}
        rows={config.rows}
      />
    </div>
  )
}
