import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { getFormMetadata } from '../api/auctionsApi'
import type { Category } from '../api/auctionsApi'
import { getMyInterests, updateMyInterests } from '../api/interestsApi'
import PrimaryButton from '../components/PrimaryButton'
import EmptyState from '../components/EmptyState'

export default function ChooseInterestsPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hydratedIds, setHydratedIds] = useState<string[] | null>(null)

  const {
    data: metadata,
    isLoading: categoriesLoading,
    isError: categoriesError
  } = useQuery({
    queryKey: ['form_metadata'],
    queryFn: getFormMetadata
  })

  // Pre-select any existing interests. The endpoint may not exist yet —
  // retry:false and treat any failure as an empty selection so the page still works.
  const { data: savedInterests } = useQuery({
    queryKey: ['my-interests'],
    queryFn: getMyInterests,
    retry: false
  })

  // Seed the selection from saved interests once they load. Render-time adjustment
  // guarded so it only runs when the fetched ids change (avoids setState-in-effect).
  if (savedInterests?.category_ids && savedInterests.category_ids !== hydratedIds) {
    setHydratedIds(savedInterests.category_ids)
    setSelected(new Set(savedInterests.category_ids))
  }

  const categories: Category[] = metadata?.categories ?? []

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => updateMyInterests(Array.from(selected)),
    onSuccess: () => navigate('/dashboard'),
    onError: () => setSaveError("We couldn't save your interests right now. Please try again.")
  })

  const handleSave = () => {
    setSaveError(null)
    saveMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">What are you interested in?</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a few categories so we can personalise your recommendations. You can change these anytime.</p>
        </div>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {saveError}
          </div>
        )}

        {categoriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-accent-600" size={28} />
          </div>
        ) : categoriesError ? (
          <div className="py-4">
            <EmptyState message="We couldn't load categories right now. Please try again later." />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-4">
            <EmptyState message="No categories are available yet." />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {categories.map(cat => {
              const isSelected = selected.has(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-accent-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check size={15} />}
                  {cat.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Skip for now
          </button>
          <PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || selected.size === 0}
          >
            {saveMutation.isPending ? 'Saving...' : `Save${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
