import { Search, SlidersHorizontal } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import PrimaryButton from './PrimaryButton'
import SecondaryButton from './SecondaryButton'

// Shared filter card layout so every admin list view looks the same.
export default function AdminFilterBar({
  onSubmit,
  onClear,
  showClear = false,
  children,
}: {
  onSubmit: (e: FormEvent) => void
  onClear: () => void
  showClear?: boolean
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
          <SlidersHorizontal size={18} />
        </span>
        <h3 className="font-semibold text-slate-950">Filters</h3>
      </div>

      {children}

      <div className="mt-5 flex items-center justify-end gap-3">
        {showClear && (
          <SecondaryButton type="button" onClick={onClear}>
            Clear
          </SecondaryButton>
        )}
        <PrimaryButton type="submit">
          <Search size={15} className="mr-2" />
          Search
        </PrimaryButton>
      </div>
    </form>
  )
}
