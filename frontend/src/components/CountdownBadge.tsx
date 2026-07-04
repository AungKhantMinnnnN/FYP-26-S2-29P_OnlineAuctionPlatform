import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimeLeft {
  total: number
  h: number
  m: number
  s: number
}

function calcTimeLeft(target: string | Date): TimeLeft {
  const diff = (new Date(target) as any) - (new Date() as any)
  if (diff <= 0) return { total: 0, h: 0, m: 0, s: 0 }
  return {
    total: diff,
    h: Math.floor(diff / 36e5),
    m: Math.floor((diff % 36e5) / 6e4),
    s: Math.floor((diff % 6e4) / 1e3),
  }
}

interface CountdownBadgeProps {
  endTime: string | Date
  className?: string
}

export default function CountdownBadge({ endTime, className = '' }: CountdownBadgeProps) {
  const [t, setT] = useState<TimeLeft>(calcTimeLeft(endTime))

  useEffect(() => {
    const i = setInterval(() => setT(calcTimeLeft(endTime)), 1000)
    return () => clearInterval(i)
  }, [endTime])

  const style =
    t.total <= 0
      ? 'bg-slate-100 text-slate-500 ring-slate-200'
      : t.total < 3e5
      ? 'bg-red-50 text-red-700 ring-red-200'
      : t.total < 36e5
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  const text = t.total <= 0 ? 'Ended' : `${t.h}h ${t.m}m ${t.s}s`

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style} ${className}`}>
      <Clock size={14} />
      {text}
    </span>
  )
}
