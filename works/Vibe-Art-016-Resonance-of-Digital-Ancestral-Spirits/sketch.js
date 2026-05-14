// sketch.js
// --- Visual core (p5.js) + Web Audio API (no p5.sound) ---

// Particles (flow field)
let particles = [];
let noiseT = 0;
const FLOW_SCALE = 0.0015;
const PARTICLE_COUNT = 600;

// Audio (Web Audio API)
let audioCtx = null, analyser = null, freqData = null;
let low=0, mid=0, high=0;
let pulse = 0;

// Camera (optional brightness influence)
let cam = null, camEl = null, camReady = false, camBrightness = 0;

// UI refs
let btnMic, btnCam;

// --- p5 setup/draw ---
function setup(){
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360,100,100,100);
  background(0);

  // init particles
  for(let i=0;i<PARTICLE_COUNT;i++) particles.push(new Particle());

  // UI hooks
  btnMic = document.getElementById('btnMic');
  btnCam = document.getElementById('btnCam');
  btnMic.addEventListener('click', enableMic);
  btnCam.addEventListener('click', enableCam);

  // Chat form submit to keep focus UX
  const form = document.getElementById('chatForm');
  form.addEventListener('submit', e => e.preventDefault());

  // Expose pulse bump for openai.js
  window.bumpPulse = (amt=1.0)=>{ pulse = Math.min(2, pulse+amt); };
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); }

function draw(){
  // subtle trail (motion persistence)
  noStroke();
  fill(0,0,0,12);
  rect(0,0,width,height);

  // audio analysis (if ready)
  if(analyser){
    analyser.getByteFrequencyData(freqData);
    const n = freqData.length;
    const avg = (a,b)=> {
      let s=0; for(let i=a;i<b;i++) s+=freqData[i]; return s/Math.max(1,b-a);
    };
    // Rough bands: 0-12%, 12-40%, 40-90%
    low  = avg(0, Math.floor(n*0.12)) / 255;
    mid  = avg(Math.floor(n*0.12), Math.floor(n*0.40)) / 255;
    high = avg(Math.floor(n*0.40), Math.floor(n*0.90)) / 255;

    // simple peak detection
    const level = 0.6*low + 0.3*mid + 0.1*high;
    if(level > 0.72 && pulse < 0.4) pulse = 1.2;
  }
  pulse *= 0.96;

  // flow field update/draw
  strokeWeight(1);
  for(const p of particles){ p.update(); p.draw(); }

  // avatar orb (semi-figurative soulful glow)
  drawAvatar();

  // time evolve flow
  noiseT += 0.0008;

  // optional camera brightness probe (every few frames)
  if(camReady && frameCount % 6 === 0){
    cam.loadPixels();
    if(cam.pixels.length){
      let sum=0, step=4*10; // sample every 10th pixel
      for(let i=0; i<cam.pixels.length; i+=step){
        // pixels = [r,g,b,a,...]
        const r=cam.pixels[i], g=cam.pixels[i+1], b=cam.pixels[i+2];
        sum += (r+g+b)/3;
      }
      camBrightness = (sum / (cam.pixels.length/step)) / 255; // 0..1
    }
  }
}

// --- Visual elements ---
class Particle{
  constructor(){
    this.pos = createVector(random(width), random(height));
    this.prev = this.pos.copy();
    this.speed = random(0.6, 2.2);
    this.h = random(200,260); // base hue (blue-ish)
    this.sz = random(0.6, 1.8);
  }
  flowAngle(x,y){
    const nx = x*FLOW_SCALE, ny = y*FLOW_SCALE;
    // camera brightness gently pushes hue/angle
    const camBias = (camBrightness-0.5)*0.3;
    return noise(nx, ny, noiseT) * TWO_PI*2.0 + camBias;
  }
  update(){
    this.prev.set(this.pos);
    const a = this.flowAngle(this.pos.x, this.pos.y);
    this.pos.x += Math.cos(a)*this.speed;
    this.pos.y += Math.sin(a)*this.speed;

    // wrap
    if(this.pos.x<0) this.pos.x = width;
    if(this.pos.x>width) this.pos.x = 0;
    if(this.pos.y<0) this.pos.y = height;
    if(this.pos.y>height) this.pos.y = 0;

    // occasional respawn near center on big pulse
    if(pulse>1.0 && random()<0.02){
      const r = 20+random(40), ang=random(TWO_PI);
      this.pos.set(width/2 + Math.cos(ang)*r, height/2 + Math.sin(ang)*r);
      this.prev.set(this.pos);
    }
  }
  draw(){
    const hue = (this.h + 40*high) % 360;
    const alpha = 10 + 70*(0.3*low + 0.5*mid + 0.2*high);
    stroke(hue, 70, 80, constrain(alpha, 8, 90));
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);
  }
}

function drawAvatar(){
  push();
  translate(width/2, height/2);
  blendMode(ADD);
  noStroke();

  const baseHue = 220 + 40*high; // cool-to-warm with highs
  const baseR = min(width,height) * (0.16 + 0.06*low + 0.10*pulse);

  for(let i=6;i>=1;i--){
    const t = i/6;
    const r = baseR * (0.5 + t);
    const a = (6+i*10) * (0.7 + 0.6*mid + 0.4*pulse);
    fill((baseHue + i*4)%360, 80, 75, a);
    ellipse(0,0, r, r);
  }

  blendMode(BLEND);
  pop();
}

// --- Device enable (mic/cam) ---
async function enableMic(){
  try{
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    await audioCtx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    src.connect(analyser);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    document.getElementById('btnMic').textContent = '🎙 ON';
    window.bumpPulse(0.9);
  }catch(e){
    console.warn('Mic error', e);
    document.getElementById('btnMic').textContent = '🎙 取得不可';
  }
}

async function enableCam(){
  try{
    camEl = document.getElementById('camVideo');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width:320, height:240 }, audio:false });
    camEl.srcObject = stream;
    cam = createCapture(stream);
    cam.size(160,120);
    cam.hide(); // hidden, used only for brightness
    camReady = true;
    document.getElementById('btnCam').textContent = '📷 ON';
    window.bumpPulse(0.6);
  }catch(e){
    console.warn('Cam error', e);
    document.getElementById('btnCam').textContent = '📷 取得不可';
  }
}

// --- Chat panel visibility toggle ---
function keyPressed(){
  if(key==='h' || key==='H'){
    const panel = document.getElementById('chat-container');
    panel.style.display = (panel.style.display==='none') ? 'block' : 'none';
  }
}
