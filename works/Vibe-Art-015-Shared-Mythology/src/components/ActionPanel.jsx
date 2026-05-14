import { useState } from 'react'
import { CheckSquare, Copy } from 'lucide-react'

export default function ActionPanel({ state, setState }){
  const [input, setInput] = useState('')
  const todos = state.todos || []

  function toggle(i){
    const updated = todos.map((t, idx)=> idx===i ? {...t, done: !t.done} : t)
    setState(s=>({...s, todos: updated}))
  }
  function add(){
    const text = input.trim()
    if(!text) return
    setInput('')
    setState(s=>({...s, todos: [...todos, {text, done:false}]}))
  }
  function copy(){
    const lines = todos.map(t=> `${t.done? '[x]':'[ ]'} ${t.text}`).join('\\n')
    navigator.clipboard.writeText(lines)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        <CheckSquare className="w-4 h-4"/>
        <h2 className="font-medium">現実のアクション（TODO）</h2>
      </div>

      {!todos.length && <p className="text-sm opacity-70 mb-3">まだTODOがありません。対話を進めるとAIが候補を提案します。</p>}

      <div className="space-y-2">
        {todos.map((t,i)=> (
          <label key={i} className="flex items-start gap-3">
            <input type="checkbox" checked={!!t.done} onChange={()=>toggle(i)} className="mt-1"/>
            <span className={`text-sm ${t.done? 'line-through opacity-60':''}`}>{t.text}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="タスクを追加…" className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2"/>
        <button onClick={add} className="glass rounded-xl px-3">追加</button>
        <button onClick={copy} className="glass rounded-xl px-3 inline-flex items-center gap-2"><Copy className="w-4 h-4"/> コピー</button>
      </div>
    </div>
  )
}
