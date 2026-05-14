import { useEffect, useRef, useState } from 'react'

export default function useTimer(totalSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const timer = useRef<number | null>(null)

  const tick = () => setSecondsLeft((s) => Math.max(0, s - 1))

  function start() {
    if (timer.current) return
    timer.current = window.setInterval(tick, 1000)
  }

  function stop() {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }

  useEffect(() => { setSecondsLeft(totalSeconds) }, [totalSeconds])

  return { secondsLeft, start, stop }
}
