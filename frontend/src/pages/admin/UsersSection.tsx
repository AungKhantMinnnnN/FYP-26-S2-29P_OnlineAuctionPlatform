import React, { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search, ShieldBan, Trash2, UserCheck, UserRound, UserX, Users, X } from 'lucide-react'
import DataTable from '../../components/DataTable'
import DashboardStatCard from '../../components/DashboardStatCard'
import StatusBadge from '../../components/StatusBadge'
import StyledSelect from '../../components/StyledSelect'
import { useOptions } from '../../hooks/useOptions'
import { adminUsersApi } from '../../services/adminUsersApi'
import { DetailRow, USERS_PAGE_SIZE, formatDate, getErrorMessage } from './adminShared'
import type { AdminUserDetails, AdminUserSummary } from '../../services/adminUsersApi'

export default function UsersSection() {
  const roleOptions = useOptions('user_role')
  const statusOptions = useOptions('user_status')
  const [users, setUsers] = useState<AdminUserSummary[]>([])

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // '' / 'all' are the "no filter" sentinels; real values come from the DB option sets.
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')

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

        <StyledSelect
          value={roleFilter}
          onChange={event => setRoleFilter(event.target.value)}
        >
          <option value="all">All roles</option>
          {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </StyledSelect>

        <StyledSelect
          value={statusFilter}
          onChange={event => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </StyledSelect>

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
