import React, { useId } from 'react'

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export default function TextAreaField({ label, placeholder, value, onChange, rows = 4, className = '', id, ...props }: TextAreaFieldProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  return (
    <div>
      {label && <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        id={textareaId}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        {...props}
        className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 ${className}`}
      />
    </div>
  )
}
