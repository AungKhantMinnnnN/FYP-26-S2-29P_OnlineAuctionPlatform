import React from 'react'

interface IconTooltipProps {
  label: string
  children: React.ReactNode
}

export default function IconTooltip({ label, children }: IconTooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-100 group-hover:opacity-100 z-10"
      >
        {label}
      </span>
    </span>
  )
}