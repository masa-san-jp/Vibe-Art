// src/app.js
import { setSceneBackground, lerpColor } from './components/utils.js';
import './components/draggable.js';

// --- Avatar library (URLs via jsDelivr Khronos Sample Models) ---
const AVATARS = [
  { id: 'human',    name: 'Human',            asset: '#avCesiumMan', speed: 1.0, canLift: false, tint: '#ffffff' },
  { id: 'robot',    name: 'Robot',            asset: '#avRobot',     speed: 1.2, canLift: true,  tint: '#cfe6ff' },
  { id: 'creature', name: 'Creature (Fox)',   asset: '#avFox',       speed: 1.3, canLift: false, tint: '#ffd8a8' },
  // Primitive "Divine Light" (glow-ish figure)
  { id: 'divine',   name: 'Divine Light',     primitive: true,       speed: 1.1, canLift: true,  tint: '#e8f3ff' },
  // Simulated Elder: reuse human with slower speed and gray tint
  { id: 'elder',    name: 'Elder (sim)',      asset: '#avCesiumMan', speed: 0.6, canLift: false, tint: '#bfbfbf' }
];

const state = {
  current: AVATARS[0].id,
  thirdPerson: false,
  emotion: 'calm'
};

function $(sel) { return document.querySelector(sel); }

function setupConsent() {
  const modal = $('#consent');
  const check = $('#consentCheck');
  const start = $('#startBtn');
  check.addEventListener('change', () => { start.disabled = !check.checked; });
  start.addEventListener('click', () => { modal.style.display = 'none'; });
  $('#exitBtn').addEventListener('click', () => { window.location.reload(); });
}

function buildAvatarButtons() {
  const wrap = $('#avatarButtons');
  wrap.innerHTML = '';
  AVATARS.forEach((av, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (i === 0 ? ' btn--active' : '');
    btn.textContent = `${i+1}. ${av.name}`;
    btn.dataset.avatar = av.id;
    btn.addEventListener('click', () => selectAvatar(av.id));
    wrap.appendChild(btn);
  });
}

function updateActiveButtons() {
  document.querySelectorAll('#avatarButtons .btn').forEach(b => {
    b.classList.toggle('btn--active', b.dataset.avatar === state.current);
  });
}

function setupEmotionButtons() {
  document.querySelectorAll('[data-emotion]').forEach(btn => {
    btn.addEventListener('click', () => setEmotion(btn.dataset.emotion));
  });
}

function setEmotion(key) {
  state.emotion = key;
  let bgFrom = '#111', bgTo = '#111';
  let emissive = '#000000';

  switch(key) {
    case 'calm':
      bgTo = '#0d1b2a'; emissive = '#22303a'; break;
    case 'joy':
      bgTo = '#1a1b0b'; emissive = '#402000'; break;
    case 'anger':
      bgTo = '#220a0a'; emissive = '#440000'; break;
  }
  // Animate background a bit
  let t = 0;
  const anim = setInterval(() => {
    t += 0.08;
    setSceneBackground(lerpColor(bgFrom, bgTo, Math.min(1, t)));
    if (t >= 1) clearInterval(anim);
  }, 16);

  // Apply emissive tint to avatar materials if exists
  const avatarRoot = $('#avatar');
  avatarRoot.object3D.traverse(n => {
    if (n.isMesh && n.material && n.material.emissive) {
      n.material.emissive.set(emissive);
      n.material.needsUpdate = true;
    }
  });
}

function buildSpeedTrack() {
  const track = $('#track');
  const step = 2;
  for (let i=0;i<12;i++){
    const line = document.createElement('a-box');
    line.setAttribute('color', '#2f2f2f');
    line.setAttribute('width', '0.1');
    line.setAttribute('height', '0.02');
    line.setAttribute('depth', '3');
    line.setAttribute('position', `${i*step} 0.01 0`);
    track.appendChild(line);
  }
  const label = document.createElement('a-text');
  label.setAttribute('value', 'Speed Track');
  label.setAttribute('color', '#ddd');
  label.setAttribute('position', '-0.5 1.2 0');
  label.setAttribute('width', '6');
  track.appendChild(label);
}

function attachDraggableToBox() {
  const box = $('#heavyBox');
  if (!box) return;
  if (!box.components['draggable']) box.setAttribute('draggable', 'enabled: false');
}

function setThirdPerson(enabled) {
  state.thirdPerson = enabled;
  const cam = $('#cam');
  if (enabled) {
    cam.setAttribute('look-controls', 'enabled: false');
    cam.setAttribute('position', {x:0, y:2.0, z:4.2});
    const tick = () => {
      if (!state.thirdPerson) return;
      cam.object3D.lookAt($('#avatar').object3D.position);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    cam.setAttribute('position', {x:0, y:1.6, z:0});
    cam.setAttribute('rotation', {x:0,y:0,z:0});
    cam.setAttribute('look-controls', 'enabled: true');
  }
  $('#viewToggle').textContent = enabled ? '1st Person' : '3rd Person';
}

function setupViewToggle() {
  $('#viewToggle').addEventListener('click', () => setThirdPerson(!state.thirdPerson));
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'v') setThirdPerson(!state.thirdPerson);
  });
}

function createDivinePrimitive(root, tint='#e8f3ff') {
  // Capsule風シルエット：シリンダ＋上下スフィア
  const cyl = document.createElement('a-cylinder');
  cyl.setAttribute('radius', '0.38');
  cyl.setAttribute('height', '1.2');
  cyl.setAttribute('position', '0 0.9 0');
  cyl.setAttribute('material', `color: ${tint}; metalness: 0.2; roughness: 0.2; emissive: #223; emissiveIntensity: 0.2`);
  root.appendChild(cyl);

  const top = document.createElement('a-sphere');
  top.setAttribute('radius', '0.38');
  top.setAttribute('position', '0 1.6 0');
  top.setAttribute('material', `color: ${tint}; metalness: 0.2; roughness: 0.2; emissive: #223; emissiveIntensity: 0.2`);
  root.appendChild(top);

  const bot = document.createElement('a-sphere');
  bot.setAttribute('radius', '0.38');
  bot.setAttribute('position', '0 0.35 0');
  bot.setAttribute('material', `color: ${tint}; metalness: 0.2; roughness: 0.2; emissive: #223; emissiveIntensity: 0.2`);
  root.appendChild(bot);
}

function selectAvatar(id) {
  const avatar = AVATARS.find(a => a.id === id) || AVATARS[0];
  state.current = avatar.id;
  updateActiveButtons();

  const rig = $('#rig');
  const avatarRoot = $('#avatar');
  const box = $('#heavyBox');

  // Clear previous model children
  while (avatarRoot.firstChild) avatarRoot.removeChild(avatarRoot.firstChild);

  if (avatar.primitive) {
    createDivinePrimitive(avatarRoot, avatar.tint || '#ffffff');
  } else if (avatar.asset) {
    const e = document.createElement('a-entity');
    e.setAttribute('gltf-model', avatar.asset);
    e.setAttribute('position', '0 0 0');
    e.addEventListener('model-loaded', () => {
      e.object3D.traverse(n => {
        if (n.isMesh && n.material) {
          if ('color' in n.material && avatar.tint) {
            const c = new THREE.Color(n.material.color);
            const t = new THREE.Color(avatar.tint);
            c.multiply(t);
            n.material.color.copy(c);
          }
          if ('metalness' in n.material) n.material.metalness = 0.2;
          if ('roughness' in n.material) n.material.roughness = 0.8;
          n.material.needsUpdate = true;
        }
      });
    });
    avatarRoot.appendChild(e);
  }

  // WASD acceleration per avatar (base ~40)
  const accel = Math.round(40 * (avatar.speed || 1.0));
  rig.setAttribute('wasd-controls', `acceleration: ${accel}`);

  // Strength: toggle draggable
  if (box) {
    box.setAttribute('draggable', `enabled: ${!!avatar.canLift}`);
    box.setAttribute('color', avatar.canLift ? '#a57447' : '#7b4a2e');
  }
}

function setupKeybinds() {
  window.addEventListener('keydown', (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= AVATARS.length) {
      selectAvatar(AVATARS[n-1].id);
    }
  });
}

function keepAvatarAtFeet() {
  // Ensure avatar root follows rig at ground (y=0)
  const rig = $('#rig');
  const avatarRoot = $('#avatar');
  const tick = () => {
    const rpos = rig.object3D.position;
    avatarRoot.object3D.position.set(rpos.x, 0, rpos.z);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function main() {
  setupConsent();
  buildAvatarButtons();
  setupEmotionButtons();
  setupViewToggle();
  setupKeybinds();
  buildSpeedTrack();
  attachDraggableToBox();
  keepAvatarAtFeet();
  selectAvatar(state.current);
  setEmotion('calm');
}

window.addEventListener('DOMContentLoaded', main);