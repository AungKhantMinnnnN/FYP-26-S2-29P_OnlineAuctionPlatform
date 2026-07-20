/* eslint-disable react-refresh/only-export-components -- shared admin utilities: helper fns co-located with two presentational primitives (DetailRow, Pagination) */
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const USERS_PAGE_SIZE = 10

export function getErrorMessage(
  error: any,
  fallback: string,
): string {
  return error?.response?.data?.detail || fallback
}

export function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return 'Not available'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function DetailRow({
  label,
  value,
  preserveCapitalisation = false,
}: {
  label: string
  value: string
  preserveCapitalisation?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`max-w-[65%] text-right text-sm font-semibold text-slate-900 ${
          preserveCapitalisation ? '' : 'capitalize'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium text-slate-700">Page {page} of {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// System Monitoring — Platform Activity Stats. Aggregate platform metrics as stat cards.
