import { Link } from 'react-router-dom'
import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actionText?: string
  actionTo?: string
}

export default function SectionHeader({ 
  title, 
  subtitle, 
  actionText, 
  actionTo 
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actionText && actionTo && (
        <Link to={actionTo} className="text-sm font-medium text-accent-600 hover:text-accent-700">
          {actionText}
        </Link>
      )}
    </div>
  )
}
