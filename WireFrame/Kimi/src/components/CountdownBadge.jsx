import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

function calcTimeLeft(target) {
  const diff = new Date(target) - new Date()
  if (diff <= 0) return { total: 0, h: 0, m: 0, s: 0 }
  return { total: diff, h: Math.floor(diff / 36e5), m: Math.floor((diff % 36e5) / 6e4), s: Math.floor((diff % 6e4) / 1e3) }
}

export default function CountdownBadge({ endTime, className = '' }) {
  const [t, setT] = useState(calcTimeLeft(endTime))
  useEffect(() => {
    const i = setInterval(() => setT(calcTimeLeft(endTime)), 1000)
    return () => clearInterval(i)
  }, [endTime])

  const style = t.total <= 0 ? 'bg-gray-100 text-gray-500' : t.total < 3e5 ? 'bg-red-100 text-red-700' : t.total < 36e5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
  const text = t.total <= 0 ? 'Ended' : `${t.h}h ${t.m}m ${t.s}s`

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${style} ${className}`}>
      <Clock size={14} />
      {text}
    </span>
  )
}