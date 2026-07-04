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
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actionText && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100 dark:border-accent-900/60 dark:bg-accent-950/40 dark:text-accent-300 dark:hover:bg-accent-950/70"
        >
          {actionText}
        </Link>
      )}
    </div>
  )
}
