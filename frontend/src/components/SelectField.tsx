import React from 'react'

interface Option {
  value?: string | number
  label?: string
}

interface SelectFieldProps {
  label: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: (Option | string | number)[]
  placeholder?: string
}

export default function SelectField({ label, value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o, index) => {
          const val = typeof o === 'object' ? o.value ?? '' : o
          const lab = typeof o === 'object' ? o.label ?? '' : o
          return (
            <option key={index} value={val}>
              {lab}
            </option>
          )
        })}
      </select>
    </div>
  )
}
