import type { LucideIcon } from 'lucide-react'

interface DashboardStatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: string
}

export default function DashboardStatCard({ title, value, icon: Icon, trend }: DashboardStatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
            <Icon size={20} />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</div>
      {trend && <div className="text-xs text-slate-500 mt-1 dark:text-slate-400">{trend}</div>}
    </div>
  )
}
