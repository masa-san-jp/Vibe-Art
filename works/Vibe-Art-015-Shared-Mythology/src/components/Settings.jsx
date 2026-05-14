import { AnimatePresence, motion } from 'framer-motion'

export default function Settings({ open, onClose, state, setState }){
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
          <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="relative glass w-full max-w-xl mx-4 rounded-3xl p-6">
            <h3 className="text-lg font-semibold">設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <label className="text-sm">地域
                <input className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2" value={state.region} onChange={e=>setState(s=>({...s, region:e.target.value}))}/>
              </label>
              <label className="text-sm">関心テーマ
                <input className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2" value={state.theme} onChange={e=>setState(s=>({...s, theme:e.target.value}))}/>
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!state.useLLM} onChange={e=>setState(s=>({...s, useLLM: e.target.checked}))}/>
                LLM を使用（デモ）
              </label>
              {state.useLLM && (
                <label className="text-sm block">OpenAI API Key（デモ用途・自己責任）
                  <input type="password" className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2" value={state.apiKey} onChange={e=>setState(s=>({...s, apiKey:e.target.value}))} placeholder="sk-..."/>
                </label>
              )}
              <p className="text-xs opacity-60">※ 本番運用ではサーバ経由で呼び出し、キーをクライアントに置かないでください。</p>
            </div>

            <div className="mt-5 text-right">
              <button onClick={onClose} className="glass rounded-xl px-4 py-2">閉じる</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
