import React from 'react'

interface SelectFieldProps {
  label: string
  value?: any
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: any[]
  placeholder?: string
}

export default function SelectField({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder 
}: SelectFieldProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o, index) => (
          <option key={o.value ?? o ?? index} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}
