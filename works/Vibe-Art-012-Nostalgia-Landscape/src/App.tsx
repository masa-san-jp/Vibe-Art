import { useEffect } from 'react'
import MemoryForm from './components/MemoryForm'
import Scene from './components/Scene'
import Soundscape from './components/Soundscape'
import SessionGuard from './components/SessionGuard'
import Debrief from './components/Debrief'
import { useNLStore } from './state/store'

export default function App() {
  const { sessionActive, showDebrief } = useNLStore()

  useEffect(() => {
    document.title = 'Nostalgia Landscape'
  }, [])

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[420px_1fr]">
      <aside className="p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-950/60 backdrop-blur">
        <h1 className="text-xl font-semibold mb-2">Nostalgia Landscape</h1>
        <p className="text-sm text-neutral-400 mb-4">個人記憶 × 集合的記憶で原風景を合成。ローカル優先、同意ベース。</p>
        <MemoryForm />
      </aside>

      <main className="relative">
        <Scene />
        <Soundscape />
        {sessionActive && <SessionGuard />}
        {showDebrief && <Debrief />}
      </main>
    </div>
  )
}
