import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

// Canonical dropdown for the admin pages. appearance-none strips the OS-native chrome
// (double-arrow indicator + intrinsic height that ignores padding); a single chevron is
// drawn in with the same slate tone so every select matches the text/date inputs exactly.
const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'

interface StyledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  // Sizing/spacing for the wrapper (e.g. "mt-1"); the select itself owns the visual style.
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
