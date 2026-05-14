// src/ui.js
import { METRICS, state, applyChoice, resetState } from './state.js';
import { makeOracleLine } from './oracle.js';

let scenarios = [];
let principles = [];

export async function loadData(){
  scenarios = await (await fetch('./src/data/scenarios.json')).json();
  principles = await (await fetch('./src/data/principles.json')).json();
}

export function renderMetrics(){
  const container = document.getElementById('metrics');
  container.innerHTML = '';
  METRICS.forEach(m => {
    const val = state.metrics[m.key];
    const el = document.createElement('div');
    el.className = 'flex items-center justify-between bg-white/5 rounded-lg px-2 py-1';
    el.innerHTML = `
      <span class="metric-chip" title="${m.label}">
        <span class="dot" style="color:rgba(110,231,183,1)"></span>
        ${m.label}
      </span>
      <span class="tabular-nums">${(val*100).toFixed(0)}%</span>
    `;
    container.appendChild(el);
  });
}

export function renderScenario(){
  const s = scenarios[state.scenarioIndex];
  const titleEl = document.getElementById('scenario-title');
  const descEl = document.getElementById('scenario-desc');
  const aBtn = document.getElementById('choice-a');
  const bBtn = document.getElementById('choice-b');
  titleEl.textContent = s.title;
  descEl.textContent = s.desc;
  aBtn.textContent = 'A. ' + s.choices[0].label;
  aBtn.setAttribute('data-choice', '0');
  bBtn.textContent = 'B. ' + s.choices[1].label;
  bBtn.setAttribute('data-choice', '1');
  document.getElementById('oracle').textContent = makeOracleLine(null);
}

export function bindChoiceHandlers(onChosen){
  function handler(e){
    const idxStr = e.currentTarget.getAttribute('data-choice');
    if(idxStr == null) return;
    const s = scenarios[state.scenarioIndex];
    const choice = s.choices[Number(idxStr)];
    applyChoice(choice);
    document.getElementById('oracle').textContent = makeOracleLine(choice);
    onChosen();
  }
  document.getElementById('choice-a').addEventListener('click', handler);
  document.getElementById('choice-b').addEventListener('click', handler);

  // keyboard
  let focusIdx = 0;
  document.addEventListener('keydown', (ev) => {
    if(state.finished) return;
    if(ev.key === 'ArrowLeft'){ focusIdx = 0; document.getElementById('choice-a').focus(); }
    if(ev.key === 'ArrowRight'){ focusIdx = 1; document.getElementById('choice-b').focus(); }
    if(ev.key === 'Enter'){
      const btn = document.getElementById(focusIdx===0 ? 'choice-a' : 'choice-b');
      btn.click();
    }
  });
}

export function nextScenarioOrDebrief(){
  state.scenarioIndex++;
  if(state.scenarioIndex >= scenarios.length){
    state.finished = true;
    openDebrief();
  } else {
    renderScenario();
    renderMetrics();
  }
}

function polarToXY(cx, cy, r, a){
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function renderMandala(){
  const wrap = document.getElementById('mandala');
  wrap.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 600 600');

  // background circle
  const bg = document.createElementNS(svgNS, 'circle');
  bg.setAttribute('cx', 300); bg.setAttribute('cy', 300); bg.setAttribute('r', 260);
  bg.setAttribute('fill', 'rgba(255,255,255,0.02)');
  bg.setAttribute('stroke', 'rgba(255,255,255,0.08)');
  svg.appendChild(bg);

  // spokes + labels + dots
  METRICS.forEach((m, i) => {
    const angle = (i / METRICS.length) * Math.PI * 2 - Math.PI/2;
    const [x1,y1] = polarToXY(300, 300, 40, angle);
    const [x2,y2] = polarToXY(300, 300, 240, angle);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'rgba(255,255,255,0.12)');
    svg.appendChild(line);

    const value = state.metrics[m.key];
    const [vx, vy] = polarToXY(300, 300, 200 * value + 40, angle);
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', vx); dot.setAttribute('cy', vy);
    dot.setAttribute('r', 6);
    dot.setAttribute('fill', `rgba(110,231,183,0.9)`);
    svg.appendChild(dot);

    const [lx, ly] = polarToXY(300, 300, 260, angle);
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('fill', 'rgba(255,255,255,0.9)');
    label.setAttribute('font-size', '11');
    label.textContent = m.label;
    svg.appendChild(label);
  });

  wrap.appendChild(svg);
}

export function bindEthicsPanel(){
  const panel = document.getElementById('ethics-panel');
  document.getElementById('btn-ethics').addEventListener('click', () => {
    const cont = document.getElementById('ethics-content');
    cont.innerHTML = '';
    principles.forEach(group => {
      const el = document.createElement('div');
      el.className = 'bg-white/5 rounded-lg p-3';
      el.innerHTML = `<div class="font-semibold mb-1">${group.name}</div>` +
        group.items.map(it => `<div class="flex items-center justify-between mb-1">
          <div>${it.title}</div>
          <div class="text-xs text-white/60">${it.mapsTo.join(', ')}</div>
        </div>`).join('');
      cont.appendChild(el);
    });
    panel.classList.remove('hidden');
    panel.classList.add('flex');
  });
  document.getElementById('btn-ethics-close').addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
  });
}

function summarizeBias(){
  const sums = {};
  for(const h of state.history){
    for(const [k,v] of Object.entries(h.deltas)){
      sums[k] = (sums[k]||0) + v;
    }
  }
  const sorted = Object.entries(sums).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  return sorted.slice(0,3);
}

function emojiFor(k){
  const map = {
    privacy:'🔒', safety:'🛡️', fairness:'⚖️', transparency:'🔎', humanAgency:'🧠',
    sustainability:'♻️', wellbeing:'🌿', trust:'🤝', exploitation:'⛓️', loneliness:'💧'
  };
  return map[k] || '•';
}

export function openDebrief(){
  const panel = document.getElementById('debrief-panel');
  const box = document.getElementById('debrief');
  const biasTop = summarizeBias().map(([k,v])=>`${emojiFor(k)} ${k}: ${(v>0?'+':'')}${(v*100)|0}`);
  const turns = state.history.length;
  const outcome = Object.entries(state.metrics)
    .map(([k,v])=>`${emojiFor(k)} ${k} ${(v*100|0)}%`).join(' / ');
  box.innerHTML = `
    <p>あなたは <b>${turns}</b> 回の意思決定を行いました。</p>
    <p>指標の現在値：<br>${outcome}</p>
    <p>最も大きなシフト：<br>${biasTop.join(' / ')}</p>
    <p class="text-white/70">振り返り：どの価値を守り、どの価値を犠牲にしましたか？現実世界ではどのような補完策がありえますか？</p>
  `;
  panel.classList.remove('hidden');
  panel.classList.add('flex');
}

export function bindDebriefButtons(){
  document.getElementById('btn-debrief-close').addEventListener('click', ()=>{
    document.getElementById('debrief-panel').classList.add('hidden');
    document.getElementById('debrief-panel').classList.remove('flex');
  });
  document.getElementById('btn-restart').addEventListener('click', ()=>{
    resetState();
    document.getElementById('debrief-panel').classList.add('hidden');
    document.getElementById('debrief-panel').classList.remove('flex');
    renderScenario();
    renderMetrics();
    renderMandala();
  });
}

export function bindReset(){
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    resetState();
    renderScenario();
    renderMetrics();
    renderMandala();
    document.getElementById('oracle').textContent = '《神託》 静かな序章。— あなたの選択が社会を形作る。';
  });
}
