import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, Eye, RotateCcw, X } from 'lucide-react'
import type { Data } from '@puckeditor/core'
import { listVersions, getVersion, rollback } from '../api/cmsApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { formatDate, getErrorMessage } from '../pages/admin/adminShared'

type VersionHistoryPanelProps = {
  slug: string
  onClose: () => void
  onPreview: (content: Data, label: string) => void
  onRestored: () => void
}

function describeVersion(note: string | null): string | null {
  if (!note) return null
  const rollbackMatch = note.match(/^rollback to (.+)$/)
  if (rollbackMatch) return `Restored from a version published ${formatDate(rollbackMatch[1])}`
  if (note === 'publish') return 'Published from the editor'
  return note
}

export default function VersionHistoryPanel({ slug, onClose, onPreview, onRestored }: VersionHistoryPanelProps) {
  const { user } = useAuth()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: versions, isLoading } = useQuery({
    queryKey: ['cms', slug, 'versions'],
    queryFn: () => listVersions(slug),
  })

  const previewMutation = useMutation({
    mutationFn: (versionId: string) => getVersion(versionId),
    onSuccess: (version) => onPreview(version.content, formatDate(version.created_at)),
    onError: (err) => setError(getErrorMessage(err, "Couldn't load that version.")),
  })

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => rollback(slug, versionId),
    onSuccess: onRestored,
    onError: (err) => setError(getErrorMessage(err, "Couldn't restore that version.")),
  })

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <Clock size={16} /> Version History
        </div>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !versions || versions.length === 0 ? (
          <p className="text-sm text-slate-400">No published versions yet.</p>
        ) : (
          versions.map((v, i) => (
            <div key={v.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  {i === 0 ? 'Current (published)' : formatDate(v.created_at)}
                </span>
                {v.created_by && v.created_by === user?.id && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">You</span>
                )}
              </div>
              {i === 0 && <p className="text-[11px] text-slate-400">{formatDate(v.created_at)}</p>}
              {describeVersion(v.note) && <p className="text-xs text-slate-500">{describeVersion(v.note)}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => previewMutation.mutate(v.id)}
                  disabled={previewMutation.isPending}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 disabled:opacity-50"
                >
                  <Eye size={13} /> Preview
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(v.id)}
                    className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:text-accent-800 border border-accent-200 rounded-lg px-2.5 py-1"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={confirmId !== null} onClose={() => setConfirmId(null)} title="Restore this version?">
        <p className="text-sm text-slate-600 mb-5">
          This immediately republishes the selected version as the live landing page and discards any
          unpublished draft changes. The current published version isn't lost — restoring adds a new
          entry to this history, so it can always be undone the same way.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmId(null)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => confirmId && restoreMutation.mutate(confirmId)}
            disabled={restoreMutation.isPending}
            className="text-sm font-bold bg-accent-600 text-white rounded-lg px-4 py-2 hover:brightness-110 disabled:opacity-50"
          >
            {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
