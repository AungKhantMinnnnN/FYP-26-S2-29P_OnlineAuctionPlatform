import React from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ComponentType<any>
}

export default function FormInput({ label, type = 'text', placeholder, value, onChange, error, icon: Icon, className = '', ...props }: FormInputProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...props}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
              : 'border-slate-200 focus:border-accent-500 focus:ring-accent-500/15'
          } ${Icon ? 'pl-10' : ''} ${className}`}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
