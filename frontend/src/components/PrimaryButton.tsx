import { Link } from 'react-router-dom'
import React from 'react'

interface PrimaryButtonProps {
  children: React.ReactNode
  to?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger'
}

export default function PrimaryButton({
  children,
  to,
  onClick,
  type = 'button',
  fullWidth = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const colorClasses = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-accent-600 hover:bg-accent-700 focus:ring-accent-500'
  const className = `inline-flex items-center justify-center rounded-full ${colorClasses} px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
    fullWidth ? 'w-full' : ''
  }`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}
