import React from 'react'
import EmptyState from './EmptyState'

interface DataTableProps {
  headers: string[]
  rows: React.ReactNode[][]
  emptyMessage?: string
}

export default function DataTable({ headers, rows, emptyMessage = 'No data available' }: DataTableProps) {
  if (!rows?.length) return <EmptyState message={emptyMessage} />
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}