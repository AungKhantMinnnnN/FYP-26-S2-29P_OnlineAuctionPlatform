const map: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  ended: 'bg-slate-100 text-slate-700 ring-slate-200',
  sold: 'bg-accent-50 text-accent-700 ring-accent-200',
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  outbid: 'bg-red-50 text-red-700 ring-red-200',
  won: 'bg-accent-50 text-accent-700 ring-accent-200',
  reported: 'bg-orange-50 text-orange-700 ring-orange-200',
  open: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normStatus = status.toLowerCase()
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ring-1 ${map[normStatus] || map.pending}`}>
      {status}
    </span>
  )
}