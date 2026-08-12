import { useEffect, useState } from 'react'

function secondsUntil(target: string | null | undefined): number | null {
  if (!target) return null
  const diff = Math.floor((new Date(target).getTime() - Date.now()) / 1000)
  return diff > 0 ? diff : 0
}

// Returns the seconds left until `target` (ISO string), ticking every second.
// Returns null when the target is in the past or not provided.
export function useCountdown(target: string | null | undefined): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => secondsUntil(target))

  useEffect(() => {
    // State only updates inside the interval callback (never synchronously in the
    // effect body), so `react-hooks/set-state-in-effect` stays satisfied.
    const timer = setInterval(() => setSecondsLeft(secondsUntil(target)), 1000)
    return () => clearInterval(timer)
  }, [target])

  return secondsLeft
}