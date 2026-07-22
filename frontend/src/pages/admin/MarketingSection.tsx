import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Play, Trash2, Upload } from 'lucide-react'
import {
  activateMarketingVideo,
  deleteMarketingVideo,
  getMarketingVideoUrl,
  listMarketingVideos,
  uploadMarketingVideo,
} from '../../api/marketingApi'
import { formatDate, getErrorMessage } from './adminShared'

export default function MarketingSection() {
  const queryClient = useQueryClient()
  const { data: videoUrl, refetch } = useQuery({
    queryKey: ['marketing-video'],
    queryFn: getMarketingVideoUrl,
  })
  const { data: videos = [] } = useQuery({
    queryKey: ['marketing-videos'],
    queryFn: listMarketingVideos,
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const refreshAll = async () => {
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['marketing-videos'] })])
  }

  const activateMutation = useMutation({
    mutationFn: activateMarketingVideo,
    onSuccess: () => void refreshAll(),
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to activate that video.')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMarketingVideo,
    onSuccess: () => void refreshAll(),
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to delete that video.')),
  })

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadMarketingVideo(file)
      await refreshAll()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to upload video. Please try again.'))
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
            {uploading ? 'Uploading…' : videoUrl ? 'Upload new video' : 'Upload video'}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 font-bold text-slate-950">Video Library</h3>
        <p className="mb-4 text-sm text-slate-500">
          Every upload is kept here — switch the active video without re-uploading.
        </p>

        {videos.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No videos uploaded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {videos.map(video => (
              <div key={video.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {video.original_filename || 'Untitled upload'}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(video.created_at)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {video.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <Check size={12} />
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activateMutation.mutate(video.id)}
                      disabled={activateMutation.isPending}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Set as active
                    </button>
                  )}

                  <button
                    type="button"
                    title={video.is_active ? 'Activate another video before deleting this one' : 'Delete video'}
                    onClick={() => deleteMutation.mutate(video.id)}
                    disabled={video.is_active || deleteMutation.isPending}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
