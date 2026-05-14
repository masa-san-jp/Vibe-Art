let ctx, master, noiseNode, lfo, lfoGain

export function startSoundscape(){
  // 初回ユーザー操作で resume されることを想定
  window.addEventListener('click', ensure)
  window.addEventListener('keydown', ensure)
}

function ensure(){
  if(ctx) return
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination)

  // ノイズ: 神殿の空気感
  const bufferSize = 2 * ctx.sampleRate
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * 0.35
  noiseNode = ctx.createBufferSource(); noiseNode.buffer = noiseBuffer; noiseNode.loop = true
  const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type='lowpass'; noiseFilter.frequency.value=1200
  const noiseGain = ctx.createGain(); noiseGain.gain.value=0.25
  noiseNode.connect(noiseFilter).connect(noiseGain).connect(master)
  noiseNode.start()

  // ドローン: 沈む低音
  const osc = ctx.createOscillator(); osc.type='sine'; osc.frequency.value= map(35,0,100,52,110)
  const oscGain = ctx.createGain(); oscGain.gain.value=0.07
  osc.connect(oscGain).connect(master); osc.start()

  // LFOで音に息遣い
  lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.07
  lfoGain = ctx.createGain(); lfoGain.gain.value = 0.04
  lfo.connect(lfoGain).connect(oscGain.gain)
  lfo.start()

  // ムード連動
  const mood = document.getElementById('mood')
  if(mood){
    mood.addEventListener('input', ()=>{
      const v = +mood.value
      osc.frequency.setTargetAtTime(map(v,0,100,48,160), ctx.currentTime, 0.5)
      master.gain.setTargetAtTime(map(v,0,100,0.12,0.24), ctx.currentTime, 0.5)
      lfo.frequency.setTargetAtTime(map(v,0,100,0.04,0.18), ctx.currentTime, 0.5)
    })
  }
}

function map(v,inMin,inMax,outMin,outMax){
  return (v-inMin)*(outMax-outMin)/(inMax-inMin)+outMin
}
