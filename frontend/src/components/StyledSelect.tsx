import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

// appearance-none strips the native select chrome so the custom chevron below can replace it.
const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'

interface StyledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  // wrapper spacing only; the select itself owns its visual style
  wrapperClassName?: string
}

export default function StyledSelect({ wrapperClassName = '', children, ...props }: StyledSelectProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className={SELECT_CLASS}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}
