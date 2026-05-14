export type Palette = { time: 'dawn'|'sunset'|'night'; hueA: number; hueB: number; fireflies: boolean; waves: boolean; festival: boolean }

export function tagsToPalette(tags: string[]): Palette {
  const has = (t: string) => tags.includes(t)
  const p: Palette = {
    time: has('summer') ? 'sunset' : has('ocean') ? 'dawn' : 'night',
    hueA: has('summer') ? 0.08 : has('ocean') ? 0.58 : 0.72, // top hue
    hueB: has('summer') ? 0.02 : has('ocean') ? 0.62 : 0.85, // bottom hue
    fireflies: has('summer') || has('satoyama'),
    waves: has('ocean'),
    festival: has('festival'),
  }
  return p
}

export function promptToNudge(prompt: string): Partial<Palette> {
  const s = prompt.toLowerCase()
  const n: Partial<Palette> = {}
  if (/(朝|dawn|sunrise)/.test(s)) n.time = 'dawn'
  if (/(夕|dusk|sunset|黄昏)/.test(s)) n.time = 'sunset'
  if (/(夜|night|星)/.test(s)) n.time = 'night'
  if (/(海|seaside|ocean|波)/.test(s)) n.waves = true
  if (/(祭|festival|囃子)/.test(s)) n.festival = true
  if (/(蛍|firefly)/.test(s)) n.fireflies = true
  return n
}
