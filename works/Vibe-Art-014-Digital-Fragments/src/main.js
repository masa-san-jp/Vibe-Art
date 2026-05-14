import { generateText } from './generator/text.js';
import { drawMandala } from './generator/mandala.js';
import { particleDestruction } from './effects/destroy.js';
import { initAudio, setMuted, playAmbient, hitDestruction } from './audio/soundscape.js';
import { seedFromText } from './utils/rng.js';
import { extractKeywords, extractPalette } from './utils/residue.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#stageCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  prompt: $('#prompt'),
  btnCreate: $('#btnCreate'),
  btnDestroy: $('#btnDestroy'),
  btnRegen: $('#btnRegenerate'),
  btnMute: $('#btnMute'),
  btnInfo: $('#btnInfo'),
  btnExit: $('#btnExit'),
  story: $('#story'),
  info: $('#infoDialog'),
  timer: $('#timer'),
};

const State = { Idle: 'idle', Created: 'created', Destroying: 'destroying', After: 'after' };
let state = State.Idle;
let current = {
  text: '',
  seed: 0,
  palette: null,
  residue: null,
  timerId: null,
  startAt: 0,
  durationSec: 90, // デモ用の展示時間（任意で短め）
};

function setState(next) {
  state = next;
  ui.btnCreate.disabled = state !== State.Idle && state !== State.After;
  ui.btnDestroy.disabled = state !== State.Created;
  ui.btnRegen.disabled = state !== State.After;
}

function clearCanvas() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  // 背景を暗く塗る（微妙なグラデ）
  const g = ctx.createRadialGradient(canvas.width*0.7, canvas.height*0.3, 10, canvas.width*0.7, canvas.height*0.3, canvas.width);
  g.addColorStop(0, '#0e1420');
  g.addColorStop(1, '#070a10');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function typeToStory(text) {
  ui.story.innerHTML = '';
  const lines = text.split('\n');
  let i = 0;
  const step = () => {
    if (i >= lines.length) return;
    const p = document.createElement('p');
    p.className = 'line';
    p.textContent = lines[i];
    ui.story.appendChild(p);
    i++;
    setTimeout(step, 220);
  };
  step();
}

function startTimer(seconds) {
  current.startAt = Date.now();
  current.durationSec = seconds;
  if (current.timerId) clearInterval(current.timerId);
  current.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - current.startAt)/1000);
    const remain = Math.max(0, current.durationSec - elapsed);
    const m = String(Math.floor(remain/60)).padStart(2,'0');
    const s = String(remain%60).padStart(2,'0');
    ui.timer.textContent = `${m}:${s}`;
    if (remain <= 0 && state === State.Created) {
      // 自動的に破壊を促す（演出）
      ui.btnDestroy.classList.add('pulse');
    }
  }, 250);
}

async function onCreate() {
  await initAudio(); // 初回ユーザー操作時にAudioContextを有効化
  playAmbient();

  clearCanvas();
  const prompt = ui.prompt.value.trim();
  const seed = seedFromText(prompt || '輪廻 再生 無常 光');
  const text = generateText(prompt);
  typeToStory(text);

  // マンダラ描画とパレット取得
  const palette = drawMandala(ctx, { seed });

  setState(State.Created);
  current.text = text;
  current.seed = seed;
  current.palette = palette;
  ui.btnDestroy.classList.remove('pulse');
  startTimer(90);
}

function shatterStory() {
  const el = ui.story;
  const content = el.textContent || '';
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const ch of content) {
    const span = document.createElement('span');
    span.className = 'shard';
    span.textContent = ch;
    const dx = (Math.random()*2-1) * 80;
    const dy = (Math.random()*2-0) * 160;
    const rot = (Math.random()*2-1) * 40;
    span.style.setProperty('--dx', dx.toFixed(1)+'px');
    span.style.setProperty('--dy', dy.toFixed(1)+'px');
    span.style.setProperty('--rot', rot.toFixed(1)+'deg');
    span.style.animation = `fall ${0.8 + Math.random()*0.8}s forwards ease-in`;
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

async function onDestroy() {
  if (state !== State.Created) return;
  setState(State.Destroying);
  hitDestruction();
  shatterStory();

  // キーワード抽出
  const keywords = extractKeywords(current.text);

  // キャンバス破壊（粒子化）
  canvas.classList.add('glitch');
  const residueCanvas = await particleDestruction(canvas, { duration: 1800 });
  canvas.classList.remove('glitch');

  // 破壊残渣（色パレット）
  const palette = extractPalette(residueCanvas.getContext('2d').getImageData(0,0,residueCanvas.width,residueCanvas.height));
  current.residue = { keywords, palette };

  setState(State.After);
}

function onRegenerate() {
  if (state !== State.After) return;
  // 次サイクルの種を構築
  const hinted = (current.residue?.keywords || []).slice(0,4).join('、');
  ui.prompt.value = hinted || '光, 風, 輪, 余韻';

  // キャンバスを暗転→微かな光点
  clearCanvas();
  const cx = canvas.width/2, cy = canvas.height/2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = current.residue?.palette?.[0] || '#8f79f9';
  for (let i=0;i<60;i++) {
    ctx.beginPath();
    const r = 1 + i*1.2;
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.globalAlpha = 0.02;
    ctx.fill();
  }
  ctx.restore();

  setState(State.Idle);
}

function toggleMute() {
  const muted = ui.btnMute.dataset.muted === '1';
  setMuted(!muted);
  ui.btnMute.dataset.muted = muted ? '0' : '1';
  ui.btnMute.textContent = muted ? '🔈' : '🔇';
}

function initUI() {
  ui.btnCreate.addEventListener('click', onCreate);
  ui.btnDestroy.addEventListener('click', onDestroy);
  ui.btnRegen.addEventListener('click', onRegenerate);
  ui.btnMute.addEventListener('click', toggleMute);
  ui.btnInfo.addEventListener('click', () => ui.info.showModal());
  ui.btnExit.addEventListener('click', () => window.location.reload());
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.location.reload(); });
}

initUI();
clearCanvas();
ui.info.showModal();
