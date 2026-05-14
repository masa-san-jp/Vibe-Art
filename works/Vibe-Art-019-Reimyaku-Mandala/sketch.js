/** 霊脈曼荼羅 – Particle Mandala (Mic-Only + Fullscreen + Center Fix)
 *  - フルスクリーン: ボタン/キー F（p5 fullscreen API）
 *  - カメラ機能を撤去。FFT (low/mid/high) で RD / Kaleido / 粒子を制御
 *  - 右上寄りの表示→頂点シェーダで aPosition を [-1..1] へ正規化し中央描画
 *  - 粒子重畳（ADD）で色が“現れる”表現は継続
 */

let mainW, mainH, canvas;

// HUD
const qs = s => document.querySelector(s);
let elMicState, elFPS, elBands, elPsy, elPost, elMode;
let btnMic, btnSave, btnRec, btnFS;

// Audio
let mic, fft;
let bandLow = 0, bandMid = 0, bandHigh = 0;
let onsetCooldown = 0;

// Layers & buffers
let scenePg;              // 粒子レイヤ（2D, ADD）
let fbA, fbB;             // RD ping-pong
let shRD, shKaleido;      // shaders

// Kaleido / center
let kaleidoSides = 12;
let kaleidoSpin = 0;
let mandalaScale = 0.62;   // 中心半径（小さいほど中央凝集）
let particleWeight = 0.80; // 粒子寄与の強さ

// RD params
const RD = { Du:0.16, Dv:0.08, F:0.046, k:0.062, dt:1.0, injectRadius:0.08 };

// Palettes（アンカー）
const palettes = [
  [{r:11,g:13,b:16},{r:14,g:42,b:71},{r:59,g:63,b:70},{r:229,g:193,b:111}],
  [{r:10,g:34,b:24},{r:32,g:115,b:95},{r:146,g:196,b:125},{r:186,g:156,b:214}],
  [{r:14,g:29,b:63},{r:27,g:103,b:140},{r:235,g:232,b:220},{r:243,g:202,b:210}],
  [{r:52,g:10,b:16},{r:44,g:44,b:46},{r:148,g:101,b:73},{r:214,g:214,b:214}],
];
let paletteIdx = 0;

// Psy controls
let psy = 0.6;                // 0.0..2.0
let posterizeLevels = 0;      // 0=off, else N
let paletteMode = 0;          // 0=Cosine, 1=Sinebow
let hueBase = 0.0;            // 0..1
let aberration = 0.0010;      // 色収差は控えめ

// Nano Particles（微細粒子）
let nanos = [];
let nanoCount = 9000;
let nanoSpeedBase = 0.6;

// Recorder
let mediaRecorder, recChunks = [], recording = false;

// ---------- p5 lifecycle ----------
function setup() {
  pixelDensity(1);
  mainW = windowWidth; mainH = windowHeight;
  canvas = createCanvas(mainW, mainH, WEBGL);

  // HUD
  elMicState = qs('#micState'); elFPS = qs('#fpsVal'); elBands = qs('#bands');
  elPsy = qs('#psyVal'); elPost = qs('#postVal'); elMode = qs('#modeVal');
  btnMic = qs('#toggleMic'); btnSave = qs('#savePng'); btnRec = qs('#recBtn'); btnFS = qs('#fsBtn');
  btnMic.onclick = toggleMic; btnSave.onclick = savePNG; btnRec.onclick = toggleRecording; btnFS.onclick = toggleFullscreen;

  // 粒子レイヤ
  scenePg = createGraphics(mainW, mainH);
  scenePg.pixelDensity(1);
  scenePg.clear();

  // RD Framebuffer（WebGL ping-pong）
  const simW = floor(mainW * 0.5), simH = floor(mainH * 0.5);
  fbA = createFramebuffer({ width: simW, height: simH, density: 1 });
  fbB = createFramebuffer({ width: simW, height: simH, density: 1 });

  // シェーダ
  shRD = new p5.Shader(this._renderer, vertPassFull, fragRD);
  shKaleido = new p5.Shader(this._renderer, vertPassFull, fragKaleido);

  // Audio FFT
  fft = new p5.FFT(0.8, 1024);

  // Nano Particles
  initNanos();

  // Recorder
  setupRecorder();

  // RD 初期化
  resetRD();

  // HUD init
  elPsy.textContent = psy.toFixed(2);
  elPost.textContent = 'OFF';
  elMode.textContent = 'Cosine';
}

function windowResized() {
  mainW = windowWidth; mainH = windowHeight;
  resizeCanvas(mainW, mainH);

  const simW = floor(mainW * 0.5), simH = floor(mainH * 0.5);
  fbA = createFramebuffer({ width: simW, height: simH, density: 1 });
  fbB = createFramebuffer({ width: simW, height: simH, density: 1 });

  scenePg = createGraphics(mainW, mainH); scenePg.pixelDensity(1); scenePg.clear();

  resetRD();
  initNanos(true);
}

function draw() {
  const dt = deltaTime * 0.001;
  background(0);

  // ---- AUDIO ----
  if (mic && mic.enabled) {
    const spec = fft.analyze();
    bandLow = energyIn(spec, 20, 160);
    bandMid = energyIn(spec, 160, 2000);
    bandHigh = energyIn(spec, 2000, 8000);
    elBands.textContent = `${bandLow.toFixed(2)} / ${bandMid.toFixed(2)} / ${bandHigh.toFixed(2)}`;
    if (onsetCooldown <= 0 && (bandMid > 0.62 || bandLow > 0.7)) { flash(0.45); onsetCooldown = 0.22; }
    else onsetCooldown -= dt;
  }

  // ---- RD UPDATE（mic主導）----
  const injPos = createVector(constrain(mouseX / width, 0, 1), constrain(mouseY / height, 0, 1));
  const injAmt = (mouseIsPressed ? 0.7 : 0.0) + 0.5 * bandLow; // マイク低域で注入強化
  RD.F = lerp(0.038, 0.072, bandMid);                         // 中域でコントラスト
  RD.k = lerp(0.04, 0.07, 0.35 + 0.65 * (1.0 - bandHigh));    // 高域で粒立ち

  fbB.begin();
  shader(shRD);
  shRD.setUniform('uPrev', fbA.color);
  shRD.setUniform('uDu', RD.Du); shRD.setUniform('uDv', RD.Dv);
  shRD.setUniform('uF', RD.F);   shRD.setUniform('uK', RD.k);
  shRD.setUniform('uDt', RD.dt);
  shRD.setUniform('uResolution', [fbA.width, fbA.height]);
  shRD.setUniform('uInjectPos', [injPos.x, 1.0 - injPos.y]);
  shRD.setUniform('uInjectAmt', injAmt);
  shRD.setUniform('uInjectR', RD.injectRadius);
  noStroke(); rect(0,0,fbB.width,fbB.height);
  fbB.end();
  let tmp = fbA; fbA = fbB; fbB = tmp;

  // ---- 粒子（主役）----
  const speed = nanoSpeedBase * (0.6 + 0.6*psy + 0.4*bandMid);
  for (let i=0;i<nanos.length;i++) nanos[i].step(dt, speed);
  paintNanoLayer();   // ADD 合成で“重なって色が現れる”表現（blendMode(ADD)） :contentReference[oaicite:3]{index=3}

  // ---- 色相回転 / 収差 ----
  hueBase = (hueBase + dt*(0.02 + 0.35*bandMid + 0.15*psy)) % 1.0;
  const abDyn = aberration * (1.0 + 1.4*psy + 1.0*bandHigh);

  // ---- 最終合成（中央固定のカレイド）----
  kaleidoSpin += (0.004 + bandLow*0.02) * ( (kaleidoSides%2===0) ? -1 : 1 );
  shader(shKaleido);
  shKaleido.setUniform('uTexPaint', scenePg);
  shKaleido.setUniform('uTexRD', fbA.color);
  shKaleido.setUniform('uResolution', [width, height]);
  shKaleido.setUniform('uTime', millis()*0.001);
  shKaleido.setUniform('uSides', kaleidoSides);
  shKaleido.setUniform('uSpin', kaleidoSpin);
  shKaleido.setUniform('uMandalaScale', mandalaScale);
  shKaleido.setUniform('uParticleWeight', particleWeight);
  const pal = palettes[paletteIdx].flatMap(c => [c.r/255,c.g/255,c.b/255]);
  shKaleido.setUniform('uPalette', pal);
  shKaleido.setUniform('uPaletteMode', paletteMode);
  shKaleido.setUniform('uHueBase', hueBase);
  shKaleido.setUniform('uPsy', psy);
  shKaleido.setUniform('uPosterize', posterizeLevels);
  shKaleido.setUniform('uAberration', abDyn);
  rect(-width/2, -height/2, width, height);

  elFPS.textContent = nf(frameRate(),2,1);
}

// ---------- RD seed ----------
function resetRD(){
  fbA.begin();
  shader(shRD);
  shRD.setUniform('uPrev', fbA.color);
  shRD.setUniform('uDu', RD.Du); shRD.setUniform('uDv', RD.Dv);
  shRD.setUniform('uF', 0.0); shRD.setUniform('uK', 1.0); // init branch
  shRD.setUniform('uDt', 0.0);
  shRD.setUniform('uResolution', [fbA.width, fbA.height]);
  shRD.setUniform('uInjectPos', [0.5,0.5]);
  shRD.setUniform('uInjectAmt', 2.0);
  shRD.setUniform('uInjectR', 0.35);
  noStroke(); rect(0,0,fbA.width,fbA.height);
  fbA.end();
}

// ---------- Nano Particles ----------
class NanoParticle{
  constructor(){ this.reset(true); }
  reset(initial=false){
    const cx = width*0.5, cy = height*0.5;
    const rMax = min(width,height)*mandalaScale*0.9;
    const r = (initial? random()*rMax : randomGaussian(rMax*0.65, rMax*0.2));
    const a = random(TAU);
    this.pos = createVector(cx + r*cos(a), cy + r*sin(a));
    this.vel = p5.Vector.random2D().mult(random(0.2,1.0));
    this.size = random(0.7, 2.0);
    this.life = random(0.8, 3.0);
    this.jitter = random();
    this.energy = random(0.3, 1.0);

    const h = (hueBase + random()*0.2) % 1.0;
    const col = (paletteMode===0)? cosPal(h) : sinebow(h);
    const base = palettes[paletteIdx][3];
    const mixW = 0.2;
    const r3 = (1-mixW)*col[0]*255 + mixW*base.r;
    const g3 = (1-mixW)*col[1]*255 + mixW*base.g;
    const b3 = (1-mixW)*col[2]*255 + mixW*base.b;
    this.r = r3; this.g = g3; this.b = b3;
  }
  step(dt, spd){
    const t = millis()*0.00015;
    const ang = noise(this.pos.x*0.002, this.pos.y*0.002, t)*TAU*2.0;
    const flow = p5.Vector.fromAngle(ang).mult(spd*(0.5+0.8*bandHigh));
    const center = createVector(width*0.5, height*0.5);
    const pull = p5.Vector.sub(center, this.pos).setMag(0.02 + 0.05*bandLow);
    this.vel.add(flow).add(pull).limit(2.6 + psy*0.8);
    if (mouseIsPressed) this.vel.add(p5.Vector.sub(createVector(mouseX,mouseY), this.pos).setMag(0.04));
    this.pos.add(this.vel);

    const rMax = min(width,height)*mandalaScale*0.92;
    const d = p5.Vector.sub(this.pos, center).mag();
    if (d > rMax){
      const n = p5.Vector.sub(center, this.pos).normalize();
      this.vel.reflect(n); this.pos.add(n.mult(2.0));
    }
    this.life -= dt; if (this.life <= 0 || random()<0.002) this.reset();
  }
}
function initNanos(keep=false){ if(!keep) nanos = []; for(let i=nanos.length;i<nanoCount;i++) nanos.push(new NanoParticle()); }
function paintNanoLayer(){
  scenePg.push();
  scenePg.noStroke();
  scenePg.fill(0,0,0,16); scenePg.rect(0,0,scenePg.width,scenePg.height);
  scenePg.blendMode(ADD); // 粒子の重畳で色を構成（ADD） :contentReference[oaicite:4]{index=4}
  for(let i=0;i<nanos.length;i++){
    const n = nanos[i];
    const alpha = 10 + 90*n.energy;
    scenePg.fill(n.r, n.g, n.b, alpha);
    scenePg.circle(n.pos.x, n.pos.y, n.size);
    if(n.size<1.9 && n.jitter>0.2) scenePg.circle(n.pos.x+0.6, n.pos.y-0.4, n.size*0.8);
  }
  scenePg.pop();
}

// ---------- Audio ----------
function toggleMic(){
  if(!mic) mic = new p5.AudioIn();
  if(mic.enabled){ mic.stop(); fft.setInput(); elMicState.textContent='off'; }
  else{
    userStartAudio().then(()=>{
      mic.start(()=>{ fft.setInput(mic); elMicState.textContent='on'; },
                 ()=>{ elMicState.textContent='denied'; });
    });
  }
}
function energyIn(spec, fLo, fHi){
  const nyq = 44100/2;
  const loIdx = floor(map(fLo,0,nyq,0,spec.length-1));
  const hiIdx = floor(map(min(fHi,nyq),0,nyq,0,spec.length-1));
  let sum=0; for(let i=loIdx;i<=hiIdx;i++) sum+=spec[i];
  const avg = sum / max(1,(hiIdx-loIdx+1)); return constrain(avg/255,0,1);
}

// ---------- Ritual Flash ----------
function flash(strength=0.5){ RD.injectRadius = 0.08 + 0.18*strength; setTimeout(()=>{ RD.injectRadius = 0.08; }, 180); }

// ---------- Save / Record / Fullscreen ----------
function savePNG(){ saveCanvas('reimyaku_mandala_mic', 'png'); }
function setupRecorder(){
  try{
    const stream = canvas.elt.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, { mimeType:'video/webm;codecs=vp9' });
    mediaRecorder.ondataavailable = e => { if(e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recChunks,{type:'video/webm'}); recChunks=[];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='reimyaku_clip_mic.webm';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
  }catch(e){ console.warn('MediaRecorder not available', e); qs('#recBtn').disabled=true; }
}
function toggleRecording(){
  if(!mediaRecorder) return;
  if(!recording){ mediaRecorder.start(); recording=true; qs('#recBtn').textContent='⏹ 停止'; }
  else{ mediaRecorder.stop(); recording=false; qs('#recBtn').textContent='⏺ 録画'; }
}
function toggleFullscreen(){
  // ユーザー操作からの呼び出しでのみ許可（p5 fullscreen API） :contentReference[oaicite:5]{index=5}
  const next = !fullscreen(); fullscreen(next);
}

// ---------- Key bindings ----------
function keyPressed(){
  if (key==='R') resetRD();
  if (key==='C') paletteIdx=(paletteIdx+1)%palettes.length;
  if (key===' ') flash(0.75);
  if (key==='P') savePNG();
  if (key>='1' && key<='4'){ kaleidoSides=[12,8,16,10][int(key)-1]; }
  if (key==='V'){ psy = [0.0,0.6,1.2,2.0][ (([0.0,0.6,1.2,2.0].indexOf(psy)+1)%4) ]; elPsy.textContent = psy.toFixed(2); }
  if (key==='B'){ posterizeLevels = (posterizeLevels===0)?8 : (posterizeLevels===8?16:0); elPost.textContent = posterizeLevels===0 ? 'OFF' : String(posterizeLevels); }
  if (key==='X'){ paletteMode = (paletteMode===0)?1:0; elMode.textContent = paletteMode===0 ? 'Cosine' : 'Sinebow'; }
  if (key==='F'){ toggleFullscreen(); }
}

// ---------- Palette funcs (JS) ----------
function cosPal(t){
  const a=0.5, b=0.5;
  const r = a + b * Math.cos(TAU*(t + 0.00));
  const g = a + b * Math.cos(TAU*(t + 0.33));
  const b3= a + b * Math.cos(TAU*(t + 0.67));
  return [r,g,b3];
}
function sinebow(h){
  const r=Math.sin(Math.PI*h), g=Math.sin(Math.PI*(h+1/3)), b=Math.sin(Math.PI*(h+2/3));
  return [r*r, g*g, b*b];
}

// ---------- Shaders ----------
// 中央表示のため、頂点をクリップ空間[-1..1]へ正規化（p5公式のシェーダ導入と同じ発想） :contentReference[oaicite:6]{index=6}
const vertPassFull = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vUv;
  void main(){
    vUv = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0; // full-screen quad
    gl_Position = positionVec4;
  }
`;

// Gray-Scott RD update
const fragRD = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2 uResolution;
  uniform float uDu,uDv,uF,uK,uDt;
  uniform vec2 uInjectPos;
  uniform float uInjectAmt,uInjectR;

  vec2 laplace(sampler2D t, vec2 uv, vec2 px){
    vec2 c=texture2D(t,uv).rg; vec2 s=vec2(0.0);
    s+=texture2D(t,uv+vec2( px.x,0.0)).rg;
    s+=texture2D(t,uv+vec2(-px.x,0.0)).rg;
    s+=texture2D(t,uv+vec2(0.0, px.y)).rg;
    s+=texture2D(t,uv+vec2(0.0,-px.y)).rg;
    s+=texture2D(t,uv+vec2( px.x, px.y)).rg;
    s+=texture2D(t,uv+vec2(-px.x, px.y)).rg;
    s+=texture2D(t,uv+vec2( px.x,-px.y)).rg;
    s+=texture2D(t,uv+vec2(-px.x,-px.y)).rg;
    return s-8.0*c;
  }
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }

  void main(){
    vec2 px=1.0/uResolution;
    vec2 st=texture2D(uPrev,vUv).rg;

    // init: U=1,V=0 に中央注入
    if(uF==0.0 && uK==1.0){
      float d=distance(vUv,uInjectPos);
      float inj=smoothstep(uInjectR,0.0,d);
      float U=1.0-0.5*inj + h(vUv*vec2(17.3,29.7))*0.02;
      float V=0.25*inj;
      gl_FragColor=vec4(U,V,0.0,1.0);
      return;
    }

    float U=st.r, V=st.g;
    vec2 L=laplace(uPrev,vUv,px);
    float dU=uDu*L.r - U*V*V + uF*(1.0-U);
    float dV=uDv*L.g + U*V*V - (uF+uK)*V;
    U+=dU*uDt; V+=dV*uDt;

    float d=distance(vUv,uInjectPos);
    float inj=smoothstep(uInjectR,0.0,d)*uInjectAmt;
    U+=inj*0.50; V-=inj*0.25;

    gl_FragColor=vec4(clamp(U,0.0,1.0), clamp(V,0.0,1.0), 0.0,1.0);
  }
`;

// Centered Kaleido + Particle-weighted composite
const fragKaleido = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexPaint;
  uniform sampler2D uTexRD;
  uniform vec2 uResolution;
  uniform float uTime, uSides, uSpin;
  uniform float uPalette[12];
  uniform float uPaletteMode, uHueBase, uPsy, uPosterize, uAberration;
  uniform float uMandalaScale;     // 中心スケール
  uniform float uParticleWeight;   // 粒子寄与

  vec2 kaleidoUV(vec2 uv, float sides, float spin){
    vec2 centered = (uv - 0.5) / uMandalaScale + 0.5; // 中央寄せ
    vec2 p = centered*2.0-1.0;
    p.x *= uResolution.x/uResolution.y;
    float r = length(p);
    float a = atan(p.y,p.x) + spin;
    float sector = 6.28318530718 / max(1.0, sides);
    a = mod(a, sector);
    if(a > sector*0.5) a = sector - a;
    vec2 q = vec2(cos(a), sin(a)) * r;
    q.x /= (uResolution.x/uResolution.y);
    return (q+1.0)*0.5;
  }

  vec3 cosPal(float t){
    vec3 a=vec3(0.5), b=vec3(0.5), c=vec3(1.0), d=vec3(0.00,0.33,0.67);
    return a + b*cos(6.2831853*(c*t+d));
  }
  vec3 sinebow(float h){
    float r=sin(3.14159265*h), g=sin(3.14159265*(h+1.0/3.0)), b=sin(3.14159265*(h+2.0/3.0));
    return vec3(r*r, g*g, b*b);
  }
  vec3 palLerp(float t){
    vec3 c0=vec3(uPalette[0],uPalette[1],uPalette[2]);
    vec3 c1=vec3(uPalette[3],uPalette[4],uPalette[5]);
    vec3 c2=vec3(uPalette[6],uPalette[7],uPalette[8]);
    vec3 c3=vec3(uPalette[9],uPalette[10],uPalette[11]);
    float x=clamp(t,0.0,1.0)*3.0; float k=fract(x);
    if(x<1.0) return mix(c0,c1,k);
    if(x<2.0) return mix(c1,c2,k);
    return mix(c2,c3,k);
  }
  vec3 posterize(vec3 c, float levels){
    if(levels<=1.0) return c; return floor(c*levels)/levels;
  }

  vec3 sampleBase(vec2 uv){
    vec2 rd = texture2D(uTexRD, uv).rg;
    float t = clamp((rd.r-rd.g)*0.85+0.5, 0.0, 1.0);
    float paintL = dot(texture2D(uTexPaint, uv).rgb, vec3(0.299,0.587,0.114));
    float phase = fract(t*(0.7+0.2*uPsy) + 0.15*paintL + uHueBase);
    vec3 cyc = (uPaletteMode<0.5) ? cosPal(phase) : sinebow(phase);
    vec3 pal = palLerp(t);
    vec3 base = mix(cyc, pal, 0.18);
    base = pow(base, vec3(0.9 - 0.25*uPsy)) * (0.85 + 0.25*uPsy);
    return base;
  }

  void main(){
    vec2 kUV = kaleidoUV(vUv, uSides, uSpin);

    // RGB split
    vec2 dir = normalize(vUv-0.5);
    float ab = uAberration;
    vec3 baseR = sampleBase(kUV + dir*(+ab));
    vec3 baseG = sampleBase(kUV);
    vec3 baseB = sampleBase(kUV + dir*(-ab));
    vec3 base = vec3(baseR.r, baseG.g, baseB.b) * 0.35;

    // 粒子レイヤ（加算）
    vec3 paint = texture2D(uTexPaint, kUV).rgb;
    vec3 color = mix(base, paint, clamp(uParticleWeight, 0.0, 1.0));
    if(uPosterize>=2.0) color = posterize(color, uPosterize);

    // 円形マスクで中央固定を強調
    float r = length((vUv-0.5)*2.0);
    float mask = 1.0 - smoothstep(uMandalaScale*1.02, uMandalaScale*1.12, r);
    color *= mask;

    gl_FragColor = vec4(color,1.0);
  }
`;

// ---------- small utils ----------
function nf(x,i=2,f=0){ return (x||0).toFixed(f); }
