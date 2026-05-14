import { motion } from 'framer-motion'

export default function StoryBoard({ state, setState }){
  const story = state.story || []

  if(!story.length){
    return <p className="text-sm opacity-70">まだ物語カードがありません。オラクルと対話して、最初の場面を生み出しましょう。</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {story.map((card, idx)=> (
        <motion.div key={idx} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs opacity-60 mb-1">Scene {idx+1}</div>
          <h3 className="font-semibold mb-1">{card.title}</h3>
          <p className="text-sm opacity-90 leading-relaxed">{card.text}</p>
        </motion.div>
      ))}
    </div>
  )
}
