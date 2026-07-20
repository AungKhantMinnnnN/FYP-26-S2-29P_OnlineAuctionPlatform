import { useQuery } from '@tanstack/react-query'
import { DollarSign, Gavel, ShieldBan, TrendingUp, Users } from 'lucide-react'
import DashboardStatCard from '../../components/DashboardStatCard'
import { getPlatformStats } from '../../api/adminApi'
import type { LucideIcon } from 'lucide-react'

export default function ActivityStatsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: getPlatformStats,
  })

  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
        Couldn't load platform stats. Please try again.
      </div>
    )
  }

  // Never render a hardcoded 0 — show a placeholder until real numbers load.
  const fmt = (v: number | undefined) => (isLoading || v === undefined ? '—' : v.toLocaleString())
  const revenue =
    isLoading || data?.revenue === undefined ? '—' : `$${data.revenue.toLocaleString()}`

  const cards: { title: string; value: string; icon: LucideIcon; trend?: string }[] = [
    { title: 'Total Users', value: fmt(data?.total_users), icon: Users },
    { title: 'Active Auctions', value: fmt(data?.active_auctions), icon: Gavel },
    { title: 'Total Bids', value: fmt(data?.total_bids), icon: TrendingUp },
    { title: 'Subscription Revenue', value: revenue, icon: DollarSign, trend: 'Premium renewals — not sales GMV' },
    { title: 'Suspended Users', value: fmt(data?.suspended_users), icon: ShieldBan },
  ]

  const registrations = data?.new_registrations ?? []
  const regTotal = registrations.reduce((sum, r) => sum + r.count, 0)
  const maxCount = registrations.reduce((m, r) => Math.max(m, r.count), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <DashboardStatCard key={c.title} title={c.title} value={c.value} icon={c.icon} trend={c.trend} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">New Registrations (30d)</span>
          <span className="text-lg font-bold text-slate-950">{isLoading ? '—' : regTotal.toLocaleString()}</span>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-slate-400">No registrations in the last 30 days.</p>
        ) : (
          <div className="flex h-16 items-end gap-1">
            {registrations.map(r => (
              <div
                key={r.date}
                title={`${r.date}: ${r.count}`}
                style={{ height: maxCount ? `${Math.max((r.count / maxCount) * 100, 4)}%` : '4%' }}
                className="flex-1 rounded-t bg-accent-300"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// System Monitoring — live up/down status for each backend microservice, pinged directly from the browser.
