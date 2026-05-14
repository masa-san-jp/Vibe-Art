// src/sim.js
import { state } from './state.js';

let canvas, ctx, particles;

function makeParticles(n, w, h){
  const arr = [];
  for(let i=0;i<n;i++){
    arr.push({
      x: Math.random()*w,
      y: Math.random()*h,
      vx: (Math.random()-.5)*0.4,
      vy: (Math.random()-.5)*0.4,
      c: 0
    });
  }
  return arr;
}

export function initSim(){
  canvas = document.getElementById('sim-canvas');
  ctx = canvas.getContext('2d');
  resize();
  particles = makeParticles(600, canvas.width, canvas.height);
  window.addEventListener('resize', resize);
  loop();
}

function resize(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * dpr));
  canvas.height = Math.max(160, Math.floor(192 * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function colorForMetrics(m){
  // hue: privacy (blue) -> lower privacy tends red-ish; here simple blue scale by privacy
  const hue = 220 * m.privacy; // 0 (red-ish) .. 220 (blue)
  const sat = 60 + m.safety*40;
  const light = 50 - m.exploitation*25;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function loop(){
  requestAnimationFrame(loop);
  step();
  draw();
}

function step(){
  const m = state.metrics;
  const w = canvas.width, h = canvas.height;
  const lonelin = m.loneliness;
  for(const p of particles){
    // Velocity influenced by trust (cohesion) and loneliness (dispersion)
    p.vx += (Math.random()-.5) * (0.2 + lonelin*0.4);
    p.vy += (Math.random()-.5) * (0.2 + lonelin*0.4);

    // mild cohesion when trust high
    if(m.trust > .5){
      const cx = w/2, cy = h/2;
      p.vx += (cx - p.x) * 0.0005 * (m.trust-.5);
      p.vy += (cy - p.y) * 0.0005 * (m.trust-.5);
    }

    // friction
    p.vx *= 0.98; p.vy *= 0.98;
    p.x += p.vx; p.y += p.vy;

    // boundary wrap
    if(p.x<0) p.x+=w;
    if(p.x>w) p.x-=w;
    if(p.y<0) p.y+=h;
    if(p.y>h) p.y-=h;
  }
}

function draw(){
  const m = state.metrics;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // background tint
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = colorForMetrics(m);
  const density = 1 + m.trust*2; // density multiplier

  for(let i=0; i<particles.length * density/2; i++){
    const p = particles[i % particles.length];
    ctx.beginPath();
    const r = 1 + m.wellbeing*2;
    ctx.arc(p.x, p.y, r, 0, Math.PI*2);
    ctx.globalAlpha = 0.6 - m.loneliness*0.4;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // exploitation "black patches"
  if(m.exploitation > .4){
    const count = Math.floor((m.exploitation - .4) * 10) + 1;
    for(let i=0;i<count;i++){
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const rx = (i*73) % canvas.width;
      const ry = (i*41) % canvas.height;
      ctx.fillRect(rx, ry, 20 + m.exploitation*80, 8 + m.exploitation*50);
    }
  }

  // loneliness "broken links"
  if(m.loneliness > .5){
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for(let i=0;i<50;i++){
      const a = particles[(i*7)%particles.length];
      const b = particles[(i*13)%particles.length];
      if(Math.random() < (m.loneliness-0.5)*0.5) continue; // broken
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}
