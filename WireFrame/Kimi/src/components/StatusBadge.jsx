const map = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-100 text-gray-700',
  sold: 'bg-accent-100 text-accent-700',
  draft: 'bg-slate-100 text-slate-700',
  outbid: 'bg-red-100 text-red-700',
  won: 'bg-accent-100 text-accent-700',
  reported: 'bg-orange-100 text-orange-700',
  open: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  )
}