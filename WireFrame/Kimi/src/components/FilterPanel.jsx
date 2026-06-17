import { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { categories, conditions } from '../data/mockData'

export default function FilterPanel({ className = '' }) {
  const [open, setOpen] = useState({ category: true, condition: true, price: true })

  const Section = ({ title, id, children }) => (
    <div className="border-b border-slate-200/80 last:border-0 dark:border-slate-800">
      <button onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} className="flex items-center justify-between w-full py-3 text-sm font-semibold text-slate-900 transition-colors hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-300">
        {title}
        {open[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open[id] && <div className="pb-4">{children}</div>}
    </div>
  )

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
          <SlidersHorizontal size={18} />
        </span>
        <h3 className="font-semibold text-slate-950 dark:text-slate-50">Filters</h3>
      </div>

      <Section title="Category" id="category">
        <div className="space-y-2">
          {categories.map(c => (
            <label key={c.id ?? c} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70">
              <input type="checkbox" className="rounded border-slate-300 text-accent-600 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900" />
              {c.name ?? c}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Condition" id="condition">
        <div className="space-y-2">
          {conditions.map(c => (
            <label key={c} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70">
              <input type="radio" name="condition" className="border-slate-300 text-accent-600 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900" />
              {c}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Price Range" id="price">
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          <span className="text-slate-400">-</span>
          <input type="number" placeholder="Max" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
        </div>
      </Section>
    </div>
  )
}