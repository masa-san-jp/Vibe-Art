import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Settings as Cog, BookMarked, Play, Github } from 'lucide-react'
import OracleChat from './components/OracleChat'
import StoryBoard from './components/StoryBoard'
import ActionPanel from './components/ActionPanel'
import RitualModal from './components/RitualModal'
import Settings from './components/Settings'
import { loadAll, saveAll } from './utils/storage'

export default function App(){
  const [state, setState] = useState(() => loadAll() || {
    region: 'あなたの街',
    theme: '孤独/つながり',
    messages: [],
    story: [],
    todos: [],
    useLLM: false,
    apiKey: '',
  })
  const [ritualOpen, setRitualOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => { saveAll(state) }, [state])

  const header = useMemo(() => (
    <div className="flex items-center justify-between py-4 px-5">
      <div className="flex items-center gap-3">
        <img src="/icon.svg" className="w-8 h-8 opacity-90" alt="oracle"/>
        <h1 className="text-xl font-semibold tracking-wide">共有された物語 – <span className="opacity-80">Social Sculpture Studio</span></h1>
      </div>
      <div className="flex items-center gap-2">
        <a href="<https://github.com/your-name/shared-myth-social-sculpture>" target="_blank" rel="noreferrer" className="glass px-3 py-2 rounded-xl text-sm hover:bg-white/15 inline-flex items-center gap-2">
          <Github className="w-4 h-4"/> GitHub
        </a>
        <button onClick={()=>setRitualOpen(true)} className="glass px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2">
          <Play className="w-4 h-4"/> 儀礼モード
        </button>
        <button onClick={()=>setSettingsOpen(true)} className="glass px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2">
          <Cog className="w-4 h-4"/> 設定
        </button>
      </div>
    </div>
  ),[])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mandala-bg"></div>

      <div className="max-w-7xl mx-auto">
        {header}

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-5">
          {/* Center: Oracle Chat */}
          <motion.section layout className="lg:col-span-3 glass rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Sparkles className="w-4 h-4"/>
              <h2 className="font-medium">AIオラクル – 現代のミューズとの対話</h2>
            </div>
            <OracleChat state={state} setState={setState} />
          </motion.section>

          {/* Right: Story & Actions */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <motion.section layout className="glass rounded-3xl p-4">
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <BookMarked className="w-4 h-4"/>
                <h2 className="font-medium">神話のストーリーボード</h2>
              </div>
              <StoryBoard state={state} setState={setState} />
            </motion.section>

            <motion.section layout className="glass rounded-3xl p-4">
              <ActionPanel state={state} setState={setState} />
            </motion.section>
          </div>
        </main>
      </div>

      <RitualModal open={ritualOpen} onClose={()=>setRitualOpen(false)} story={state.story} region={state.region} />
      <Settings open={settingsOpen} onClose={()=>setSettingsOpen(false)} state={state} setState={setState} />

      <footer className="text-center text-xs opacity-60 py-6">私はAIですが、あなたの創造性を刺激し、人と人の協働を応援します。— Social Sculpture Studio</footer>
    </div>
  )
}
