let ctx, master, ambientGain, hitGain;

export async function initAudio(){
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

  ambientGain = ctx.createGain(); ambientGain.gain.value = 0; ambientGain.connect(master);
  hitGain = ctx.createGain(); hitGain.gain.value = 0.0; hitGain.connect(master);

  // アンビエント：2つの detune したサインで揺れるパッド
  const oscA = ctx.createOscillator(); oscA.type='sine'; oscA.frequency.value = 110; // A2
  const oscB = ctx.createOscillator(); oscB.type='sine'; oscB.frequency.value = 110.8;
  const lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 8;
  lfo.connect(lfoGain).connect(oscA.frequency);
  oscA.connect(ambientGain); oscB.connect(ambientGain);
  oscA.start(); oscB.start(); lfo.start();

  // 破壊ヒット：ノイズ＋フィルター＋短いエンベロープ
  const noiseBuf = mkNoiseBuffer(ctx);
  const noise = ctx.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true; noise.start();
  const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = 800; bp.Q.value = 6;
  noise.connect(bp).connect(hitGain);
}

export function playAmbient() {
  if (!ctx) return;
  const t = ctx.currentTime;
  ambientGain.gain.cancelScheduledValues(t);
  ambientGain.gain.linearRampToValueAtTime(0.0, t);
  ambientGain.gain.linearRampToValueAtTime(0.25, t + 2.0);
}

export function hitDestruction() {
  if (!ctx) return;
  const t = ctx.currentTime;
  hitGain.gain.cancelScheduledValues(t);
  hitGain.gain.setValueAtTime(0.0, t);
  hitGain.gain.linearRampToValueAtTime(0.7, t + 0.02);
  hitGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
}

export function setMuted(mute){ if (!master) return; master.gain.value = mute ? 0 : 0.9; }

function mkNoiseBuffer(ctx){
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i=0;i<len;i++) ch[i] = Math.random()*2-1;
  return buf;
}
