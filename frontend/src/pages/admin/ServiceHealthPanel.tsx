import { useQuery } from '@tanstack/react-query'
import { Check, RefreshCw, Server, X } from 'lucide-react'
import { checkServicesHealth } from '../../api/adminApi'

export default function ServiceHealthPanel() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'service-health'],
    queryFn: checkServicesHealth,
    refetchInterval: 30_000,
  })

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-950">Service Health</h3>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          {dataUpdatedAt ? `Checked ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Check now'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Checking services…</p>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't check service health. This tells you nothing about whether services are actually up — try again.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(data ?? []).map(service => (
            <div
              key={service.name}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                service.status === 'up'
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : 'border-red-100 bg-red-50/60'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  service.status === 'up' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {service.status === 'up' ? <Check size={16} /> : <X size={16} />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{service.name}</p>
                <p className={`text-xs font-semibold ${service.status === 'up' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {service.status === 'up' ? `Online · ${service.latencyMs}ms` : `Offline${service.detail ? ` · ${service.detail}` : ''}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// System Monitoring — System Logs. Paginated application/service log lines.
// Shared control style, matched to SelectField/FormInput so filters read as one system.
