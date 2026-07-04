import { Link } from 'react-router-dom'
import React from 'react'

interface SecondaryButtonProps {
  children: React.ReactNode
  to?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  disabled?: boolean
}

export default function SecondaryButton({
  children,
  to,
  onClick,
  type = 'button',
  fullWidth = false,
  disabled = false,
}: SecondaryButtonProps) {
  const className = `inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
    fullWidth ? 'w-full' : ''
  }`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}
