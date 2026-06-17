import React from 'react'

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export default function TextAreaField({ label, placeholder, value, onChange, rows = 4, className = '', ...props }: TextAreaFieldProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        {...props}
        className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
      />
    </div>
  )
}
