import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DataTable from '../../components/DataTable'
import StyledSelect from '../../components/StyledSelect'
import AdminFilterBar from '../../components/AdminFilterBar'
import { useOptions } from '../../hooks/useOptions'
import { getAuditLogs } from '../../api/adminApi'
import { Pagination, formatDateTime } from './adminShared'

const EMPTY_FILTERS = { day: '', action: '' }

export default function AuditLogsSection() {
  const actionOptions = useOptions('audit_action')
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'audit-logs', page, applied],
    queryFn: () =>
      getAuditLogs({
        page,
        size: 20,
        day: applied.day || undefined,
        action: applied.action || undefined,
      }),
  })

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    setApplied(draft)
    setPage(1)
  }
  const clear = () => {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }
  const hasDraft = draft.day !== '' || draft.action !== ''

  const filters = (
    <AdminFilterBar onSubmit={search} onClear={clear} showClear={hasDraft}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <p className="mb-1.5 text-xs text-slate-500">Show actions from a single day.</p>
          <input
            type="date"
            value={draft.day}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setDraft(d => ({ ...d, day: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action</label>
          <p className="mb-1.5 text-xs text-slate-500">Filter by the type of admin action.</p>
          <StyledSelect value={draft.action} onChange={e => setDraft(d => ({ ...d, action: e.target.value }))}>
            <option value="">All actions</option>
            {actionOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </StyledSelect>
        </div>
      </div>
    </AdminFilterBar>
  )

  if (isLoading) return <>{filters}<p className="text-sm text-slate-400">Loading audit logs…</p></>
  if (isError) {
    return (
      <>
        {filters}
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't load audit logs. Please try again.
        </div>
      </>
    )
  }

  const rows = (data?.items ?? []).map(entry => [
    formatDateTime(entry.created_at),
    entry.admin_username ?? '—',
    entry.action,
    entry.target_id ?? '—',
    entry.details ?? '—',
  ])

  return (
    <>
      {filters}
      <DataTable headers={['Timestamp', 'Admin', 'Action', 'Target', 'Details']} rows={rows} emptyMessage="No audit log entries match these filters." />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
    </>
  )
}
