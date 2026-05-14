// シンメトリ描画の簡易曼荼羅ジェネレータ
export function drawMandala(canvas, { seed='seed', hue = Math.floor(Math.random()*360), complexity=10 }={}){
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0,0,W,H)

  // 背景
  const g = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.05, W/2,H/2, Math.max(W,H)*0.6)
  g.addColorStop(0, `hsl(${hue}, 35%, 12%)`)
  g.addColorStop(1, `hsl(${(hue+240)%360}, 55%, 4%)`)
  ctx.fillStyle = g
  ctx.fillRect(0,0,W,H)

  // 中心光
  for(let r=0;r<5;r++){
    ctx.beginPath()
    ctx.arc(W/2,H/2, 8+r*2, 0, Math.PI*2)
    ctx.strokeStyle = `hsla(${(hue+40)%360}, 65%, ${70-r*8}%, ${0.4-r*0.06})`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  const rng = mulberry32(hash(seed))
  const arms = Math.max(6, Math.min(24, Math.round(complexity)))
  const layers = 10 + Math.floor(rng()*12)

  for(let L=0; L<layers; L++){
    const rad = (Math.min(W,H)*0.06) + L*(Math.min(W,H)*0.035)
    const weight = 0.6 + rng()*2
    for(let a=0; a<arms; a++){
      const t = (a/arms) * Math.PI*2
      drawPetal(ctx, W/2, H/2, rad, t, hue, weight, rng)
    }
  }

  // 微細な黄金線
  for(let i=0;i<280;i++){
    ctx.beginPath()
    const r = (Math.min(W,H)*0.08) + rng()*Math.min(W,H)*0.46
    const th = rng()*Math.PI*2
    const x = W/2 + r*Math.cos(th)
    const y = H/2 + r*Math.sin(th)
    ctx.arc(x,y, rng()*1.5, 0, Math.PI*2)
    ctx.fillStyle = `hsla(${(hue+36)%360}, 80%, 70%, ${0.12})`
    ctx.fill()
  }
}

function drawPetal(ctx, cx, cy, rad, theta, hue, weight, rng){
  const k = 0.38 + rng()*0.22
  const len = rad * (0.9 + rng()*0.3)
  const w = rad * (0.18 + rng()*0.18)
  const x1 = cx + Math.cos(theta)*rad
  const y1 = cy + Math.sin(theta)*rad
  const x2 = cx + Math.cos(theta)*len
  const y2 = cy + Math.sin(theta)*len

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(theta)

  const grd = ctx.createLinearGradient(rad,0,len,0)
  grd.addColorStop(0, `hsla(${(hue+10)%360}, 45%, 40%, 0.35)`)
  grd.addColorStop(1, `hsla(${(hue+60)%360}, 70%, 65%, 0.22)`)
  ctx.fillStyle = grd
  ctx.strokeStyle = `hsla(${(hue+30)%360}, 80%, 72%, 0.22)`

  ctx.beginPath()
  ctx.moveTo(rad,0)
  ctx.bezierCurveTo(rad + w*k, -w,  len - w*k, -w,  len, 0)
  ctx.bezierCurveTo(len - w*k,  w,  rad + w*k,  w,  rad, 0)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = weight
  ctx.stroke()

  ctx.restore()
}

function hash(str){
  let h = 1779033703 ^ str.length
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h>>>0)
}
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
