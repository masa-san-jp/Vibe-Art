import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import JSZip from 'jszip';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

let gvrmModuleLoadError = null;
let gvrmModulePromise;

async function ensureGvrmModule() {
  if (gvrmModulePromise) {
    return gvrmModulePromise;
  }
  gvrmModulePromise = import('gvrm-format/gvrm.js')
    .then((module) => module?.GVRM ?? null)
    .catch((error) => {
      gvrmModuleLoadError = error;
      console.warn('GVRM runtime failed to load. Falling back to standard VRM experience.', error);
      return null;
    });
  return gvrmModulePromise;
}

const overlayEl = document.querySelector('.overlay');
const animationButtonsEl = document.getElementById('animation-buttons');
const audioButtonsEl = document.getElementById('audio-buttons');
const paletteButtonsEl = document.getElementById('palette-buttons');
const metaTagEl = document.querySelector('.meta-tag');

const animationOptions = [
  { label: 'Swing Bloom', file: './assets/Swing%20Dancing-1.fbx' },
  { label: 'Soul Spin', file: './assets/Northern%20Soul%20Spin%20Combo.fbx' },
  { label: 'Calm Idle', file: './assets/Standing%20Idle.fbx' },
  { label: 'Future Talk', file: './assets/Talking.fbx' }
];

const audioOptions = [
  { label: 'Tokyo Driftwave', file: './assets/Tokyo%20Urban%20Haka%20No%20Ura.mp3', volume: 0.6 },
  { label: 'KMGY Glitch', file: './assets/KMGY%20.mp3', volume: 0.55 }
];

const paletteOptions = [
  {
    label: 'Aurora Bloom',
    colors: {
      auroraA: '#2077ff',
      auroraB: '#ff5bd1',
      glow: 1.0,
      halo: '#1e6bff',
      haloOpacity: 0.12,
      overlay: 'rgba(33, 136, 255, 0.24)',
      background: 'radial-gradient(circle at center, #0c1024 0%, #040614 42%, #010106 100%)',
      floorEmissive: '#0b1835',
      floorEmissiveIntensity: 0.6,
      key: '#4aa8ff',
      rim: '#ff4d9d',
      hemiSky: '#87b9ff',
      hemiGround: '#050505',
      fog: '#040712'
    }
  },
  {
    label: 'Crimson Pulse',
    colors: {
      auroraA: '#ff6a88',
      auroraB: '#ffc371',
      glow: 1.25,
      halo: '#ff945a',
      haloOpacity: 0.16,
      overlay: 'rgba(255, 118, 90, 0.24)',
      background: 'radial-gradient(circle at center, #1f0410 0%, #11000c 45%, #030005 100%)',
      floorEmissive: '#270d16',
      floorEmissiveIntensity: 0.75,
      key: '#ff9f6b',
      rim: '#ff3d7f',
      hemiSky: '#ffe1b5',
      hemiGround: '#22030a',
      fog: '#19050d'
    }
  },
  {
    label: 'Deep Tide',
    colors: {
      auroraA: '#2bd5c5',
      auroraB: '#3f7bff',
      glow: 0.92,
      halo: '#38c7c9',
      haloOpacity: 0.14,
      overlay: 'rgba(75, 180, 255, 0.2)',
      background: 'radial-gradient(circle at center, #021620 0%, #00101b 45%, #00050d 100%)',
      floorEmissive: '#061c24',
      floorEmissiveIntensity: 0.68,
      key: '#3fafff',
      rim: '#2fffd2',
      hemiSky: '#4dd0ff',
      hemiGround: '#021318',
      fog: '#021018'
    }
  }
];

const audioState = {
  listener: new THREE.AudioListener(),
  loader: new THREE.AudioLoader(),
  audio: null,
  buffers: new Map()
};

const buttonRegistry = {
  animation: [],
  audio: [],
  palette: []
};

let avatarCapabilities = {
  supportsFBX: false,
  mode: 'loading'
};

let currentAnimationIndex = 0;
let desiredAnimationIndex = 0;
let currentAudioIndex = 0;
let desiredAudioIndex = 0;
let currentPaletteIndex = 0;
let animationRequestId = 0;
let audioRequestId = 0;
let haloBaseOpacity = paletteOptions[0].colors.haloOpacity ?? 0.12;

function registerButtons(container, options, key, handler) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  const buttons = options.map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-button';
    button.textContent = option.label;
    button.setAttribute('data-index', String(index));
    button.addEventListener('click', () => handler(index));
    container.appendChild(button);
    return button;
  });
  buttonRegistry[key] = buttons;
}

function setActiveButton(key, index) {
  const buttons = buttonRegistry[key] ?? [];
  buttons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    }
  });
}

function updateAnimationButtonState() {
  const isEnabled = avatarCapabilities.supportsFBX;
  const buttons = buttonRegistry.animation ?? [];
  const reason =
    avatarCapabilities.mode === 'loading' ?
      'Avatar is loading – animations will unlock when ready.' :
      avatarCapabilities.mode === 'simple-vrm' ?
        'Fallback avatar loaded – animations are temporarily disabled.' :
        avatarCapabilities.mode === 'error' ?
          'Avatar failed to load animation data. Please reload to try again.' :
          '';
  buttons.forEach((button) => {
    button.disabled = !isEnabled;
    if (!isEnabled) {
      button.classList.add('is-disabled');
      button.title = reason;
    } else {
      button.classList.remove('is-disabled');
      button.title = '';
    }
  });
}

function updateMetaTag(message) {
  if (metaTagEl) {
    metaTagEl.textContent = message;
  }
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x040712, 0.12);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 120);
camera.position.set(0.4, 1.35, 3.6);
camera.add(audioState.listener);
audioState.audio = new THREE.Audio(audioState.listener);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 1.25;
controls.maxDistance = 6.0;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = (2.1 * Math.PI) / 3;
controls.target.set(0, 1.15, 0);

const fallbackGLTFLoader = new GLTFLoader();
fallbackGLTFLoader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));

const hemiLight = new THREE.HemisphereLight(0x87b9ff, 0x050505, 0.9);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0x4aa8ff, 1.35);
keyLight.position.set(2.2, 4.0, 1.4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xff4d9d, 0.8);
rimLight.position.set(-3.0, 2.0, -1.5);
scene.add(rimLight);

const floorGeo = new THREE.CircleGeometry(6, 64);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x070b1a,
  roughness: 0.85,
  metalness: 0.05,
  emissive: new THREE.Color(0x0b1835),
  emissiveIntensity: 0.6,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.01;
floor.receiveShadow = true;
scene.add(floor);

const haloGeometry = new THREE.RingGeometry(1.2, 3.6, 120, 1);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0x1e6bff,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
halo.rotation.x = -Math.PI / 2;
halo.position.y = 0.02;
scene.add(halo);

const auroraGroup = new THREE.Group();
scene.add(auroraGroup);

const POINT_COUNT = 1800;
const positions = new Float32Array(POINT_COUNT * 3);
const scales = new Float32Array(POINT_COUNT);
const startRadius = 1.4;

for (let i = 0; i < POINT_COUNT; i += 1) {
  const angle = Math.random() * Math.PI * 2.0;
  const radius = startRadius + Math.random() * 1.6;
  const height = 0.5 + Math.random() * 1.6;

  positions[i * 3 + 0] = Math.cos(angle) * radius;
  positions[i * 3 + 1] = height;
  positions[i * 3 + 2] = Math.sin(angle) * radius;

  scales[i] = 0.4 + Math.random() * 0.8;
}

const auroraGeometry = new THREE.BufferGeometry();
auroraGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
auroraGeometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

const auroraMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0.6 },
    uCursor: { value: new THREE.Vector2(0, 0) },
    uColorA: { value: new THREE.Color(paletteOptions[0].colors.auroraA) },
    uColorB: { value: new THREE.Color(paletteOptions[0].colors.auroraB) },
    uGlow: { value: paletteOptions[0].colors.glow }
  },
  vertexShader: /* glsl */`
    attribute float scale;
    uniform float uTime;
    uniform vec2 uCursor;
    varying float vStrength;
    varying vec3 vPos;

    void main() {
      vec3 p = position;
      float wave = sin(uTime * 0.6 + p.y * 1.4) * 0.12;
      float swirl = sin(uTime * 0.45 + p.x * 1.2 + p.z * 1.4) * 0.22;

      float cursorPull = smoothstep(2.8, 0.2, length(p.xz - uCursor * vec2(3.0, 3.0)));
      p.x += swirl + cursorPull * 0.36;
      p.z += wave * 0.85;
      p.y += sin(uTime * 0.35 + p.x * 1.5) * 0.18 * cursorPull;

      vStrength = scale + cursorPull * 1.1;
      vPos = p;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (18.0 * scale + cursorPull * 12.0) * (150.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uIntensity;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uGlow;
    varying float vStrength;
    varying vec3 vPos;

    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float falloff = 1.0 - dot(uv, uv);
      if (falloff <= 0.0) discard;

      float soft = pow(falloff, 2.4);
      float gradient = smoothstep(0.8, 2.8, vPos.y);
      vec3 tone = mix(uColorA, uColorB, gradient);
      vec3 color = tone * (soft * (0.3 + vStrength * 0.7) * uGlow);
      color *= uIntensity;

      gl_FragColor = vec4(color, soft * uIntensity);
    }
  `
});

const auroraPoints = new THREE.Points(auroraGeometry, auroraMaterial);
auroraGroup.add(auroraPoints);

function applyPalette(index) {
  const palette = paletteOptions[index]?.colors ?? paletteOptions[0].colors;
  auroraMaterial.uniforms.uColorA.value.set(palette.auroraA);
  auroraMaterial.uniforms.uColorB.value.set(palette.auroraB);
  auroraMaterial.uniforms.uGlow.value = palette.glow ?? 1.0;
  haloMaterial.color.set(palette.halo);
  haloBaseOpacity = palette.haloOpacity ?? 0.12;
  haloMaterial.opacity = haloBaseOpacity;
  floorMat.emissive.set(palette.floorEmissive);
  floorMat.emissiveIntensity = palette.floorEmissiveIntensity ?? 0.6;
  keyLight.color.set(palette.key);
  keyLight.intensity = palette.keyIntensity ?? 1.35;
  rimLight.color.set(palette.rim);
  rimLight.intensity = palette.rimIntensity ?? 0.8;
  hemiLight.color.set(palette.hemiSky);
  hemiLight.groundColor.set(palette.hemiGround);
  scene.fog.color.set(palette.fog);
  renderer.setClearColor(palette.fog, 1);
  document.body.style.background = palette.background;
  overlayEl.style.background =
    `radial-gradient(circle at var(--cursor-x, 50%) var(--cursor-y, 50%), ${palette.overlay}, transparent 45%)`;
  currentPaletteIndex = index;
}

applyPalette(currentPaletteIndex);

const cursor = new THREE.Vector2(0, 0);
let cursorLerp = new THREE.Vector2(0, 0);
let cursorMagnitude = 0;
let timeAccumulator = 0;
let audioAnalyser = null;
const simplex = new SimplexNoise();

async function switchAnimation(index) {
  desiredAnimationIndex = index;
  setActiveButton('animation', index);
  if (!avatarCapabilities.supportsFBX) {
    return;
  }
  if (!gvrmInstance || !gvrmInstance.isReady) {
    return;
  }
  const option = animationOptions[index];
  const requestId = ++animationRequestId;
  try {
    await gvrmInstance.changeFBX(option.file);
    if (requestId === animationRequestId) {
      currentAnimationIndex = index;
    }
  } catch (error) {
    console.warn('Animation load failed:', option.file, error);
  }
}

function loadAudioBuffer(url) {
  if (audioState.buffers.has(url)) {
    return audioState.buffers.get(url);
  }
  const bufferPromise = new Promise((resolve, reject) => {
    audioState.loader.load(url, resolve, undefined, reject);
  }).then((buffer) => {
    audioState.buffers.set(url, Promise.resolve(buffer));
    return buffer;
  });
  audioState.buffers.set(url, bufferPromise);
  return bufferPromise;
}

async function switchAudio(index) {
  desiredAudioIndex = index;
  setActiveButton('audio', index);
  const option = audioOptions[index];
  const requestId = ++audioRequestId;
  try {
    const buffer = await loadAudioBuffer(option.file);
    if (requestId !== audioRequestId) {
      return;
    }
    if (!audioState.audio) {
      return;
    }
    if (audioState.audio.isPlaying) {
      audioState.audio.stop();
    }
    audioState.audio.setBuffer(buffer);
    audioState.audio.setLoop(true);
    audioState.audio.setVolume(option.volume ?? 0.6);
    await audioState.listener.context.resume();
    audioState.audio.play();
    audioAnalyser = new THREE.AudioAnalyser(audioState.audio, 64);
    currentAudioIndex = index;
  } catch (error) {
    console.warn('Audio load failed:', option.file, error);
  }
}

function handleAnimationSelect(index) {
  switchAnimation(index);
}

function handleAudioSelect(index) {
  switchAudio(index);
}

function handlePaletteSelect(index) {
  setActiveButton('palette', index);
  applyPalette(index);
}

registerButtons(animationButtonsEl, animationOptions, 'animation', handleAnimationSelect);
registerButtons(audioButtonsEl, audioOptions, 'audio', handleAudioSelect);
registerButtons(paletteButtonsEl, paletteOptions, 'palette', handlePaletteSelect);
setActiveButton('animation', desiredAnimationIndex);
setActiveButton('audio', desiredAudioIndex);
setActiveButton('palette', currentPaletteIndex);
updateAnimationButtonState();
updateMetaTag('Simulacra Interface — Loading Avatar');

function updateOverlay(x, y, pulse) {
  overlayEl.style.setProperty('--cursor-x', `${(x * 0.5 + 0.5) * 100}%`);
  overlayEl.style.setProperty('--cursor-y', `${(y * -0.5 + 0.5) * 100}%`);
  overlayEl.style.opacity = (0.6 + pulse * 0.4).toFixed(3);
}

window.addEventListener('pointermove', (event) => {
  const nx = (event.clientX / window.innerWidth) * 2 - 1;
  const ny = (event.clientY / window.innerHeight) * 2 - 1;
  cursor.set(nx, ny);
});

window.addEventListener('resize', () => {
  const { innerWidth: w, innerHeight: h } = window;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

class SimpleVRMWrapper extends THREE.Group {
  constructor(vrm) {
    super();
    this.vrm = vrm;
    this.isReady = true;
    this.supportsFBX = false;
    this.mode = 'simple-vrm';
    this.mixer = null;
    this.add(vrm.scene);
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  update(delta = 0) {
    if (this.vrm) {
      this.vrm.update(delta);
    }
  }

  async changeFBX() {
    console.warn('FBX animation playback is not available in fallback VRM mode.');
  }
}

async function loadSimpleVRMFromGvrm(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to retrieve fallback VRM from ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const vrmFile = zip.file('model.vrm');
  if (!vrmFile) {
    throw new Error('model.vrm was not found inside the GVRM archive.');
  }
  const vrmBuffer = await vrmFile.async('arraybuffer');
  const vrmBlob = new Blob([vrmBuffer], { type: 'application/octet-stream' });
  const vrmUrl = URL.createObjectURL(vrmBlob);

  try {
    const gltf = await fallbackGLTFLoader.loadAsync(vrmUrl);
    const vrm = gltf?.userData?.vrm;
    if (!vrm) {
      throw new Error('VRM payload missing from fallback data.');
    }
    const wrapper = new SimpleVRMWrapper(vrm);
    scene.add(wrapper);
    wrapper.position.set(0, 0, 0);
    wrapper.scale.setScalar(1.0);
    return wrapper;
  } finally {
    URL.revokeObjectURL(vrmUrl);
  }
}

async function loadGvrmAvatar() {
  const candidates = [
    './assets/20251101-Masa.gvrm'
  ];
  let lastError;
  const GVRMClass = await ensureGvrmModule();
  for (const candidate of candidates) {
    if (GVRMClass) {
      try {
        const gvrm = await GVRMClass.load(candidate, scene, camera, renderer);
        gvrm.position.set(0, 0, 0);
        gvrm.scale.setScalar(1.0);
        gvrm.supportsFBX = true;
        gvrm.mode = 'gvrm';
        avatarCapabilities = { supportsFBX: true, mode: 'gvrm' };
        updateAnimationButtonState();
        updateMetaTag('Simulacra Interface — Gaussian VRM Mode');
        return gvrm;
      } catch (error) {
        console.warn('Failed to load GVRM candidate', candidate, error);
        lastError = error;
      }
    }

    try {
      const fallback = await loadSimpleVRMFromGvrm(candidate);
      avatarCapabilities = { supportsFBX: false, mode: 'simple-vrm' };
      updateAnimationButtonState();
      updateMetaTag('Simulacra Interface — Standard VRM Mode');
      console.info('Loaded fallback VRM avatar without Gaussian splatting:', candidate);
      return fallback;
    } catch (fallbackError) {
      console.warn('Fallback VRM load failed for candidate', candidate, fallbackError);
      lastError = fallbackError;
    }
  }

  if (!GVRMClass && gvrmModuleLoadError && !lastError) {
    lastError = gvrmModuleLoadError;
  }

  throw lastError ?? new Error('Unable to load any avatar assets.');
}

async function setupAudio() {
  if (!audioState.listener.parent) {
    camera.add(audioState.listener);
  }
  if (!audioState.audio) {
    audioState.audio = new THREE.Audio(audioState.listener);
  }
  await switchAudio(desiredAudioIndex);
}

let gvrmInstance;

function animate() {
  const delta = clock.getDelta();
  timeAccumulator += delta;

  cursorLerp.lerp(cursor, 0.08);
  cursorMagnitude = THREE.MathUtils.lerp(cursorMagnitude, cursor.length(), 0.05);

  const pulse =
    audioAnalyser ?
      THREE.MathUtils.clamp(audioAnalyser.getAverageFrequency() / 128, 0.2, 1.8) :
      0.4 + Math.sin(timeAccumulator * 1.2) * 0.2;

  const drift = simplex.noise2D(timeAccumulator * 0.08, cursorLerp.x * 2.2) * 0.4;

  auroraGroup.rotation.y = drift * 0.3;
  auroraGroup.position.y = 0.2 + drift * 0.18;
  auroraMaterial.uniforms.uCursor.value.copy(cursorLerp);
  auroraMaterial.uniforms.uTime.value = timeAccumulator;
  auroraMaterial.uniforms.uIntensity.value = 0.45 + pulse * 0.4;

  halo.rotation.z += delta * 0.12;
  halo.material.opacity = THREE.MathUtils.clamp(haloBaseOpacity * (0.7 + pulse * 0.6), 0.02, 0.6);

  if (gvrmInstance && typeof gvrmInstance.update === 'function') {
    gvrmInstance.update(delta);

    const sway = Math.sin(timeAccumulator * 0.6) * 0.12;
    if (gvrmInstance.rotation) {
      gvrmInstance.rotation.y = sway + cursorLerp.x * 0.25;
    }
  }

  controls.update();
  updateOverlay(cursorLerp.x, cursorLerp.y, pulse * 0.6 + cursorMagnitude * 0.3);
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();

async function init() {
  try {
    await setupAudio();
  } catch (error) {
    console.warn('Audio setup failed:', error);
  }

  try {
    gvrmInstance = await loadGvrmAvatar();
    await switchAnimation(desiredAnimationIndex);
  } catch (error) {
    console.error(error);
    avatarCapabilities = { supportsFBX: false, mode: 'error' };
    updateAnimationButtonState();
    updateMetaTag('Simulacra Interface — Avatar Unavailable');
  }

  renderer.setAnimationLoop(animate);
}

document.addEventListener('pointerdown', async () => {
  try {
    await audioState.listener.context.resume();
    if (audioState.audio && !audioState.audio.isPlaying && audioState.audio.buffer) {
      audioState.audio.play();
    }
  } catch (error) {
    console.warn('Audio unlock failed:', error);
  }
}, { once: true });

// Lightweight simplex noise for aurora motion modulation
function SimplexNoise(seed = Math.random()) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  let n;
  let q;
  for (let i = 255; i > 0; i--) {
    n = Math.floor((seed * 1e4 + i) % (i + 1));
    q = p[i];
    p[i] = p[n];
    p[n] = q;
  }
  this.perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    this.perm[i] = p[i & 255];
  }
}

SimplexNoise.prototype.noise2D = function (x, y) {
  const perm = this.perm;
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  let s = (x + y) * F2;
  let i = Math.floor(x + s);
  let j = Math.floor(y + s);

  let t = (i + j) * G2;
  let X0 = i - t;
  let Y0 = j - t;
  let x0 = x - X0;
  let y0 = y - Y0;

  let i1, j1;
  if (x0 > y0) {
    i1 = 1; j1 = 0;
  } else {
    i1 = 0; j1 = 1;
  }

  let x1 = x0 - i1 + G2;
  let y1 = y0 - j1 + G2;
  let x2 = x0 - 1 + 2 * G2;
  let y2 = y0 - 1 + 2 * G2;

  let ii = i & 255;
  let jj = j & 255;
  let gi0 = perm[ii + perm[jj]] % 12;
  let gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
  let gi2 = perm[ii + 1 + perm[jj + 1]] % 12;

  const grad3 = [
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ];

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  let n0;
  if (t0 < 0) {
    n0 = 0;
  } else {
    t0 *= t0;
    n0 = t0 * t0 * (grad3[gi0 * 3] * x0 + grad3[gi0 * 3 + 1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  let n1;
  if (t1 < 0) {
    n1 = 0;
  } else {
    t1 *= t1;
    n1 = t1 * t1 * (grad3[gi1 * 3] * x1 + grad3[gi1 * 3 + 1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  let n2;
  if (t2 < 0) {
    n2 = 0;
  } else {
    t2 *= t2;
    n2 = t2 * t2 * (grad3[gi2 * 3] * x2 + grad3[gi2 * 3 + 1] * y2);
  }

  return 70 * (n0 + n1 + n2);
};

init();
