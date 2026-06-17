import EmptyState from './EmptyState'

export default function DataTable({ headers, rows, emptyMessage = "No data available" }) {
  if (!rows?.length) return <EmptyState message={emptyMessage} />
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/70">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}