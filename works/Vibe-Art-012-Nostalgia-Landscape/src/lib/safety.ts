export function filterExcluded(text: string, excluded: string[]): { ok: boolean; cleaned: string; hits: string[] } {
  const hits = excluded.filter(k => k && text.includes(k))
  let cleaned = text
  for (const k of excluded) {
    if (!k) continue
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    cleaned = cleaned.replace(re, '[excluded]')
  }
  return { ok: hits.length === 0, cleaned, hits }
}
