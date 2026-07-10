import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Check, X } from 'lucide-react'
import DataTable from '../components/DataTable'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import {
  getAllFeedbackTypes,
  createFeedbackType,
  updateFeedbackType,
  deleteFeedbackType,
} from '../api/feedbackApi'
import type { FeedbackType } from '../api/feedbackApi'

// TODO: Replace with actual data from backend
const auctions: any[] = []
const categories: any[] = []
const users: any[] = []
const bids: any[] = []
const adminCases: any[] = []
const auditLogs: any[] = []

const titleMap: Record<string, string> = {
  users: 'User Management',
  listings: 'Listing Moderation',
  categories: 'Category Management',
  'feedback-types': 'Feedback Types',
  cases: 'Case Queue',
  'audit-logs': 'Audit Logs',
  bids: 'Bid Oversight',
}

function FeedbackTypesSection() {
  const [types, setTypes] = useState<FeedbackType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create form
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'buyer' | 'seller'>('buyer')
  const [creating, setCreating] = useState(false)

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null)
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

  useEffect(() => { reload() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      await createFeedbackType({ name: newName.trim(), reviewer_role: newRole })
      setNewName('')
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create feedback type.')
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    setError('')
    try {
      await updateFeedbackType(id, { name: editName.trim() })
      setEditId(null)
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to rename.')
    }
  }

  const handleToggle = async (ft: FeedbackType) => {
    setError('')
    try {
      await updateFeedbackType(ft.id, { is_active: !ft.is_active })
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback type? This cannot be undone.')) return
    setError('')
    try {
      await deleteFeedbackType(id)
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete. Deactivate it instead if records reference it.')
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Buyer to Seller"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Reviewer role</label>
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value as 'buyer' | 'seller')}
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
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>
      )}

      {/* Types list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Reviewer Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {types.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No feedback types yet.</td>
              </tr>
            ) : (
              types.map(ft => (
                <tr key={ft.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editId === ft.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(ft.id); if (e.key === 'Escape') setEditId(null) }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-accent-500"
                        />
                        <button onClick={() => handleRename(ft.id)} className="text-emerald-600 hover:text-emerald-700"><Check size={15} /></button>
                        <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{ft.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ft.reviewer_role === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {ft.reviewer_role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ft.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {ft.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Rename"
                        onClick={() => { setEditId(ft.id); setEditName(ft.name) }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        title={ft.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(ft)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {ft.is_active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDelete(ft.id)}
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

export default function AdminManagementPage() {
  const { section = 'users' } = useParams<{ section?: string }>()

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

  const configs: Record<string, { headers: string[]; rows: React.ReactNode[][] }> = {
    users: {
      headers: ['User ID', 'Name', 'Email', 'Role', 'Status'],
      rows: users.map((u) => [u.user_id, u.full_name, u.email, u.role, <StatusBadge key={u.user_id} status={u.status} />]),
    },
    listings: {
      headers: ['Listing ID', 'Title', 'Seller', 'Current Bid', 'Status'],
      rows: auctions.map((a) => [a.id, a.title, a.seller.name, `$${a.currentBid.toFixed(2)}`, <StatusBadge key={a.id} status={a.status} />]),
    },
    categories: {
      headers: ['Category ID', 'Name', 'Active Listings'],
      rows: categories.map((c, i) => [i + 1, c, auctions.filter((a) => a.category === c).length]),
    },
    cases: {
      headers: ['Case ID', 'Type', 'Subject', 'Status', 'Created'],
      rows: adminCases.map((c) => [c.case_id, c.case_type, c.subject, <StatusBadge key={c.case_id} status={c.status} />, c.created_at]),
    },
    'audit-logs': {
      headers: ['Log ID', 'Admin', 'Action', 'Timestamp'],
      rows: auditLogs.map((l) => [l.id, l.admin, l.action, l.timestamp]),
    },
    bids: {
      headers: ['Bid ID', 'Listing', 'Bidder', 'Amount', 'Status'],
      rows: bids.map((b) => [b.bid_id, b.listing_title, b.bidder_id, `$${b.bid_amount.toFixed(2)}`, <StatusBadge key={b.bid_id} status={b.status} />]),
    },
  }

  const config = configs[section] || configs.users

  return (
    <div className="space-y-6">
      <SectionHeader
        title={titleMap[section] || 'Admin Management'}
        subtitle="Mock API-ready table shaped around users, listings, bids, categories, cases, and audit logs."
      />
      <DataTable headers={config.headers} rows={config.rows} />
    </div>
  )
}
