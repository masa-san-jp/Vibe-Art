// src/components/utils.js
/* Utility helpers */

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function setSceneBackground(colorHex) {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  scene.setAttribute('background', `color: ${colorHex}`);
}

export function lerpColor(a, b, t) {
  // a,b: hex string '#rrggbb'
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${(rr << 16 | rg << 8 | rb).toString(16).padStart(6, "0")}`;
}