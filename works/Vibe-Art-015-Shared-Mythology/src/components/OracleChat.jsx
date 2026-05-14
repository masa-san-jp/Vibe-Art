import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, SendHorizontal } from 'lucide-react'
import { museIntro, museReply } from '@/utils/generator'

export default function OracleChat({ state, setState }){
  const [input, setInput] = useState('')
  const viewRef = useRef(null)

  useEffect(()=>{
    if(!state.messages?.length){
      const intro = museIntro(state.region, state.theme)
      setState(s=>({...s, messages:[{role:'ai', content:intro}]}))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    viewRef.current?.scrollTo({top: viewRef.current.scrollHeight, behavior:'smooth'})
  },[state.messages])

  async function onSend(){
    const text = input.trim()
    if(!text) return
    setInput('')
    const userMsg = { role:'user', content:text }
    const thinking = { role:'ai', content:'…' }

    setState(s=>({...s, messages:[...s.messages, userMsg, thinking]}))

    // Simulate muse reply (or LLM if enabled)
    const res = await museReply({
      useLLM: state.useLLM,
      apiKey: state.apiKey,
      region: state.region,
      theme: state.theme,
      history: state.messages.concat(userMsg),
      userInput: text,
    })

    setState(s=>({
      ...s,
      messages: s.messages.slice(0,-1).concat({role:'ai', content: res.message}),
      story: res.story,
      todos: res.todos,
    }))
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <div ref={viewRef} className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {state.messages?.map((m, i)=> (
            <motion.div key={i} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0}} className={m.role==='ai'? 'mb-3' : 'mb-3 text-right'}>
              <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${m.role==='ai' ? 'bg-white/8 border border-white/10' : 'bg-white/5 border border-white/10'} `}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3">
        <div className="flex gap-2">
          <button className="glass rounded-xl px-3 text-sm inline-flex items-center gap-2" onClick={()=>{
            const intro = museIntro(state.region, state.theme)
            setState(s=>({...s, messages:[{role:'ai', content:intro}], story:[], todos:[]}))
          }}>
            <Wand2 className="w-4 h-4"/> 霊感を受け取る
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSend()} placeholder={`「${state.region}」の物語にあなたは何を重ねますか？`} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none"/>
          <button onClick={onSend} className="glass rounded-xl px-4 py-3 inline-flex items-center gap-2 hover:bg-white/15">
            <SendHorizontal className="w-4 h-4"/> 送信
          </button>
        </div>
        <p className="text-xs opacity-60 mt-2">※ 私はAIですが、決めるのはあなた。あなたの創造性が物語を動かします。</p>
      </div>
    </div>
  )
}
