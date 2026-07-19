import React, {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Gavel,
  Pencil,
  Play,
  Plus,
  Reply,
  RefreshCw,
  Search,
  Server,
  ShieldBan,
  Star,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Trash2,
  Upload,
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
import {
  getPlatformStats,
  getSystemLogs,
  getAuditLogs,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminDisputes,
  respondToDispute,
  checkServicesHealth,
  getAdminTestimonials,
  approveTestimonial,
  deleteTestimonial,
  getProhibitedKeywords,
  createProhibitedKeyword,
  deleteProhibitedKeyword,
  getFlaggedAttempts,
  getAiModerationFlags,
} from '../api/adminApi'
import type { AdminCategory, AdminDispute, DisputeStatus, ProhibitedKeyword, KeywordCategory } from '../api/adminApi'
import type { TestimonialResponse } from '../api/supportApi'
import { getMarketingVideoUrl, uploadMarketingVideo } from '../api/marketingApi'

import {
  adminUsersApi,
  type AdminUserDetails,
  type AdminUserSummary,
  type UserAccountStatus,
} from '../services/adminUsersApi'

// TODO: Replace with backend data once a bid-oversight list endpoint exists.
const bids: any[] = []

const titleMap: Record<string, string> = {
  users: 'User Management',
  'feedback-types': 'Feedback Types',
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
       <div className="overflow-x-auto">
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
    </div>
  )
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function CategoriesSection() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [newParentId, setNewParentId] = useState('')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const reload = async () => {
    try {
      const data = await getAdminCategories()
      setCategories(data)
    } catch {
      setError('Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const topLevelCategories = categories.filter(c => !c.parent_id)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!newName.trim() || !newSlug.trim()) {
      return
    }

    setCreating(true)
    setError('')

    try {
      await createAdminCategory({
        name: newName.trim(),
        slug: newSlug.trim(),
        parent_id: newParentId || null,
      })

      setNewName('')
      setNewSlug('')
      setNewParentId('')
      setSlugTouched(false)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to create category.'))
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
      await updateAdminCategory(id, { name: editName.trim() })
      setEditId(null)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to rename.'))
    }
  }

  const handleToggle = async (category: AdminCategory) => {
    setError('')

    try {
      await updateAdminCategory(category.id, { is_active: !category.is_active })
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to update.'))
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      'Delete this category? Categories still referenced by listings will be deactivated instead of deleted.',
    )

    if (!shouldDelete) {
      return
    }

    setError('')

    try {
      await deleteAdminCategory(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to delete category.'))
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
          <input
            value={newName}
            onChange={event => {
              const value = event.target.value
              setNewName(value)
              if (!slugTouched) {
                setNewSlug(slugify(value))
              }
            }}
            placeholder="e.g. Vintage Watches"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Slug</label>
          <input
            value={newSlug}
            onChange={event => {
              setSlugTouched(true)
              setNewSlug(event.target.value)
            }}
            placeholder="vintage-watches"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase alphanumeric with hyphens only"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Parent category</label>
          <select
            value={newParentId}
            onChange={event => setNewParentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          >
            <option value="">None (top-level)</option>
            {topLevelCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? 'Adding…' : 'Add Category'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
       <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map(category => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={event => setEditName(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              void handleRename(category.id)
                            }
                            if (event.key === 'Escape') {
                              setEditId(null)
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-accent-500"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRename(category.id)}
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
                      <span className="font-medium text-slate-900">{category.name}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-500">{category.slug}</td>

                  <td className="px-4 py-3 text-slate-500">
                    {categories.find(c => c.id === category.parent_id)?.name ?? '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        category.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setEditId(category.id)
                          setEditName(category.name)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => void handleToggle(category)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {category.is_active ? (
                          <ToggleRight size={16} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void handleDelete(category.id)}
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
        Couldn't load platform stats. Please try again.
      </div>
    )
  }

  // Never render a hardcoded 0 — show a placeholder until real numbers load.
  const fmt = (v: number | undefined) => (isLoading || v === undefined ? '—' : v.toLocaleString())
  const revenue =
    isLoading || data?.revenue === undefined ? '—' : `$${data.revenue.toLocaleString()}`

  const cards: { title: string; value: string; icon: LucideIcon; trend?: string }[] = [
    { title: 'Total Users', value: fmt(data?.total_users), icon: Users },
    { title: 'Active Auctions', value: fmt(data?.active_auctions), icon: Gavel },
    { title: 'Total Bids', value: fmt(data?.total_bids), icon: TrendingUp },
    { title: 'Subscription Revenue', value: revenue, icon: DollarSign, trend: 'Premium renewals — not sales GMV' },
    { title: 'Suspended Users', value: fmt(data?.suspended_users), icon: ShieldBan },
  ]

  const registrations = data?.new_registrations ?? []
  const regTotal = registrations.reduce((sum, r) => sum + r.count, 0)
  const maxCount = registrations.reduce((m, r) => Math.max(m, r.count), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <DashboardStatCard key={c.title} title={c.title} value={c.value} icon={c.icon} trend={c.trend} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">New Registrations (30d)</span>
          <span className="text-lg font-bold text-slate-950">{isLoading ? '—' : regTotal.toLocaleString()}</span>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-slate-400">No registrations in the last 30 days.</p>
        ) : (
          <div className="flex h-16 items-end gap-1">
            {registrations.map(r => (
              <div
                key={r.date}
                title={`${r.date}: ${r.count}`}
                style={{ height: maxCount ? `${Math.max((r.count / maxCount) * 100, 4)}%` : '4%' }}
                className="flex-1 rounded-t bg-accent-300"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// System Monitoring — live up/down status for each backend microservice, pinged directly from the browser.
function ServiceHealthPanel() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'service-health'],
    queryFn: checkServicesHealth,
    refetchInterval: 30_000,
  })

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-950">Service Health</h3>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          {dataUpdatedAt ? `Checked ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Check now'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Checking services…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(data ?? []).map(service => (
            <div
              key={service.name}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                service.status === 'up'
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : 'border-red-100 bg-red-50/60'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  service.status === 'up' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {service.status === 'up' ? <Check size={16} /> : <X size={16} />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{service.name}</p>
                <p className={`text-xs font-semibold ${service.status === 'up' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {service.status === 'up' ? `Online · ${service.latencyMs}ms` : `Offline${service.detail ? ` · ${service.detail}` : ''}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
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
        Couldn't load audit logs. Please try again.
      </div>
    )
  }

  const rows = (data?.items ?? []).map(entry => [
    new Date(entry.created_at).toLocaleString(),
    entry.admin_username ?? '—',
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

function CasesSection() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | DisputeStatus>('')

  const [respondId, setRespondId] = useState<string | null>(null)
  const [respondStatus, setRespondStatus] = useState<DisputeStatus>('in_review')
  const [respondNote, setRespondNote] = useState('')
  const [responding, setResponding] = useState(false)

  const reload = async () => {
    try {
      const data = await getAdminDisputes(statusFilter || undefined)
      setDisputes(data)
    } catch {
      setError('Failed to load support cases.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const openRespond = (dispute: AdminDispute) => {
    setRespondId(dispute.id)
    setRespondStatus(dispute.status === 'open' ? 'in_review' : dispute.status)
    setRespondNote(dispute.resolution_note || '')
    setError('')
  }

  const handleRespond = async (id: string) => {
    setError('')
    setResponding(true)

    try {
      await respondToDispute(id, {
        status: respondStatus,
        resolution_note: respondNote.trim() || undefined,
      })
      setRespondId(null)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to update case.'))
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">Filter by status</label>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as '' | DisputeStatus)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {disputes.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          No support cases found.
        </p>
      ) : (
        <div className="space-y-3">
          {disputes.map(dispute => (
            <div key={dispute.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{dispute.subject || dispute.category}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {dispute.category} · {formatDate(dispute.created_at)}
                  </p>
                </div>
                <StatusBadge status={dispute.status} />
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">{dispute.description}</p>

              {dispute.resolution_note && respondId !== dispute.id && (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Resolution note</p>
                  <p className="mt-1 leading-6">{dispute.resolution_note}</p>
                </div>
              )}

              {respondId === dispute.id ? (
                <div className="mt-4 space-y-3 rounded-xl border border-accent-100 bg-accent-50/40 p-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
                    <select
                      value={respondStatus}
                      onChange={event => setRespondStatus(event.target.value as DisputeStatus)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Resolution note</label>
                    <textarea
                      value={respondNote}
                      onChange={event => setRespondNote(event.target.value)}
                      rows={3}
                      placeholder="Explain the resolution to the reporting user…"
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => void handleRespond(dispute.id)}
                      className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
                    >
                      {responding ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespondId(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openRespond(dispute)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-50"
                  >
                    <Reply size={14} />
                    Respond
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<TestimonialResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reload = async () => {
    try {
      const data = await getAdminTestimonials()
      setTestimonials(data)
    } catch {
      setError('Failed to load testimonials.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleApprove = async (id: string) => {
    setError('')
    setApprovingId(id)

    try {
      await approveTestimonial(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to approve testimonial.'))
    } finally {
      setApprovingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('Remove this testimonial? This cannot be undone.')
    if (!shouldDelete) return

    setError('')
    setDeletingId(id)
    try {
      await deleteTestimonial(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to remove testimonial.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {testimonials.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          No testimonials submitted yet.
        </p>
      ) : (
        <div className="space-y-3">
          {testimonials.map(t => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className={i < t.rating ? 'fill-accent-600 text-accent-600' : 'text-slate-200 fill-slate-200'} />
                  ))}
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    t.is_featured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {t.is_featured ? 'Approved' : 'Pending Review'}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">{t.content}</p>
              <p className="mt-2 text-xs text-slate-400">Submitted {formatDate(t.created_at)}</p>

              <div className="mt-3 flex justify-end gap-2">
                {!t.is_featured && (
                  <button
                    type="button"
                    disabled={approvingId === t.id}
                    onClick={() => void handleApprove(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-50 disabled:opacity-60"
                  >
                    <Check size={14} />
                    {approvingId === t.id ? 'Approving…' : 'Approve for display'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={deletingId === t.id}
                  onClick={() => void handleDelete(t.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {deletingId === t.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProhibitedKeywordsPanel() {
  const [keywords, setKeywords] = useState<ProhibitedKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState<KeywordCategory>('illegal_item')
  const [adding, setAdding] = useState(false)

  const reload = async () => {
    try {
      const data = await getProhibitedKeywords()
      setKeywords(data)
    } catch {
      setError('Failed to load prohibited keywords.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newKeyword.trim()) return

    setAdding(true)
    setError('')
    try {
      await createProhibitedKeyword(newKeyword.trim(), newCategory)
      setNewKeyword('')
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to add keyword.'))
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('Remove this keyword from the prohibited list?')
    if (!shouldDelete) return

    setError('')
    try {
      await deleteProhibitedKeyword(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to remove keyword.'))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">Prohibited Keywords</h3>
      <p className="mb-4 text-sm text-slate-500">
        Listings (including drafts) can't be saved if their title, description, or brand contains
        any of these words — matching is case-insensitive.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Keyword</label>
          <input
            value={newKeyword}
            onChange={event => setNewKeyword(event.target.value)}
            placeholder="e.g. heroin"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
          <select
            value={newCategory}
            onChange={event => setNewCategory(event.target.value as KeywordCategory)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          >
            <option value="illegal_item">Illegal item</option>
            <option value="profanity">Profanity</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />
          {adding ? 'Adding…' : 'Add Keyword'}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : keywords.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          No prohibited keywords yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => {
            const isProfanity = kw.category === 'profanity'
            return (
              <span
                key={kw.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
                  isProfanity
                    ? 'bg-amber-50 text-amber-700 ring-amber-100'
                    : 'bg-red-50 text-red-700 ring-red-100'
                }`}
              >
                {kw.keyword}
                <span className="text-[10px] font-bold uppercase opacity-60">
                  {isProfanity ? 'profanity' : 'illegal'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(kw.id)}
                  className={isProfanity ? 'text-amber-400 hover:text-amber-600' : 'text-red-400 hover:text-red-600'}
                  title="Remove keyword"
                >
                  <X size={13} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FlaggedAttemptsPanel() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'flagged-attempts', page],
    queryFn: () => getFlaggedAttempts({ page, size: 20 }),
  })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">Flagged Attempts</h3>
      <p className="mb-4 text-sm text-slate-500">
        Users who tried to save a listing containing a prohibited keyword, and what triggered it.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't load flagged attempts. Please try again.
        </div>
      ) : (
        <>
          <DataTable
            headers={['Timestamp', 'User', 'Field', 'Keyword', 'Attempted Text']}
            rows={(data?.items ?? []).map(attempt => [
              formatDate(attempt.created_at),
              attempt.username ?? '—',
              <span key={attempt.id} className="capitalize">{attempt.field}</span>,
              <span key={attempt.id} className="font-semibold text-red-700">{attempt.keyword_matched}</span>,
              <span key={attempt.id} className="line-clamp-2 max-w-xs text-slate-500">{attempt.attempted_text}</span>,
            ])}
            emptyMessage="No flagged attempts yet."
          />
          <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function AIModerationFlagsPanel() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'ai-moderation-flags', page],
    queryFn: () => getAiModerationFlags({ page, size: 20 }),
  })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">AI-Flagged Listings</h3>
      <p className="mb-4 text-sm text-slate-500">
        Listings that passed the keyword filter but were flagged by the OpenAI moderation
        check for manual review. These are signals, not automatic blocks — nothing here has
        been rejected.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't load AI-flagged listings. Please try again.
        </div>
      ) : (
        <>
          <DataTable
            headers={['Timestamp', 'User', 'Field', 'Categories', 'Flagged Text']}
            rows={(data?.items ?? []).map(flag => [
              formatDate(flag.created_at),
              flag.username ?? '—',
              <span key={flag.id} className="capitalize">{flag.field}</span>,
              <span key={flag.id} className="font-semibold text-amber-700">{flag.categories}</span>,
              <span key={flag.id} className="line-clamp-2 max-w-xs text-slate-500">{flag.flagged_text}</span>,
            ])}
            emptyMessage="No AI-flagged listings yet."
          />
          <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function MarketingSection() {
  const { data: videoUrl, refetch } = useQuery({
    queryKey: ['marketing-video'],
    queryFn: getMarketingVideoUrl,
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadMarketingVideo(file)
      await refetch()
    } catch {
      setError('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">Homepage Hero Video</h3>
            <p className="text-sm text-slate-500">Shown at the top of the public landing page.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-accent-700">
            <Upload size={14} />
            {uploading ? 'Uploading…' : videoUrl ? 'Replace video' : 'Upload video'}
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>

        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {videoUrl ? (
            <video src={videoUrl} controls className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Play size={32} />
              <p className="text-sm">No video uploaded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
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
        <ServiceHealthPanel />
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

  if (section === 'moderation') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Moderation"
          subtitle="Manage prohibited listing content and review blocked attempts."
        />
        <ProhibitedKeywordsPanel />
        <FlaggedAttemptsPanel />
        <AIModerationFlagsPanel />
      </div>
    )
  }

  if (section === 'categories') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Category Management"
          subtitle="Create and manage the categories listings can be filed under."
        />
        <CategoriesSection />
      </div>
    )
  }

  if (section === 'cases') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Case Queue"
          subtitle="Review and respond to support tickets submitted by users."
        />
        <CasesSection />
      </div>
    )
  }

  if (section === 'testimonials') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Testimonials"
          subtitle="Approve user-submitted stories for public display."
        />
        <TestimonialsSection />
      </div>
    )
  }

  if (section === 'marketing') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Marketing"
          subtitle="Manage the hero video shown on the public landing page."
        />
        <MarketingSection />
      </div>
    )
  }

  const configs: Record<
    string,
    {
      headers: string[]
      rows: React.ReactNode[][]
    }
  > = {
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

  const config = configs[section] || configs.bids

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
