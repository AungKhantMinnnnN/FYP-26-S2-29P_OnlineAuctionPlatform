import { useEffect, useState } from 'react'
import { Reply } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import StyledSelect from '../../components/StyledSelect'
import { useOptions } from '../../hooks/useOptions'
import { getAdminDisputes, respondToDispute } from '../../api/adminApi'
import { formatDate, getErrorMessage } from './adminShared'
import type { AdminDispute, DisputeStatus } from '../../api/adminApi'

export default function CasesSection() {
  const statusOptions = useOptions('dispute_status')
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
        <StyledSelect
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as '' | DisputeStatus)}
          wrapperClassName="min-w-[160px]"
        >
          <option value="">All</option>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </StyledSelect>
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
                  {dispute.listing && (
                    <p className="mt-1 text-xs font-medium text-accent-700">Re: {dispute.listing.title}</p>
                  )}
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
                    <StyledSelect
                      value={respondStatus}
                      onChange={event => setRespondStatus(event.target.value as DisputeStatus)}
                    >
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </StyledSelect>
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
