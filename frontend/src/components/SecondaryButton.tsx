import { Link } from 'react-router-dom'
import React from 'react'

interface SecondaryButtonProps {
  children: React.ReactNode
  to?: string
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  fullWidth?: boolean
}

export default function SecondaryButton({ 
  children, 
  to, 
  onClick, 
  type = 'button', 
  fullWidth = false 
}: SecondaryButtonProps) {
  const className = `inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors ${fullWidth ? 'w-full' : ''}`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return <button type={type} onClick={onClick} className={className}>{children}</button>
}
