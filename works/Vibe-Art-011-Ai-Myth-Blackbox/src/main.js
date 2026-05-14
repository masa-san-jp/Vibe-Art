import { initApp } from './ui/app.js'
import { startSoundscape } from './audio/soundscape.js'
import { drawMandala } from './visuals/mandala.js'

window.addEventListener('DOMContentLoaded', async () => {
  // サウンドスケープ起動（ユーザー操作後に有効化）
  startSoundscape()
  // 初期曼荼羅生成
  const canvas = document.getElementById('mandalaCanvas')
  drawMandala(canvas, { seed: 'origin', hue: 46, complexity: 9 })
  // UI初期化
  initApp()
})
