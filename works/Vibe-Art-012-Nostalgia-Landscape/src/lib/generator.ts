import { SceneParams } from '../state/store'
import { tagsToPalette, promptToNudge } from './palette'
import { filterExcluded } from './safety'

export async function generateScene({ prompt, tags, excluded, useApi }: { prompt: string; tags: string[]; excluded: string[]; useApi: boolean }): Promise<SceneParams> {
  const { ok, cleaned } = filterExcluded(prompt, excluded)
  const palette = tagsToPalette(tags)
  const nudge = promptToNudge(cleaned)
  const merged = { ...palette, ...nudge }

  // Local fallback scene
  let base: SceneParams = {
    mode: 'local',
    timeOfDay: merged.time!,
    hueA: merged.hueA!,
    hueB: merged.hueB!,
    fireflies: Boolean(merged.fireflies),
    waves: Boolean(merged.waves),
    festival: Boolean(merged.festival),
  }

  // External API (optional)
  if (useApi) {
    try {
      const url = import.meta.env.VITE_IMAGE_API_URL
      const key = import.meta.env.VITE_IMAGE_API_KEY
      const provider = (import.meta.env.VITE_IMAGE_API_PROVIDER || 'custom') as string

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': key ? `Bearer ${key}` : '' },
        body: JSON.stringify({ prompt: cleaned, tags, provider })
      })
      if (!res.ok) throw new Error('image api failed')
      const data = await res.json()
      const imageUrl = data?.image || data?.output?.[0] || data?.url
      if (imageUrl) {
        return { ...base, mode: 'image', imageUrl }
      }
    } catch (e) {
      console.warn('Image API error, fallback to local:', e)
    }
  }

  return base
}
