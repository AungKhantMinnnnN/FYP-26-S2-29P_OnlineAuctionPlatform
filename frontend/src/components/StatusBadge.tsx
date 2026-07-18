const map: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  ended: 'bg-slate-100 text-slate-700 ring-slate-200',
  sold: 'bg-accent-50 text-accent-700 ring-accent-200',
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  outbid: 'bg-red-50 text-red-700 ring-red-200',
  won: 'bg-accent-50 text-accent-700 ring-accent-200',
  leading: 'bg-blue-50 text-blue-700 ring-blue-200',
  reported: 'bg-orange-50 text-orange-700 ring-orange-200',
  open: 'bg-amber-50 text-amber-700 ring-amber-200',
  in_review: 'bg-blue-50 text-blue-700 ring-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-300',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
  deleted: 'bg-slate-100 text-slate-600 ring-slate-300',
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const normalisedStatus = status.toLowerCase()

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
        map[normalisedStatus] || map.pending
      }`}
    >
      {status}
    </span>
  )
}