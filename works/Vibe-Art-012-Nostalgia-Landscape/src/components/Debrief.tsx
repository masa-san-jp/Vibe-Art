import { useNLStore } from '../state/store'

export default function Debrief() {
  const { debrief, set } = useNLStore()
  if (!debrief) return null

  return (
    <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-semibold mb-2">デブリーフィング</h2>
        <p className="text-sm text-neutral-300 mb-4">この体験は AI による擬似生成を含みます。現実の記憶との区別にご留意ください。</p>
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-neutral-400">あなたの入力</div>
            <div className="bg-neutral-800/60 p-2 rounded">{debrief.userPrompt || '（未入力）'}</div>
          </div>
          <div>
            <div className="text-neutral-400">文化モチーフ</div>
            <div className="bg-neutral-800/60 p-2 rounded">{debrief.culturalTags.join(', ') || '（なし）'}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-800/60 p-2 rounded">
              <div className="text-neutral-400">除外キーワード</div>
              <div>{debrief.excluded.join(', ') || '（なし）'}</div>
            </div>
            <div className="bg-neutral-800/60 p-2 rounded">
              <div className="text-neutral-400">生成方式</div>
              <div>{debrief.usedExternal ? `外部API（${debrief.generatedWith}）` : 'ローカル合成'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700" onClick={() => useNLStore.setState({ showDebrief: false })}>閉じる</button>
          <button className="px-3 py-1 rounded bg-amber-500 text-neutral-900 font-semibold" onClick={() => useNLStore.setState({ showDebrief: false })}>OK</button>
        </div>
      </div>
    </div>
  )
}
