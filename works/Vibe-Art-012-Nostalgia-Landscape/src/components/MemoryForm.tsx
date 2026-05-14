import { FormEvent, useMemo, useState } from 'react'
import { useNLStore } from '../state/store'
import { generateScene } from '../lib/generator'

const CULTURE_OPTIONS = [
  { id: 'satoyama', label: '里山' },
  { id: 'summer', label: '夏の終わり' },
  { id: 'festival', label: '祭り' },
  { id: 'ocean', label: '海辺' },
  { id: 'train', label: '汽笛／鉄道' },
]

export default function MemoryForm() {
  const { userPrompt, culturalTags, excluded, consent, sessionMinutes, set } = useNLStore()
  const [apiEnabled, setApiEnabled] = useState(false)
  const provider = import.meta.env.VITE_IMAGE_API_PROVIDER || 'custom'
  const apiAvailable = useMemo(() => !!import.meta.env.VITE_IMAGE_API_URL && !!import.meta.env.VITE_IMAGE_API_KEY, [])

  async function onStart(e: FormEvent) {
    e.preventDefault()
    if (!consent) {
      alert('同意が必要です。')
      return
    }

    const scene = await generateScene({
      prompt: userPrompt,
      tags: culturalTags,
      excluded,
      useApi: apiEnabled && apiAvailable,
    })

    useNLStore.setState({
      scene,
      sessionActive: true,
      showDebrief: false,
      debrief: {
        userPrompt,
        culturalTags,
        excluded,
        usedExternal: apiEnabled && apiAvailable,
        generatedWith: apiEnabled && apiAvailable ? provider : 'local',
      },
    })
  }

  return (
    <form onSubmit={onStart} className="space-y-4">
      <label className="block">
        <span className="text-sm">記憶プロンプト（例：祖母の家の縁側で、夕暮れに風鈴が鳴っていた）</span>
        <textarea
          className="mt-1 w-full h-24 rounded-xl bg-neutral-900 border border-neutral-800 p-3 text-sm"
          value={userPrompt}
          onChange={(e) => set({ userPrompt: e.currentTarget.value })}
          placeholder="心に浮かぶ断片を自由に書いてください"
        />
      </label>

      <fieldset>
        <legend className="text-sm mb-1">文化モチーフ</legend>
        <div className="flex flex-wrap gap-2">
          {CULTURE_OPTIONS.map((opt) => {
            const active = culturalTags.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => set({
                  culturalTags: active
                    ? culturalTags.filter((t) => t !== opt.id)
                    : [...culturalTags, opt.id],
                })}
                className={`px-3 py-1 rounded-full text-xs border ${active ? 'bg-amber-500 text-neutral-900 border-amber-400' : 'border-neutral-700'}`}
              >{opt.label}</button>
            )
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm">除外キーワード（カンマ区切り）</span>
        <input
          className="mt-1 w-full rounded-xl bg-neutral-900 border border-neutral-800 p-2 text-sm"
          value={excluded.join(', ')}
          onChange={(e) => set({ excluded: e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="例：病院、事故"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => set({ consent: e.currentTarget.checked })} />
          同意します（本体験はAIによる擬似体験を含みます）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>分</span>
          <input type="number" min={2} max={15} value={sessionMinutes}
            onChange={(e) => set({ sessionMinutes: Math.max(2, Math.min(15, Number(e.currentTarget.value))) })}
            className="w-16 bg-neutral-900 border border-neutral-800 rounded p-1 text-right" />
        </label>
      </div>

      <div className="rounded-xl border border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">外部画像生成 API を使用</div>
            <div className="text-xs text-neutral-400">{apiAvailable ? '環境変数が見つかりました' : '未設定：ローカル合成が使用されます'}</div>
          </div>
          <input type="checkbox" disabled={!apiAvailable} checked={apiEnabled} onChange={(e) => setApiEnabled(e.currentTarget.checked)} />
        </div>
      </div>

      <button type="submit" className="w-full py-2 rounded-xl bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400">体験をはじめる</button>

      <p className="text-xs text-neutral-500">
        * データはブラウザ内で処理されます（API 使用時を除く）。いつでもページを更新すれば破棄されます。
      </p>
    </form>
  )
}
