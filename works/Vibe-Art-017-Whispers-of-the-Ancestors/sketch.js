/* 微生共鳴曼荼羅 – Interactive Web Art (p5.js)
   - WebGL + シェーダで Gray–Scott 反応拡散（ping-pong）
   - マイク FFT → 感情（簡易）/輝度/スピード、カメラ差分 → GrowthIndex
   - ラジアル対称の曼荼羅合成、簡易グロー、PCB風オーバレイ、流体的フロー場
   - 仕様書の「見る/聴く/触る」をブラウザだけで体験可能なスコープで実装
*/

// ======== Globals ========
let rdRes = 512;                 // 反応拡散テクスチャ解像度
let canvas, mic, fft, started = false;
let cam, camG, prevCamPixels = null, growthIndex = 0;
let rdA, rdB, rdUpdateShader, rdInitShader, composeShader;
let comp, bloomLayer, pcbLayer;
let flowLayer, particles = [];
let feed = 0.035, kill = 0.06, Du = 0.16, Dv = 0.08, dt = 1.0;
let seedPos = [-1, -1], seedDown = 0, brushRadius = 0.04;
let bands = { low: 0, mid: 0, high: 0, rms: 0 };
let valence = 0.0, arousal = 0.0;
let symmetry = 8, mode = 'observe';
let showHUD = true;
let isRecording = false, recorder = null, recChunks = [], recTimer = null;

// Flow field params
const FLOW_PARTICLES = 2800;
const FLOW_FADE = 18;  // 背景に残像
let flowTime = 0;

// ======== Shaders (vertex pass-through) ========
const VERT = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vUv;
  void main() {
    vUv = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
  }
`;

// Gray–Scott 更新
const FRAG_RD_UPDATE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D stateTex;  // RG: U, V
  uniform sampler2D camTex;    // カメラ（明度で微注入）
  uniform vec2  resolution;
  uniform float Du, Dv, feed, kill, dt;
  uniform vec2  seedPos;
  uniform float seedDown;
  uniform float brushRadius;
  uniform float camInfluence;

  float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec2 texel = 1.0 / resolution;
    vec2 uv = vUv;

    // 8近傍ラプラシアン（重み付き）
    vec2 c  = texture2D(stateTex, uv).rg;
    vec2 up = texture2D(stateTex, uv + vec2(0.0,  texel.y)).rg;
    vec2 dn = texture2D(stateTex, uv - vec2(0.0,  texel.y)).rg;
    vec2 lf = texture2D(stateTex, uv - vec2(texel.x, 0.0)).rg;
    vec2 rt = texture2D(stateTex, uv + vec2(texel.x, 0.0)).rg;

    vec2 ul = texture2D(stateTex, uv + vec2(-texel.x,  texel.y)).rg;
    vec2 ur = texture2D(stateTex, uv + vec2( texel.x,  texel.y)).rg;
    vec2 dl = texture2D(stateTex, uv + vec2(-texel.x, -texel.y)).rg;
    vec2 dr = texture2D(stateTex, uv + vec2( texel.x, -texel.y)).rg;

    float lapU = (up.x + dn.x + lf.x + rt.x) * 0.2
               + (ul.x + ur.x + dl.x + dr.x) * 0.05 - c.x;
    float lapV = (up.y + dn.y + lf.y + rt.y) * 0.2
               + (ul.y + ur.y + dl.y + dr.y) * 0.05 - c.y;

    float U = c.x;
    float V = c.y;

    // Gray–Scott
    float uvv = U * V * V;
    float dU = Du * lapU - uvv + feed * (1.0 - U);
    float dV = Dv * lapV + uvv - (feed + kill) * V;

    // マウス注入（V を増やす）
    float addV = 0.0;
    if (seedDown > 0.5) {
      float d = distance(uv, seedPos);
      addV += smoothstep(brushRadius, 0.0, d) * 0.35;
    }

    // カメラ明度で微注入（活動が高い領域を増殖しやすく）
    vec3 camc = texture2D(camTex, uv).rgb;
    float camL = luma(camc);
    addV += camInfluence * camL * 0.01;

    U += dU * dt;
    V += (dV * dt) + addV;

    U = clamp(U, 0.0, 1.0);
    V = clamp(V, 0.0, 1.0);

    gl_FragColor = vec4(U, V, 0.0, 1.0);
  }
`;

// RD 初期化（U=1,V=0にランダム種）
const FRAG_RD_INIT = `
  precision highp float;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(27.168, 38.341))) * 1753.113); }
  void main(){
    float U = 1.0;
    float V = step(0.995, hash(vUv*vec2(1024.0, 768.0))) * 0.9; // まばらに種
    gl_FragColor = vec4(U, V, 0.0, 1.0);
  }
`;

// 合成（曼荼羅対称＋色調）
const FRAG_COMPOSE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D rdTex;
  uniform sampler2D camTex;
  uniform float symmetry;   // 分割数
  uniform float valence;    // [-1,1]
  uniform float arousal;    // [0,1]
  uniform vec3 bands;       // low, mid, high
  uniform vec2 resolution;
  uniform float time;

  vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

  void main(){
    vec2 uv = vUv; // 0..1
    vec2 p = (uv - 0.5) * 2.0;
    float r = length(p);
    float ang = atan(p.y, p.x); // -pi..pi
    ang = (ang < 0.0) ? (ang + 6.28318530718) : ang; // 0..2pi

    float seg = 6.28318530718 / max(1.0, symmetry);
    float half = 0.5 * seg;
    float idx = floor(ang/seg);
    float a = mod(ang, seg);
    // ミラー対称
    if (mod(idx, 2.0) > 0.5) a = seg - a;

    float baseAng = a - half;
    vec2 base = vec2(cos(baseAng), sin(baseAng)) * r * 0.5 + 0.5;

    // RD サンプリング（V 成分でパターン）
    vec2 rd = texture2D(rdTex, base).rg;
    float pat = rd.y;               // V
    float edge = smoothstep(0.95, 1.0, r); // 外縁フェード

    // 感情 → 色（Hue は青紫→赤橙に補間）
    float hueCool = 0.60; // 216°
    float hueWarm = 0.08; // 30°
    float h = mix(hueCool, hueWarm, (valence + 1.0) * 0.5);
    float s = 0.55 + 0.4 * abs(valence);
    float v = 0.45 + 0.55 * arousal;

    // パターンから明度を増幅
    float m = pow(pat, 0.65);
    vec3 color = hsv2rgb(vec3(h, s, v)) * (0.35 + 0.75*m);

    // 高域できらめき、低域で中心グローの重み
    float glow = smoothstep(0.0, 0.65 + 0.2*arousal, 1.0 - r);
    color += glow * bands.x * 0.003;           // low（中心）
    color += bands.z * 0.002 * vec3(1.0,1.0,1.0); // high（全体微発光）

    // カメラ明度で微妙なテクスチャブレンド
    float camL = luma(texture2D(camTex, base).rgb);
    color = mix(color, color * (0.85 + 0.3*camL), 0.35);

    // 外縁の暗落ち
    color *= (1.0 - 0.6*edge);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ======== p5 setup / draw ========
function setup(){
  const holder = document.getElementById('sketch-container');
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent(holder);
  pixelDensity(1);

  // Camera
  cam = createCapture({ video: { facingMode: "environment" }, audio: false });
  cam.elt.setAttribute('playsinline', '');
  cam.hide();

  // Small cam buffer for motion
  camG = createGraphics(64, 64);
  camG.pixelDensity(1);

  // Offscreen buffers (WEBGL)
  rdA = createGraphics(rdRes, rdRes, WEBGL);
  rdB = createGraphics(rdRes, rdRes, WEBGL);
  comp = createGraphics(rdRes, rdRes, WEBGL);
  bloomLayer = createGraphics(rdRes, rdRes);
  pcbLayer = createGraphics(rdRes, rdRes);

  // Flow layer（画面サイズ）
  flowLayer = createGraphics(windowWidth, windowHeight);
  flowLayer.clear();
  flowLayer.noFill();
  flowLayer.stroke(180, 210, 255, 32);
  flowLayer.strokeWeight(1);

  // Shaders
  rdUpdateShader = rdA.createShader(VERT, FRAG_RD_UPDATE);
  rdInitShader   = rdA.createShader(VERT, FRAG_RD_INIT);
  composeShader  = comp.createShader(VERT, FRAG_COMPOSE);

  // Init RD state
  applyShader(rdA, rdInitShader, {});

  // PCB overlay pre-render
  drawPCBLayer();

  // Flow particles
  initParticles();

  // UI overlay start button
  const startBtn = document.getElementById('startBtn');
  startBtn.addEventListener('click', startInteractive);
  window.addEventListener('keydown', (e)=>{
    if(e.code === 'Space' && !started){ e.preventDefault(); startInteractive(); }
  });

  updateHUD('rec', '● STOP');
}

function startInteractive(){
  userStartAudio().then(()=>{
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT(0.8, 1024);
    fft.setInput(mic);
    started = true;
    document.getElementById('overlay').classList.add('hidden');
  }).catch(()=>{
    // 失敗しても視覚のみで動作
    started = true;
    document.getElementById('overlay').classList.add('hidden');
  });
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  // Flow layer 再作成（追従）
  flowLayer = createGraphics(windowWidth, windowHeight);
  flowLayer.clear();
  flowLayer.noFill();
  flowLayer.stroke(180, 210, 255, 32);
  flowLayer.strokeWeight(1);
  initParticles();
}

function draw(){
  background(3);

  // ===== 1) 入力解析 =====
  updateAudio();
  updateCameraMotion();

  // モード別重み（観察/描画/祖霊）
  const weights = {
    observe: { cam: 0.6, audio: 1.0, brush: 1.0 },
    draw:    { cam: 0.5, audio: 0.8, brush: 1.4 },
    ancestor:{ cam: 0.7, audio: 1.25, brush: 1.0 }
  }[mode] || { cam: 0.6, audio: 1.0, brush: 1.0 };

  // RDパラメータ（感情・成長で変調）
  feed = constrain(lerp(0.018, 0.060, growthIndex) + 0.002 * bands.high * weights.audio, 0.015, 0.075);
  kill = constrain(lerp(0.045, 0.070, arousal) + 0.003 * Math.abs(valence), 0.040, 0.085);

  // ===== 2) RD シミュレーション（2ステップ） =====
  for (let i=0; i<2; i++){
    applyShader(rdB, rdUpdateShader, {
      stateTex: rdA, camTex: cam,
      resolution: [rdRes, rdRes],
      Du, Dv, feed, kill, dt,
      seedPos, seedDown, brushRadius: brushRadius*weights.brush,
      camInfluence: 0.6 * weights.cam
    });
    // swap
    const tmp = rdA; rdA = rdB; rdB = tmp;
  }

  // ===== 3) 合成（曼荼羅） =====
  applyShader(comp, composeShader, {
    rdTex: rdA, camTex: cam,
    symmetry: symmetry, valence: valence, arousal: arousal,
    bands: [bands.low, bands.mid, bands.high],
    resolution: [rdRes, rdRes],
    time: millis()/1000
  });

  // ===== 4) 背景フロー場 =====
  flowTime += 0.006 + 0.01*arousal;
  updateParticles();

  // ===== 5) 描画順（Flow → RD → Bloom → PCB） =====
  const S = min(width, height);

  // Flow field（先に敷く）
  push();
  texture(flowLayer);
  noStroke();
  plane(width, height);
  pop();

  // RD 合成
  push();
  noStroke();
  texture(comp);
  plane(S, S);
  pop();

  // Bloom（ぼかし＋加算）
  bloomLayer.clear();
  bloomLayer.push();
  bloomLayer.image(comp, 0, 0, rdRes, rdRes);
  bloomLayer.filter(BLUR, 2 + 4 * arousal);
  bloomLayer.pop();

  push();
  blendMode(ADD);
  texture(bloomLayer);
  plane(S, S);
  blendMode(BLEND);
  pop();

  // PCBオーバレイ（微回転）
  push();
  rotateZ(millis()*0.0001 * (1 + bands.mid*1.5));
  tint(120, 220, 170, 60 + arousal*120);
  texture(pcbLayer);
  plane(S*0.98, S*0.98);
  pop();

  // HUD
  if (showHUD) drawHUD();

  // seed フラグ（短いタップ許容）
  if (seedDown > 0 && mouseIsPressed === false) seedDown = 0;
}

// ======== Input / Analysis ========
function updateAudio(){
  if (!fft) {
    // マイク未許可時も緩やかに
    bands.low  = lerp(bands.low,  0.05, 0.02);
    bands.mid  = lerp(bands.mid,  0.05, 0.02);
    bands.high = lerp(bands.high, 0.05, 0.02);
    bands.rms  = lerp(bands.rms,  0.12, 0.02);
    arousal    = constrain(lerp(arousal, bands.rms, 0.02), 0, 1);
    valence    = lerp(valence,    0.0,  0.02);
    return;
  }
  const lo = fft.getEnergy(20, 160) / 255;
  const mi = fft.getEnergy(160, 2000) / 255;
  const hi = fft.getEnergy(2000, 8000) / 255;
  const lev = mic.getLevel();

  // スムージング
  bands.low  = lerp(bands.low,  lo, 0.15);
  bands.mid  = lerp(bands.mid,  mi, 0.15);
  bands.high = lerp(bands.high, hi, 0.15);
  bands.rms  = lerp(bands.rms,  lev*3.0, 0.2);

  // Arousal: 音量主体
  arousal = constrain(lerp(arousal, bands.rms, 0.25), 0, 1);

  // Valence: 高域 - 低域 を簡易指標（モック）
  const rawVal = constrain((hi - lo) * 1.8, -1, 1);
  valence = lerp(valence, rawVal, 0.15);

  updateHUD('valence', valence.toFixed(2));
  updateHUD('arousal', arousal.toFixed(2));
}

function updateCameraMotion(){
  if (!cam || cam.width === 0) return;
  camG.push();
  camG.translate(camG.width, 0);
  camG.scale(-1, 1); // ミラー
  camG.image(cam, 0, 0, camG.width, camG.height);
  camG.pop();

  camG.loadPixels();
  if (!prevCamPixels) {
    prevCamPixels = new Uint8ClampedArray(camG.pixels);
    growthIndex = 0.0;
  } else {
    let sum = 0, N = camG.width * camG.height;
    for (let i=0; i<camG.pixels.length; i+=4){
      const dr = Math.abs(camG.pixels[i]   - prevCamPixels[i]);
      const dg = Math.abs(camG.pixels[i+1] - prevCamPixels[i+1]);
      const db = Math.abs(camG.pixels[i+2] - prevCamPixels[i+2]);
      sum += (0.299*dr + 0.587*dg + 0.114*db);
    }
    const avg = sum / (N * 255.0);
    growthIndex = constrain(lerp(growthIndex, avg*2.0, 0.25), 0, 1);
    prevCamPixels.set(camG.pixels);
  }
  updateHUD('growth', growthIndex.toFixed(2));
}

// ======== Flow field ========
function initParticles(){
  particles = [];
  for (let i=0; i<FLOW_PARTICLES; i++){
    particles.push({
      x: random(width), y: random(height),
      vx: 0, vy: 0
    });
  }
}
function updateParticles(){
  // フェード（残像）
  flowLayer.push();
  flowLayer.noStroke();
  flowLayer.fill(0, 0, 0, FLOW_FADE);
  flowLayer.rect(0, 0, flowLayer.width, flowLayer.height);
  flowLayer.pop();

  flowLayer.stroke(180, 210, 255, 36 + 50*arousal);
  flowLayer.strokeWeight(1);

  const s = 0.0018 + 0.001*bands.mid; // ノイズスケール
  const spd = 0.6 + 1.2*arousal;

  flowLayer.push();
  for (let p of particles){
    // Perlin noise → ベクトル場
    const a = noise(p.x * s, p.y * s, flowTime) * TAU * 2.0;
    p.vx = Math.cos(a) * spd;
    p.vy = Math.sin(a) * spd;

    const x2 = p.x + p.vx, y2 = p.y + p.vy;
    flowLayer.line(p.x, p.y, x2, y2);
    p.x = x2; p.y = y2;

    // 端でラップ
    if (p.x < 0) p.x += width; if (p.x >= width) p.x -= width;
    if (p.y < 0) p.y += height; if (p.y >= height) p.y -= height;
  }
  flowLayer.pop();
}

// ======== Utility drawing ========
function applyShader(targetGraphics, shader, uniforms){
  targetGraphics.shader(shader);
  for (const key in uniforms){
    const v = uniforms[key];
    shader.setUniform(key, v);
  }
  targetGraphics.push();
  targetGraphics.noStroke();
  targetGraphics.rectMode(CENTER);
  targetGraphics.rect(0, 0, targetGraphics.width, targetGraphics.height);
  targetGraphics.pop();
}

function drawPCBLayer(){
  pcbLayer.clear();
  pcbLayer.push();
  pcbLayer.translate(pcbLayer.width/2, pcbLayer.height/2);
  pcbLayer.noFill();
  pcbLayer.stroke(100, 220, 170, 90);
  pcbLayer.strokeWeight(1.2);

  const R = pcbLayer.width*0.47;
  // 同心円アーク
  for (let i=0; i<18; i++){
    const r = R * (0.15 + 0.8*i/18);
    pcbLayer.arc(0, 0, r*2, r*2, random(TAU), random(TAU));
  }
  // 放射線（最近傍風の貪欲配線イメージ）
  for (let i=0; i<220; i++){
    const a = (i/220)*TAU + random(-0.015, 0.015);
    const r1 = R * random(0.18, 0.95);
    const r2 = r1 + R * random(0.02, 0.12);
    pcbLayer.line(r1*cos(a), r1*sin(a), r2*cos(a), r2*sin(a));
  }
  // ビア（ドット）
  pcbLayer.noStroke();
  pcbLayer.fill(120, 230, 180, 130);
  for (let i=0; i<180; i++){
    const a = random(TAU);
    const r = R * random(0.12, 0.95);
    pcbLayer.circle(r*cos(a), r*sin(a), random(2, 4));
  }
  pcbLayer.pop();
}

// ======== HUD & Controls ========
function drawHUD(){
  push();
  resetMatrix(); // 左上原点
  translate(16, 16);

  // 小さなバンドメーター
  noStroke(); fill(255,180);
  textSize(12);
  text('Audio bands', 0, 0);
  const W = 120, H = 6, G = 8;
  fill(90, 200, 255); rect(0, 10, W*bands.low, H, 4);
  fill(140, 220, 255); rect(0, 10+H+G, W*bands.mid, H, 4);
  fill(220, 240, 255); rect(0, 10+(H+G)*2, W*bands.high, H, 4);
  pop();
}

function keyPressed(){
  if (key === 'h' || key === 'H'){
    showHUD = !showHUD;
    document.getElementById('hud').classList.toggle('hidden', !showHUD);
  }
  if (key === 's' || key === 'S'){
    saveCanvas('mandala_snapshot', 'png');
  }
  if (keyCode === LEFT_ARROW){
    symmetry = max(1, symmetry-1);
    updateHUD('sym', symmetry);
  }
  if (keyCode === RIGHT_ARROW){
    symmetry += 1;
    updateHUD('sym', symmetry);
  }
  if (key === '1'){ mode = 'observe'; updateHUD('mode', mode); }
  if (key === '2'){ mode = 'draw';    updateHUD('mode', mode); }
  if (key === '3'){ mode = 'ancestor';updateHUD('mode', mode); }
  if (key === 'r' || key === 'R'){ toggleRecording(); }
}

function mousePressed(){ injectSeedFromMouse(); }
function mouseDragged(){ injectSeedFromMouse(); }
function mouseReleased(){ seedDown = 0.0; }

function injectSeedFromMouse(){
  // 画面→正方 RD 空間のUVへ射影（中央に正方表示している近似）
  const s = min(width, height);
  const cx = width/2, cy = height/2;
  const mx = mouseX - cx, my = mouseY - cy;
  if (abs(mx) <= s/2 && abs(my) <= s/2){
    const u = (mx / s) + 0.5;
    const v = (my / s) + 0.5;
    seedPos = [u, v];
    seedDown = 1.0;
  }
}

function updateHUD(id, val){
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ======== Recording (MediaRecorder) ========
function toggleRecording(){
  if (isRecording){
    try { recorder && recorder.state === 'recording' && recorder.stop(); } catch(e){}
    if (recTimer) clearTimeout(recTimer);
    updateHUD('rec', '● STOP');
    isRecording = false;
    return;
  }
  // Start
  if (!('MediaRecorder' in window)) { alert('このブラウザは録画に対応していません。'); return; }
  const stream = canvas.elt.captureStream(30);
  recChunks = [];
  recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) recChunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(recChunks, {type: 'video/webm'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mandala_recording.webm';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };
  recorder.start();
  isRecording = true;
  updateHUD('rec', '● REC...');
  // デフォルト20秒
  recTimer = setTimeout(()=>{ if (recorder && recorder.state === 'recording') recorder.stop(); updateHUD('rec', '● STOP'); isRecording=false; }, 20000);
}
