import React, { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import type { Category } from '../api/auctionsApi'

interface FilterPanelProps {
  className?: string
  categories: Category[]
  selectedCategory: string | null
  onCategoryChange: (id: string | null) => void
}

interface SectionProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}

const Section = ({ title, children, isOpen, onToggle }: SectionProps) => (
  <div className="border-b border-slate-200/80 last:border-0">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 text-sm font-semibold text-slate-900 transition-colors hover:text-accent-700"
    >
      {title}
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {isOpen && <div className="pb-4">{children}</div>}
  </div>
)

export default function FilterPanel({ className = '', categories, selectedCategory, onCategoryChange }: FilterPanelProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({ category: true })

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
          <SlidersHorizontal size={18} />
        </span>
        <h3 className="font-semibold text-slate-950">Filters</h3>
      </div>

      <Section title="Category" isOpen={open['category']} onToggle={() => setOpen(o => ({ ...o, category: !o.category }))}>
        {categories.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-400">No categories yet.</p>
        ) : (
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="radio"
                name="category"
                checked={selectedCategory === null}
                onChange={() => onCategoryChange(null)}
                className="border-slate-300 text-accent-600 focus:ring-accent-500"
              />
              All categories
            </label>
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === c.id}
                  onChange={() => onCategoryChange(c.id)}
                  className="border-slate-300 text-accent-600 focus:ring-accent-500"
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
