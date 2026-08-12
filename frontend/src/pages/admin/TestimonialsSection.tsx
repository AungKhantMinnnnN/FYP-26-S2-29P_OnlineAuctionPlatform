import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Star, Trash2, X } from 'lucide-react'
import { approveTestimonial, deleteTestimonial, getAdminTestimonials, unfeatureTestimonial } from '../../api/adminApi'
import { formatDate, getErrorMessage } from './adminShared'
import type { TestimonialResponse } from '../../api/supportApi'

export default function TestimonialsSection() {
  const queryClient = useQueryClient()
  const [testimonials, setTestimonials] = useState<TestimonialResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
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

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    setError('')
    setTogglingId(id)

    try {
      await (featured ? approveTestimonial(id) : unfeatureTestimonial(id))
      await reload()
      queryClient.invalidateQueries({ queryKey: ['feedback', 'public'] })
    } catch (error: any) {
      setError(getErrorMessage(error, featured ? 'Failed to approve testimonial.' : 'Failed to unfeature testimonial.'))
    } finally {
      setTogglingId(null)
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
      queryClient.invalidateQueries({ queryKey: ['feedback', 'public'] })
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
                {t.is_featured ? (
                  <button
                    type="button"
                    disabled={togglingId === t.id}
                    onClick={() => void handleToggleFeatured(t.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                  >
                    <X size={14} />
                    {togglingId === t.id ? 'Unfeaturing…' : 'Unfeature'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={togglingId === t.id}
                    onClick={() => void handleToggleFeatured(t.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-50 disabled:opacity-60"
                  >
                    <Check size={14} />
                    {togglingId === t.id ? 'Approving…' : 'Approve for display'}
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
