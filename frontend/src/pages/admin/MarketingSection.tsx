import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Upload } from 'lucide-react'
import { getMarketingVideoUrl, uploadMarketingVideo } from '../../api/marketingApi'
import { getErrorMessage } from './adminShared'

export default function MarketingSection() {
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
