import React, { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import type { Category, EnumType } from '../api/auctionsApi'

interface FilterPanelProps {
  className?: string
  categories: Category[]
  selectedCategory: string | null
  onCategoryChange: (id: string | null) => void
  conditions: EnumType[]
  selectedCondition: string | null
  onConditionChange: (value: string | null) => void
  minPrice: string
  maxPrice: string
  onPriceChange: (min: string, max: string) => void
  onClearAll: () => void
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

export default function FilterPanel({
  className = '',
  categories,
  selectedCategory,
  onCategoryChange,
  conditions,
  selectedCondition,
  onConditionChange,
  minPrice,
  maxPrice,
  onPriceChange,
  onClearAll
}: FilterPanelProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({ category: true, condition: true, price: true })

  const hasActiveFilters = selectedCategory !== null || selectedCondition !== null || minPrice !== '' || maxPrice !== ''

  // Local input state for the price fields; committed to the URL only on Apply.
  const [minInput, setMinInput] = useState(minPrice)
  const [maxInput, setMaxInput] = useState(maxPrice)
  const [syncedPrice, setSyncedPrice] = useState({ min: minPrice, max: maxPrice })
  const [priceError, setPriceError] = useState<string | null>(null)

  // Re-hydrate the inputs when the URL-backed props change (e.g. cleared elsewhere).
  if (syncedPrice.min !== minPrice || syncedPrice.max !== maxPrice) {
    setMinInput(minPrice)
    setMaxInput(maxPrice)
    setSyncedPrice({ min: minPrice, max: maxPrice })
    setPriceError(null)
  }

  const applyPrice = () => {
    const min = minInput.trim()
    const max = maxInput.trim()
    const minNum = min === '' ? null : Number(min)
    const maxNum = max === '' ? null : Number(max)

    if (
      (minNum !== null && (Number.isNaN(minNum) || minNum < 0)) ||
      (maxNum !== null && (Number.isNaN(maxNum) || maxNum < 0))
    ) {
      setPriceError('Enter valid non-negative amounts.')
      return
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setPriceError('Min must be less than or equal to max.')
      return
    }

    setPriceError(null)
    onPriceChange(min, max)
  }

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <SlidersHorizontal size={18} />
          </span>
          <h3 className="font-semibold text-slate-950">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-xs font-semibold text-accent-600 transition-colors hover:text-accent-700"
          >
            Clear all
          </button>
        )}
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

      <Section title="Condition" isOpen={open['condition']} onToggle={() => setOpen(o => ({ ...o, condition: !o.condition }))}>
        {conditions.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-400">No conditions yet.</p>
        ) : (
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="radio"
                name="condition"
                checked={selectedCondition === null}
                onChange={() => onConditionChange(null)}
                className="border-slate-300 text-accent-600 focus:ring-accent-500"
              />
              All conditions
            </label>
            {conditions.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                <input
                  type="radio"
                  name="condition"
                  checked={selectedCondition === c.id}
                  onChange={() => onConditionChange(c.id)}
                  className="border-slate-300 text-accent-600 focus:ring-accent-500"
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section title="Price Range" isOpen={open['price']} onToggle={() => setOpen(o => ({ ...o, price: !o.price }))}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-accent-500 focus:ring-accent-500"
            />
            <span className="text-sm text-slate-400">–</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-accent-500 focus:ring-accent-500"
            />
          </div>
          {priceError && <p className="text-xs text-red-600">{priceError}</p>}
          <button
            onClick={applyPrice}
            className="w-full rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
          >
            Apply
          </button>
        </div>
      </Section>
    </div>
  )
}
