import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import StyledSelect from '../../components/StyledSelect'
import AdminFilterBar from '../../components/AdminFilterBar'
import { useOptions } from '../../hooks/useOptions'
import { getSystemLogs } from '../../api/adminApi'
import { Pagination, formatDateTime } from './adminShared'

// Date input style, kept in sync with StyledSelect so the whole filter row matches.
const LOG_FILTER_CONTROL =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'

const EMPTY_LOG_FILTERS = { day: '', level: '', service: '' }

export default function SystemLogsSection() {
  const levelOptions = useOptions('log_level')
  const serviceOptions = useOptions('log_service')
  const [page, setPage] = useState(1)
  // Draft values live in the form; they only drive the query once "Search" applies them.
  const [draft, setDraft] = useState(EMPTY_LOG_FILTERS)
  const [applied, setApplied] = useState(EMPTY_LOG_FILTERS)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'system-logs', page, applied],
    queryFn: () =>
      getSystemLogs({
        page,
        size: 20,
        day: applied.day || undefined,
        level: applied.level || undefined,
        service: applied.service || undefined,
      }),
  })

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    setApplied(draft)
    setPage(1)
  }
  const clear = () => {
    setDraft(EMPTY_LOG_FILTERS)
    setApplied(EMPTY_LOG_FILTERS)
    setPage(1)
  }
  const hasDraft = draft.day !== '' || draft.level !== '' || draft.service !== ''

  const filters = (
    <AdminFilterBar onSubmit={search} onClear={clear} showClear={hasDraft}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <p className="mb-1.5 text-xs text-slate-500">Show logs from a single day.</p>
          <input
            type="date"
            value={draft.day}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setDraft(d => ({ ...d, day: e.target.value }))}
            className={LOG_FILTER_CONTROL}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
          <p className="mb-1.5 text-xs text-slate-500">Filter by severity of the entry.</p>
          <StyledSelect value={draft.level} onChange={e => setDraft(d => ({ ...d, level: e.target.value }))}>
            <option value="">All levels</option>
            {levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
          <p className="mb-1.5 text-xs text-slate-500">Filter by the source microservice.</p>
          <StyledSelect value={draft.service} onChange={e => setDraft(d => ({ ...d, service: e.target.value }))}>
            <option value="">All services</option>
            {serviceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </div>
      </div>
    </AdminFilterBar>
  )

  if (isLoading) return <>{filters}<p className="text-sm text-slate-400">Loading logs…</p></>
  if (isError) {
    return (
      <>
        {filters}
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't load system logs. The endpoint may not be available yet.
        </div>
      </>
    )
  }

  const rows = (data?.items ?? []).map(log => [
    formatDateTime(log.timestamp),
    <StatusBadge key={log.id} status={log.level} />,
    log.service,
    log.message,
  ])

  return (
    <>
      {filters}
      <DataTable headers={['Timestamp', 'Level', 'Service', 'Message']} rows={rows} emptyMessage="No system logs match these filters." />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
    </>
  )
}
