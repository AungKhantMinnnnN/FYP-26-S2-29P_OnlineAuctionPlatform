import { Link } from 'react-router-dom'
import React from 'react'

interface PrimaryButtonProps {
  children: React.ReactNode
  to?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  disabled?: boolean
}

export default function PrimaryButton({
  children,
  to,
  onClick,
  type = 'button',
  fullWidth = false,
  disabled = false,
}: PrimaryButtonProps) {
  const className = `inline-flex items-center justify-center rounded-full bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
    fullWidth ? 'w-full' : ''
  }`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}
