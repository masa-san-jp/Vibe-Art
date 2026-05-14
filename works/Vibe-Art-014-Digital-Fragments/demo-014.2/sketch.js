'use strict';
/*
  Digital Fragments — Key Visual (p5.js / WEBGL)
  時間×空間のダイナミクス：
  - WEBGL 3D 空間 / ドリー＆軌道カメラ
  - 時間帯サイクル（色相・光量・呼吸）
  - 3D 粒子の収束/発散（破壊）
  - クリック波紋 / オーディオ反応（任意）
  操作: Drag=軌道, Wheel=ズーム, Click=波紋, D=破壊, R=再生, Space=自動儀礼, M=マイク, H=HUD
*/

let state = 'create'; // create | destroy | after
let autoRite = true;  // 自動サイクル
let riteT = 0;        // 儀礼時間（秒）
let camYaw = 0, camPitch = -0.2, camDist; // カメラ
let particles = [];
let ripples = [];    // クリック波紋
let symmetry = 10;
let dayPhase = 0;    // 0..1 日周位相
let hud = true;
let mic, amp, micOn = false;

const CFG = {
  numParticles: 1400,
  trailFade: 0.08,      // 長残像
  breatheHz: 0.1,
  swirl: 0.28,
  converge: 0.18,
  blow: 0.55,
  parallax: 0.012,
  cycleSec: 32,         // 1サイクル秒数
  daySpeed: 0.01,       // 日周速度
  rippleLife: 3.2,
  rippleMax: 6,
  fov: 60,
};

// パレット（HSB）
const PAL = {
  violet: { h:262, s:55, b:95 },
  gold:   { h:43,  s:78, b:96 },
  cyan:   { h:195, s:70, b:100 },
};

function setup(){
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360,100,100,1);
  noCursor();
  camDist = min(width, height) * 0.9;
  perspective(radians(CFG.fov), width/height, 1, 10000);
  resetScene();

  // マイク（任意）
  mic = new p5.AudioIn();
  amp = new p5.Amplitude();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  perspective(radians(CFG.fov), width/height, 1, 10000);
  camDist = min(width, height) * 0.9;
}

function resetScene(){
  particles = [];
  symmetry = 8 + floor(random(0,4))*2; // 偶数
  const N = CFG.numParticles;
  for(let i=0;i<N;i++){
    const r = random(20, min(width,height)*0.25);
    const th = random(TWO_PI), ph = random(-PI/2, PI/2);
    const x = cos(th)*cos(ph)*r;
    const y = sin(ph)*r*0.6; // 少し扁平
    const z = sin(th)*cos(ph)*r;
    particles.push({ x, y, z, vx:0, vy:0, vz:0, life: random(0.6,1), size: random(1.0, 2.6), hue: lerpHue(PAL.cyan, PAL.violet, random()) });
  }
  ripples = [];
  riteT = 0; state = 'create';
}

function draw(){
  // 長残像: 全画面を低アルファで塗る
  resetMatrix();
  noLights();
  blendMode(BLEND);
  noStroke(); fill(230, 20, 2, CFG.trailFade);
  rect(-width/2, -height/2, width, height);

  // 時間の進行
  const dt = min(0.033, deltaTime/1000);
  riteT += dt; dayPhase = (dayPhase + CFG.daySpeed*dt) % 1;
  if(autoRite){
    const p = (riteT % CFG.cycleSec) / CFG.cycleSec;
    if(p < 0.55) state = 'create';
    else if(p < 0.8) state = 'destroy';
    else state = 'after';
  }

  // カメラ軌道（ゆるやかな呼吸 + インタラクション）
  const breathe = 1 + 0.03 * sin(TWO_PI*CFG.breatheHz*millis()/1000);
  const eye = sph(camDist*breathe, camYaw, camPitch);
  camera(eye.x, eye.y, eye.z, 0,0,0, 0,1,0);

  // 微ライト（ボリューム感）
  ambientLight(0,0,10);
  directionalLight(0,0,40, -0.2, -0.4, -1);

  // 日周で色・発光量を変調
  const sky = phaseColor(dayPhase);

  // 背景の体積光（ライン）
  push();
  rotateY(millis()*0.00008);
  drawVolumeRays(sky);
  pop();

  // 中央：祭壇（リング）＋曼荼羅（回転）
  push();
  rotateY(millis()*0.00012);
  drawAltar(sky);
  drawMandala(sky);
  pop();

  // クリック波紋（プレーン円）
  push();
  drawRipples(sky, dt);
  pop();

  // 粒子
  push();
  updateParticles3D(sky, dt);
  pop();

  // 画面振る舞い（Destroy 時の軽いグリッチライン）
  if(state==='destroy' && random() < 0.18){
    resetMatrix();
    blendMode(DIFFERENCE);
    noStroke(); fill(0,0,100,0.06);
    const y = random(-height/2, height/2);
    rect(-width/2, y, width, random(1,3));
  }
}

/* === Drawing === */
function drawVolumeRays(sky){
  blendMode(ADD);
  const rays = 42;
  strokeWeight(2);
  for(let i=0;i<rays;i++){
    const a = (i/rays)*TWO_PI + noise(i*0.12, frameCount*0.004)*0.4;
    const len = min(width,height)*(0.35 + noise(i*0.2, frameCount*0.006)*0.4);
    const x2 = cos(a)*len, y2 = sin(a)*len;
    stroke(sky.h, 25, sky.b*0.9, 0.08);
    line(0,0,0, x2, y2, -200);
  }
  noStroke(); blendMode(BLEND);
}

function drawAltar(sky){
  blendMode(ADD);
  const baseR = min(width,height)*0.18 * (1 + 0.03*sin(frameCount*0.01));
  noFill();
  for(let i=0;i<9;i++){
    const r = baseR + i*10;
    stroke(sky.h, 40, 95, 0.06 + (i===0?0.12:0));
    strokeWeight(2 + i*0.6);
    push(); rotateX(HALF_PI); ellipse(0,0, r*2, r*2); pop();
  }
  // 中心残光
  noStroke();
  for(let i=0;i<60;i++){
    const rr = 2+i*2.2; fill(43,78,96, 0.014); // gold系
    push(); rotateX(HALF_PI); circle(0,0, rr*2); pop();
  }
}

function drawMandala(sky){
  blendMode(ADD);
  const layers = 6;
  for(let L=0;L<layers;L++){
    const R = 80 + L*38;
    const petals = symmetry*(1+(L%2));
    for(let i=0;i<petals;i++){
      const a = (i/petals)*TWO_PI;
      const hue = lerpHue(PAL.cyan, PAL.violet, i/petals);
      const b = 85 + 10*sin(frameCount*0.01 + L*0.4);
      push();
      rotateY(a);
      translate(0, 0, -R);
      rotateX(HALF_PI*0.7);
      noStroke(); fill(hue.h, hue.s, b, 0.1);
      petal(0,0, 6+L*1.6, 26+L*12);
      pop();
    }
  }
}

function petal(x,y,w,h){
  beginShape();
  vertex(x, y, 0);
  quadraticVertex(x-w, y-h*0.6, 0);
  quadraticVertex(x, y-h, 0);
  quadraticVertex(x+w, y-h*0.6, 0);
  quadraticVertex(x, y, 0);
  endShape(CLOSE);
}

function drawRipples(sky, dt){
  // 更新
  for(let i=ripples.length-1;i>=0;i--){
    const r = ripples[i];
    r.t += dt; if(r.t > CFG.rippleLife) ripples.splice(i,1);
  }
  // 描画（クリック位置の平面に円：カメラ前面に固定）
  resetMatrix();
  translate(0,0,1); // 画面座標系へ
  blendMode(ADD);
  for(const r of ripples){
    const p = r.t / CFG.rippleLife;
    const rad = easeOutQuad(p) * min(width,height)*0.8;
    const a = (1-p)*0.35;
    noFill(); stroke(sky.h, 30, 100, a);
    strokeWeight(2);
    ellipse(r.x - width/2, r.y - height/2, rad, rad);
  }
  blendMode(BLEND);
}

function updateParticles3D(sky, dt){
  const axis = createVector(0,1,0); // 渦軸
  const micLevel = micOn ? constrain(amp.getLevel()*4.0, 0, 1) : 0;
  const converge = CFG.converge * (1 + micLevel*0.8);
  const blow = CFG.blow * (1 + micLevel*1.2);

  for(const p of particles){
    const pos = createVector(p.x, p.y, p.z);
    const r = pos.mag() + 1e-6;
    let dir = pos.copy().div(r); // 外向き

    let fx=0, fy=0, fz=0;
    if(state==='create' || state==='after'){
      // 収束＋渦（axis × dir）
      const swirl = axis.copy().cross(dir).mult(CFG.swirl);
      const center = dir.copy().mult(-converge);
      const jitter = p5.Vector.random3D().mult(0.02);
      const f = swirl.add(center).add(jitter);
      fx=f.x; fy=f.y; fz=f.z;
    } else if(state==='destroy'){
      const outward = dir.mult(blow);
      const noiseF = p5.Vector.fromAngles(noise(p.x*0.01, p.y*0.01)*TWO_PI, noise(p.z*0.01, frameCount*0.01)*PI).mult(0.12);
      const f = outward.add(noiseF);
      fx=f.x; fy=f.y; fz=f.z;
    }

    p.vx += fx * p.life; p.vy += fy * p.life; p.vz += fz * p.life;
    p.vx *= 0.985; p.vy *= 0.985; p.vz *= 0.985;

    p.x += p.vx; p.y += p.vy; p.z += p.vz;

    // リセット：遠すぎた粒子は再投入
    const limit = max(width, height)*1.2;
    if(abs(p.x)>limit || abs(p.y)>limit || abs(p.z)>limit){
      p.x = random(-80,80); p.y = random(-80,80); p.z = random(-80,80);
      p.vx = p.vy = p.vz = 0;
    }

    // 描画（ZでDOF風にサイズ・透明度変調）
    const depth = map(p.z, -limit, limit, 1.4, 0.4, true);
    const alpha = (state==='destroy') ? 0.45 : 0.22;
    noStroke(); fill(sky.h, 28 + 40*depth, 100, alpha*depth);
    push(); translate(p.x, p.y, p.z); sphere(p.size*depth, 4, 3); pop();
  }
}

/* === Color & Math === */
function phaseColor(phase){
  // 夜(0)→暁→日中→黄昏→夜(1)
  const h = lerpHue({h:230,s:35,b:60}, PAL.gold, smoothstep(0.1,0.35,phase));
  const h2 = lerpHue(PAL.gold, PAL.violet, smoothstep(0.35,0.65,phase));
  const h3 = lerpHue(PAL.violet, {h:230,s:35,b:60}, smoothstep(0.65,0.95,phase));
  const pick = phase<0.35? h : phase<0.65? h2 : h3;
  return { h: pick.h, s: pick.s, b: pick.b };
}
function lerpHue(a,b,t){
  const wrap = x=> (x+360)%360;
  let dh = wrap(b.h - a.h); if(dh>180) dh -= 360;
  return { h: wrap(a.h + dh*t), s: lerp(a.s,b.s,t), b: lerp(a.b,b.b,t) };
}
function smoothstep(a,b,x){ x=constrain((x-a)/(b-a),0,1); return x*x*(3-2*x); }
function easeOutQuad(x){ return 1-(1-x)*(1-x); }
function sph(r, yaw, pitch){
  const x = r * cos(pitch) * sin(yaw);
  const y = r * sin(pitch);
  const z = r * cos(pitch) * cos(yaw);
  return {x,y,z};
}

/* === Interaction === */
let dragging = false; let lastX=0, lastY=0;
function mousePressed(){ dragging = true; lastX=mouseX; lastY=mouseY; }
function mouseReleased(){ dragging = false; }
function mouseDragged(){ if(dragging){ camYaw += (mouseX-lastX)*0.005; camPitch += (mouseY-lastY)*0.005; camPitch = constrain(camPitch, -1.2, 1.2); lastX=mouseX; lastY=mouseY; } }
function mouseWheel(e){ camDist *= (1 + e.deltaY*0.001); camDist = constrain(camDist, 200, 4000); return false; }
function mouseClicked(){
  ripples.push({ x: mouseX, y: mouseY, t:0 }); if(ripples.length>CFG.rippleMax) ripples.shift();
  // 衝撃波：中心付近の粒子に外向きインパルス
  const v = createVector((mouseX-width/2)*CFG.parallax*60, (mouseY-height/2)*CFG.parallax*60, 0);
  for(const p of particles){ const d = dist(p.x, p.y, v.x, v.y); if(d<180){ const dir=createVector(p.x-v.x,p.y-v.y,p.z).normalize(); p.vx+=dir.x*0.6; p.vy+=dir.y*0.6; p.vz+=dir.z*0.6; } }
}

function keyPressed(){
  if(key==='d' || key==='D') state='destroy';
  if(key==='r' || key==='R'){ state='after'; resetScene(false); }
  if(key==='h' || key==='H'){ hud=!hud; const el=document.getElementById('hud'); if(el) el.classList.toggle('hidden'); }
  if(key===' '){ autoRite = !autoRite; }
  if(key==='m' || key==='M') toggleMic();
  if(key==='s' || key==='S'){ const ts=new Date().toISOString().replace(/[:.]/g,'-'); saveCanvas('digital-fragments-'+ts,'png'); }
}

async function toggleMic(){
  try{
    if(!micOn){ await userStartAudio(); mic.start(); amp.setInput(mic); micOn=true; } else { mic.stop(); micOn=false; }
  } catch(e){ console.warn('Mic permission denied', e); micOn=false; }
}
