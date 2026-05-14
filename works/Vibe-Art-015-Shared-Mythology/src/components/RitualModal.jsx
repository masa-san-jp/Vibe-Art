import { AnimatePresence, motion } from 'framer-motion'

export default function RitualModal({ open, onClose, story, region }){
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>
          <div className="mandala-bg"></div>
          <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="relative glass max-w-2xl w-full mx-4 rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-2">儀礼モード：{region}の物語を朗読する</h3>
            <p className="text-sm opacity-70 mb-4">深呼吸し、ゆっくりと声に出して読み上げてください。これはあなたと仲間のための小さなセレモニーです。</p>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {(story?.length? story : [
                {title:'はじまり', text:'静かな街に、小さな光がともる。あなたがその火を守り、次の誰かへ渡す。'},
              ]).map((s, i)=> (
                <div key={i}>
                  <div className="text-xs opacity-60">Scene {i+1}</div>
                  <div className="text-base leading-relaxed">{s.text}</div>
                </div>
              ))}
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
