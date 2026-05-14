import { useEffect } from 'react'
import { useNLStore } from '../state/store'
import useTimer from '../hooks/useTimer'

export default function SessionGuard() {
  const { sessionMinutes, set } = useNLStore()
  const { secondsLeft, start, stop } = useTimer(sessionMinutes * 60)

  useEffect(() => { start(); return () => stop() }, [])

  useEffect(() => {
    if (secondsLeft <= 0) {
      set({ sessionActive: false, showDebrief: true })
    }
  }, [secondsLeft, set])

  const m = Math.floor(secondsLeft/60), s = secondsLeft%60

  return (
    <div className="absolute top-3 right-3 text-xs bg-neutral-900/70 border border-neutral-800 rounded-lg px-3 py-1">
      残り {m}:{s.toString().padStart(2,'0')}
    </div>
  )
}
