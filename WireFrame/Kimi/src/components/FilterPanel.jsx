import { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { categories, conditions } from '../data/mockData'

export default function FilterPanel({ className = '' }) {
  const [open, setOpen] = useState({ category: true, condition: true, price: true })

  const Section = ({ title, id, children }) => (
    <div className="border-b border-gray-200 last:border-0">
      <button onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} className="flex items-center justify-between w-full py-3 text-sm font-medium text-gray-900">
        {title}
        {open[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open[id] && <div className="pb-4">{children}</div>}
    </div>
  )

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">Filters</h3>
      </div>

      <Section title="Category" id="category">
        <div className="space-y-2">
          {categories.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
              {c}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Condition" id="condition">
        <div className="space-y-2">
          {conditions.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="condition" className="border-gray-300 text-accent-600 focus:ring-accent-500" />
              {c}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Price Range" id="price">
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-accent-500 focus:border-accent-500" />
          <span className="text-gray-400">-</span>
          <input type="number" placeholder="Max" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-accent-500 focus:border-accent-500" />
        </div>
      </Section>
    </div>
  )
}