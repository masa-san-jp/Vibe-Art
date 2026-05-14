// キャンバスの内容を粒子化して吹き飛ばす簡易エフェクト
export function particleDestruction(canvas, { duration=1500 }={}) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const image = ctx.getImageData(0,0,W,H);

  // パーティクル生成（間引き）
  const step = 4; // 画素間引き
  const particles = [];
  for (let y=0; y<H; y+=step) {
    for (let x=0; x<W; x+=step) {
      const i = (y*W + x)*4;
      const a = image.data[i+3];
      if (a < 32) continue;
      const r=image.data[i], g=image.data[i+1], b=image.data[i+2];
      particles.push({ x, y, r, g, b, a });
    }
  }

  const center = { x: W/2, y: H/2 };
  const start = performance.now();

  return new Promise((resolve) => {
    function frame(now){
      const t = Math.min(1, (now - start) / duration);
      ctx.clearRect(0,0,W,H);

      for (const p of particles) {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.hypot(dx, dy) + 1;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const speed = 80 + dist*0.6;
        const nx = p.x + dirX * easeOutExpo(t) * speed;
        const ny = p.y + dirY * easeOutExpo(t) * speed;
        const alpha = (1 - t) * (p.a/255);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.fillRect(nx, ny, step, step);
      }

      // 軽いグリッチ風ライン
      if (Math.random()<0.3) {
        const y = (Math.random()*H)|0;
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0,y,W,1+Math.random()*2);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (t < 1) requestAnimationFrame(frame); else {
        // 破壊後の画面を返すためにオフスクリーンにコピー
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        off.getContext('2d').drawImage(canvas,0,0);
        resolve(off);
      }
    }
    requestAnimationFrame(frame);
  });
}

function easeOutExpo(t){ return t===1 ? 1 : 1 - Math.pow(2, -10*t); }
