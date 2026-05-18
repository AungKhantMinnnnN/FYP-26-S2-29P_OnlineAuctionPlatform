import React from 'react'

interface TextAreaFieldProps {
  label: string
  placeholder?: string
  value?: any
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  defaultValue?: any
}

export default function TextAreaField({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  rows = 4,
  defaultValue
}: TextAreaFieldProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-y"
      />
    </div>
  )
}
