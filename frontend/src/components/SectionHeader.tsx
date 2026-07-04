import { Link } from 'react-router-dom'
import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actionText?: string
  actionTo?: string
}

export default function SectionHeader({ title, subtitle, actionText, actionTo }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actionText && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100"
        >
          {actionText}
        </Link>
      )}
    </div>
  )
}
