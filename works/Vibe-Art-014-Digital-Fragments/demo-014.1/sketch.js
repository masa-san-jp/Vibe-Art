'use strict';
/*
  Digital Fragments — Key Visual (p5.js)
  3層構成：背景(長残像) / 中層(曼荼羅・リング) / 前景(粒子)
  操作: D=破壊, R=再生, S=保存, H=HUD切替
*/

let state = 'create'; // create | destroy | after
let t0 = 0;
let particles = [];
let symmetry = 10; // 回転対称数
let palette;
let hud = true;

const CFG = {
  numParticles: 1200,
  trailFade: 0.08, // 長残像 (0=残り続ける / 1=即消える)
  centerGlow: 0.18,
  breatheHz: 0.1, // 呼吸速度
  parallax: 0.02,
  glitchProb: 0.22,
};

function setup(){
  pixelDensity(1); // 演出の均一化
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360,100,100,1);
  noCursor();
  palette = mkPalette();
  resetScene();
  t0 = millis();
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); resetScene(false); }

function resetScene(newPalette=true){
  clear();
  if(newPalette) palette = mkPalette();
  symmetry = 8 + floor(random(0,4))*2; // 偶数のみ
  particles = [];
  const N = CFG.numParticles;
  for(let i=0;i<N;i++){
    const a = random(TWO_PI);
    const r = random(2, min(width,height)*0.06);
    const x = width*0.5 + cos(a)*r;
    const y = height*0.5 + sin(a)*r;
    particles.push({
      x, y,
      vx: (random(-1,1))*0.2,
      vy: (random(-1,1))*0.2,
      life: random(0.6,1),
      size: random(0.6, 2.2),
      hue: lerpHue(palette.violet, palette.cyan, random()),
    });
  }
}

function draw(){
  // 長残像: 低アルファの黒で全体をわずかに塗り潰す
  noStroke();
  fill(230, 30, 2, CFG.trailFade); // HSB黒(=低明度)
  rect(0,0,width,height);

  const t = (millis()-t0)/1000;
  const cx = width*0.5, cy = height*0.5;

  // パララックス (マウス位置で層が僅かに揺れる)
  const px = (mouseX - cx) * CFG.parallax;
  const py = (mouseY - cy) * CFG.parallax;

  // 背景のボリューム光/ゴッドレイ風
  push();
  translate(px*0.4, py*0.4);
  drawVolumeLight(cx, cy, t);
  pop();

  // 中心の祭壇（リング）＋曼荼羅
  push();
  translate(px*0.8, py*0.8);
  drawMandala(cx, cy, t);
  drawAltar(cx, cy, t);
  pop();

  // 粒子層
  push();
  translate(px*1.2, py*1.2);
  updateParticles(cx, cy, t);
  pop();

  // HUD
  if(hud){
    const el = document.getElementById('hud');
    if(el && el.classList.contains('hidden')) el.classList.remove('hidden');
  } else {
    const el = document.getElementById('hud');
    if(el && !el.classList.contains('hidden')) el.classList.add('hidden');
  }
}

/* --- Layers --- */
function drawVolumeLight(cx, cy, t){
  push();
  blendMode(ADD);
  const rays = 36;
  for(let i=0;i<rays;i++){
    const a = (i/rays)*TWO_PI + noise(i*0.1, t*0.05)*0.4;
    const len = min(width,height)* (0.25 + noise(i*0.2, t*0.08)*0.35);
    const w = 1 + noise(i*0.3, t*0.1)*10;
    const x2 = cx + cos(a)*len;
    const y2 = cy + sin(a)*len;
    stroke(palette.violet.h, palette.violet.s, 88, 0.06);
    strokeWeight(w);
    line(cx, cy, x2, y2);
  }
  pop();
}

function drawAltar(cx, cy, t){
  push();
  noFill();
  blendMode(ADD);
  const breathe = 1 + 0.04 * sin(TWO_PI*CFG.breatheHz*t);
  const baseR = min(width,height)*0.18 * breathe;
  for(let i=0;i<10;i++){
    const r = baseR + i*10;
    stroke(palette.violet.h, palette.violet.s, 90, 0.05 + (i===0? CFG.centerGlow:0));
    strokeWeight(2 + i*0.6);
    circle(cx, cy, r*2);
  }
  // 中心の残光
  noStroke();
  for(let i=0;i<60;i++){
    const rr = 2+i*2.2;
    fill(palette.gold.h, palette.gold.s, 85, 0.012);
    circle(cx, cy, rr*2);
  }
  pop();
}

function drawMandala(cx, cy, t){
  push();
  translate(cx, cy);
  rotate(t*0.12); // ゆっくり回転
  blendMode(ADD);
  const layers = 6;
  for(let L=0; L<layers; L++){
    const R = 80 + L*38;
    const petals = symmetry*(1 + (L%2));
    for(let i=0;i<petals;i++){
      const a = (i/petals)*TWO_PI;
      push();
      rotate(a);
      translate(0, -R);
      const w = 6 + L*1.6;
      const h = 26 + L*12;
      const hue = lerpHue(palette.cyan, palette.violet, (i%petals)/petals);
      noStroke(); fill(hue.h, hue.s, 90, 0.08);
      petal(0,0,w,h,6);
      pop();
    }
  }
  // 外周の符（ビーズ）
  const ringR = 260;
  for(let i=0;i<symmetry*2;i++){
    const a = (i/(symmetry*2))*TWO_PI + sin(t*0.3+i)*0.01;
    const x = cos(a)*ringR, y = sin(a)*ringR;
    noStroke(); fill(palette.cyan.h, palette.cyan.s, 100, 0.18);
    circle(x,y, 3 + (i%2));
  }
  pop();
}

function petal(x,y,w,h,r){
  beginShape();
  vertex(x, y);
  quadraticVertex(x-w, y-h*0.6, x, y-h);
  quadraticVertex(x+w, y-h*0.6, x, y);
  endShape(CLOSE);
}

function updateParticles(cx, cy, t){
  const N = particles.length;
  for(let i=0;i<N;i++){
    const p = particles[i];
    // フィールド：中心へ回転収束 or 破壊で発散
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = max(1, sqrt(dx*dx + dy*dy));
    const nx = dx / dist, ny = dy / dist;

    let fx = 0, fy = 0;
    if(state === 'create' || state === 'after'){
      // 収束＋周回（渦）
      const force = -0.18; // 中心へ
      const swirl = 0.28;  // 回転
      fx += nx*force + -ny*swirl;
      fy += ny*force + nx*swirl;
    } else if(state === 'destroy'){
      // 発散＋ノイズ
      const blow = 0.48;
      fx += nx*blow + (noise(p.x*0.01, t*0.6)-0.5)*0.6;
      fy += ny*blow + (noise(p.y*0.01, t*0.6)-0.5)*0.6;
    }

    // 微少ランダム
    fx += random(-0.02, 0.02);
    fy += random(-0.02, 0.02);

    // 速度更新
    p.vx += fx * p.life;
    p.vy += fy * p.life;
    p.vx *= 0.985; p.vy *= 0.985; // 減衰

    p.x += p.vx; p.y += p.vy;

    // 画面外に出すぎたらリセット（after では中心から再生）
    if(p.x < -50 || p.y < -50 || p.x > width+50 || p.y > height+50){
      if(state === 'destroy'){
        // そのまま散る
        p.x = random(width); p.y = random(height);
      } else {
        p.x = cx + random(-10,10); p.y = cy + random(-10,10);
        p.vx = random(-0.4,0.4); p.vy = random(-0.4,0.4);
      }
    }

    // 描画
    noStroke();
    const a = (state==='destroy') ? 0.35 : 0.18;
    fill(p.hue.h, p.hue.s, 100, a);
    circle(p.x, p.y, p.size);
  }

  // 破壊時の軽いグリッチ
  if(state==='destroy' && random() < CFG.glitchProb){
    push();
    blendMode(DIFFERENCE);
    noStroke(); fill(0,0,100, 0.06);
    const y = floor(random(height));
    rect(0, y, width, random(1,3));
    pop();
  }
}

/* --- Utils --- */
function mkPalette(){
  // 統一パレット（HSB）
  return {
    violet: { h: 262, s: 55, b: 95 },
    gold:   { h: 43,  s: 78, b: 96 },
    cyan:   { h: 195, s: 70, b: 100 },
  };
}
function lerpHue(a,b,t){
  const wrap = (x)=> (x+360)%360;
  let dh = wrap(b.h - a.h);
  if(dh>180) dh -= 360;
  return { h: wrap(a.h + dh*t), s: lerp(a.s,b.s,t), b: lerp(a.b,b.b,t) };
}

/* --- Controls --- */
function keyPressed(){
  if(key==='d' || key==='D'){ state='destroy'; }
  if(key==='r' || key==='R'){ state='after'; resetScene(false); }
  if(key==='s' || key==='S'){ const ts = new Date().toISOString().replace(/[:.]/g,'-'); saveCanvas('digital-fragments-'+ts, 'png'); }
  if(key==='h' || key==='H'){ hud = !hud; }
}
