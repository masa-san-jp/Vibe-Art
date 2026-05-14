import { xorshift32 } from '../utils/rng.js';

// 画面いっぱいに曼荼羅風の回転対称図形を描く
export function drawMandala(ctx, { seed }) {
  const rand = xorshift32(seed);
  const { width: W, height: H } = ctx.canvas;
  // 背景
  ctx.save();
  const g = ctx.createRadialGradient(W*0.5, H*0.5, 10, W*0.5, H*0.5, Math.max(W,H));
  g.addColorStop(0, '#0c1220');
  g.addColorStop(1, '#070a10');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
  ctx.restore();

  const cx = W/2, cy = H/2;
  const symmetry = 6 + Math.floor(rand()*6); // 6〜11
  const baseHue = Math.floor(rand()*360);

  const palette = Array.from({length:5}, (_,i)=> `hsl(${(baseHue + i*36)%360} 75% ${i%2?60:70}% / ${0.8 - i*0.12})`);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = 'lighter';

  // 中心の光
  for (let r=8; r<160; r+=6) {
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.strokeStyle = palette[(r/6)%palette.length|0];
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 2 + r*0.02;
    ctx.stroke();
  }

  // 花弁／羽根
  for (let layer=0; layer<6; layer++) {
    const R = 80 + layer*48 + rand()*24;
    const petals = symmetry * (1 + (layer%2));
    for (let i=0; i<petals; i++) {
      const a = (i/petals) * Math.PI*2;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -R);
      ctx.beginPath();
      const w = 6 + layer*2 + rand()*3;
      const h = 30 + layer*10 + rand()*16;
      roundedDrop(ctx, 0, 0, w, h, 6);
      ctx.fillStyle = palette[(layer+i)%palette.length];
      ctx.globalAlpha = 0.18 + rand()*0.25;
      ctx.fill();
      ctx.restore();
    }
  }

  // 外周のリングと符号
  for (let ring=0; ring<5; ring++) {
    const R = 240 + ring*26;
    ctx.beginPath();
    ctx.arc(0,0,R,0,Math.PI*2);
    ctx.strokeStyle = palette[(ring+2)%palette.length];
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const marks = symmetry * 2;
    for (let i=0;i<marks;i++){
      ctx.save();
      ctx.rotate((i/marks)*Math.PI*2);
      ctx.translate(0,-R);
      ctx.beginPath();
      ctx.arc(0,0, 4+rand()*6,0,Math.PI*2);
      ctx.fillStyle = palette[(i+ring)%palette.length];
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
  return palette;
}

function roundedDrop(ctx, x,y, w,h, r){
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x-w, y-h*0.6, x, y-h);
  ctx.quadraticCurveTo(x+w, y-h*0.6, x, y);
  ctx.closePath();
}
