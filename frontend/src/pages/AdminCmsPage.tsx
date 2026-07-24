import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Puck, Render } from '@puckeditor/core'
import type { Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { ArrowLeft, Loader2, Eye, History, X } from 'lucide-react'
import { puckConfig } from '../cms/puckConfig'
import { getDraft, saveDraft, publish } from '../api/cmsApi'
import { getErrorMessage } from './admin/adminShared'
import VersionHistoryPanel from '../cms/VersionHistoryPanel'

const SLUG = 'landing'

export default function AdminCmsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [previewData, setPreviewData] = useState<Data | null>(null)
  const [previewLabel, setPreviewLabel] = useState('Preview as published (guest view)')
  const [showHistory, setShowHistory] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms', SLUG, 'draft'],
    queryFn: () => getDraft(SLUG),
  })

  const saveDraftMutation = useMutation({
    mutationFn: (content: Data) => saveDraft(SLUG, content),
    onSuccess: () => {
      setErrorMessage(null)
      setStatusMessage('Draft saved.')
      setTimeout(() => setStatusMessage(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['cms', SLUG, 'draft'] })
    },
    onError: (err) => setErrorMessage(getErrorMessage(err, "Couldn't save the draft. Please try again.")),
  })

  const publishMutation = useMutation({
    mutationFn: (content: Data) => publish(SLUG, content),
    onSuccess: () => {
      setErrorMessage(null)
      setStatusMessage('Published — the live landing page is now updated.')
      setTimeout(() => setStatusMessage(null), 4000)
      queryClient.invalidateQueries({ queryKey: ['cms', SLUG, 'published'] })
      queryClient.invalidateQueries({ queryKey: ['cms', SLUG, 'draft'] })
    },
    onError: (err) => setErrorMessage(getErrorMessage(err, "Couldn't publish. Please try again.")),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-accent-600" size={28} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Couldn't load the landing page draft.
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {(statusMessage || errorMessage) && (
        <div className={`px-4 py-2 text-sm text-center ${errorMessage ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {errorMessage ?? statusMessage}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Puck
          config={puckConfig}
          data={data.content}
          headerTitle="Landing Page"
          renderHeaderActions={({ state }) => (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/marketing')}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewLabel('Preview as published (guest view)')
                  setPreviewData(state.data)
                }}
                className="flex items-center gap-1.5 text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                <Eye size={16} /> Preview
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                <History size={16} /> History
              </button>
              <button
                type="button"
                onClick={() => saveDraftMutation.mutate(state.data)}
                disabled={saveDraftMutation.isPending}
                className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate(state.data)}
                disabled={publishMutation.isPending}
                className="text-sm font-bold bg-accent-600 text-white rounded-lg px-4 py-1.5 hover:brightness-110 disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          )}
        />
      </div>
      {previewData && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
            <span className="text-sm font-semibold text-slate-700">{previewLabel}</span>
            <button onClick={() => setPreviewData(null)} className="text-slate-500 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-12 space-y-20">
            <Render config={puckConfig} data={previewData} />
          </div>
        </div>
      )}
      {showHistory && (
        <VersionHistoryPanel
          slug={SLUG}
          onClose={() => setShowHistory(false)}
          onPreview={(content, label) => {
            setShowHistory(false)
            setPreviewLabel(`Previewing version from ${label}`)
            setPreviewData(content)
          }}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  )
}
