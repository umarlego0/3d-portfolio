/**
 * ==========================================================================
 * HANDCRAFTED ULTRA LOW-POLY 3D WORKSHOP DIORAMA & SCRAPBOOK PORTFOLIO
 * Clean, faceted, single-color flat-shaded meshes per component.
 * ==========================================================================
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- ASSET OVERRIDE SLOT ---
// If you place a custom 3D character model in './assets/mascot.glb', specify it below.
// If left blank or if loading fails, it falls back seamlessly to the procedural low-poly mascot.
const CUSTOM_MASCOT_MODEL_PATH = ""; 

// --- GLOBAL STATE ---
let cvData = null;
let scene, camera, renderer;
let clock;
let raycaster, mousePointer, clientMouse;
let isMobile = false;

// Audio System
let audioCtx = null;
let soundEnabled = true;

// Diorama Objects & Interactive Elements
const interactiveObjects = [];
let hoveredObject = null;
let hangingPennants = [];
let hangingButtons = [];
let hangingPolaroids = [];
let craftTotems = [];

// Mascot & Player Control State
let mascotGroup = null;
let mascotLimbs = {
  head: null,
  body: null,
  armLeft: null,
  armRight: null,
  legLeft: null,
  legRight: null,
  scarf: null
};
let isCustomModelLoaded = false;

// Stage Mode: 'play' (playable platformer) vs 'tour' (guided scroll camera)
let currentMode = 'play'; 
let currentWaypointIndex = 0;
let targetCameraPos = new THREE.Vector3(0, 0, 14.5);
let targetCameraLookAt = new THREE.Vector3(0, -0.5, 0);

// Platformer Physics State
const playerPhysics = {
  x: -6.5,
  y: -3.3,
  z: 0.8,
  vx: 0,
  vy: 0,
  speed: 6.2,
  jumpForce: 10.5,
  gravity: -24.0,
  isGrounded: true,
  facing: 1, // 1: right, -1: left
  boundsX: [-11.8, 11.8],
  groundY: -3.3,
  platforms: [
    { x: -6.5, y: -3.3, w: 26, h: 0.5 }, // Main cardboard runway
    { x: -1.8, y: -2.3, w: 2.2, h: 0.6 }, // Green sponge platform
    { x: 1.2, y: -1.4, w: 2.4, h: 0.6 },  // Cyan sponge platform
    { x: 0.0, y: -0.2, w: 5.6, h: 0.5 }   // Center wooden shelf
  ]
};

// Input Keys
const keysPressed = {
  left: false,
  right: false,
  jump: false,
  interact: false
};

// Tour Mode Waypoints
const tourWaypoints = [
  { name: 'intro', pos: new THREE.Vector3(0, 0, 14.5), look: new THREE.Vector3(0, -0.5, 0) },
  { name: 'about', pos: new THREE.Vector3(-6.2, 0.2, 8.8), look: new THREE.Vector3(-6.5, 0, 0) },
  { name: 'skills', pos: new THREE.Vector3(0.0, 0.4, 8.2), look: new THREE.Vector3(0.0, 0.2, 0) },
  { name: 'experience', pos: new THREE.Vector3(0.0, 2.4, 9.5), look: new THREE.Vector3(0.0, 2.0, 0) },
  { name: 'projects', pos: new THREE.Vector3(6.5, 0.4, 9.2), look: new THREE.Vector3(6.8, 0, 0) },
  { name: 'contact', pos: new THREE.Vector3(7.5, -2.0, 7.8), look: new THREE.Vector3(8.0, -2.5, 0) }
];


// ==========================================================================
// 1. SINGLE-COLOR FLAT-SHADED MATERIALS (NO CANVAS TEXTURES / BUMP MAPS)
// ==========================================================================

const materials = {};

function createFlatMaterial(colorHex, metalness = 0.05, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    flatShading: true,
    roughness: roughness,
    metalness: metalness
  });
}

function setupMaterials() {
  // Cardboard & Wood tones
  materials.kraftCardboard = createFlatMaterial(0xC89D6C);
  materials.kraftDark = createFlatMaterial(0xA57C4C);
  materials.fluteInner = createFlatMaterial(0x755029);
  materials.pineWood = createFlatMaterial(0xDFB47B);
  materials.corkTan = createFlatMaterial(0xD4A470);
  materials.twineRope = createFlatMaterial(0xB58752);

  // Fabrics & Accents
  materials.burlap = createFlatMaterial(0xB5946B);
  materials.denim = createFlatMaterial(0x3B5978);
  materials.whitePaper = createFlatMaterial(0xFFFDF8, 0.02, 0.9);
  materials.tapeCream = createFlatMaterial(0xFAF4DF, 0.02, 0.9);

  // Colorful Felts & Buttons
  materials.feltCyan = createFlatMaterial(0x4EA8DE);
  materials.feltGreen = createFlatMaterial(0x5CB85C);
  materials.feltAmber = createFlatMaterial(0xF0AD4E);
  materials.feltCrimson = createFlatMaterial(0xD9534F);
  materials.feltYellow = createFlatMaterial(0xF5D36B);
  materials.feltPurple = createFlatMaterial(0x815CA8);

  // Hardware & Inks
  materials.metalScrew = createFlatMaterial(0xB0B8C2, 0.85, 0.35);
  materials.inkDark = createFlatMaterial(0x2B1E16);
  materials.photoDark = createFlatMaterial(0x2A3644);
}


// ==========================================================================
// 2. PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
// ==========================================================================

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTapSound(pitch = 320) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
  } catch (e) {}
}

function playJumpSound() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(580, audioCtx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.23);
  } catch (e) {}
}

function playBoingSound() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(480, audioCtx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(320, audioCtx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.26);
  } catch (e) {}
}

function playPaperSound() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const bufferSize = audioCtx.sampleRate * 0.18;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.5, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    whiteNoise.start();
  } catch (e) {}
}

function playFanfareSound() {
  if (!soundEnabled || !audioCtx) return;
  const notes = [330, 440, 554, 659];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.32);
      } catch (e) {}
    }, idx * 75);
  });
}


// ==========================================================================
// 3. THREE.JS SCENE SETUP & LIGHTING
// ==========================================================================

function initThreeScene() {
  const container = document.getElementById('canvas-container');
  isMobile = window.innerWidth <= 768;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF4E6C8); // Warm cream parchment
  scene.fog = new THREE.FogExp2(0xF4E6C8, 0.024);

  // Camera
  camera = new THREE.PerspectiveCamera(
    isMobile ? 55 : 45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 14.5);

  // Clock
  clock = new THREE.Clock();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // Raycaster & Mouse
  raycaster = new THREE.Raycaster();
  mousePointer = new THREE.Vector2(-999, -999);
  clientMouse = { x: 0, y: 0 };

  // Setup Flat Materials
  setupMaterials();

  // Lighting for Flat-Shaded Low-Poly Primitives
  setupLighting();

  // Build Ultra Low-Poly Craft Stage
  buildCraftStage();

  // Build Low-Poly Mascot
  buildMascot();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onCanvasClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('scroll', onScrollTrack);

  setupTouchControls();
}

function setupLighting() {
  // Hemisphere light to make flat facets pop cleanly
  const hemiLight = new THREE.HemisphereLight(0xFFF8EB, 0xD8C4A0, 1.15);
  scene.add(hemiLight);

  // Key directional light with soft shadows
  const keyLight = new THREE.DirectionalLight(0xFFF2DC, 1.35);
  keyLight.position.set(6, 12, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -14;
  keyLight.shadow.camera.right = 14;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Left warm rim light for faceted edges
  const rimLightLeft = new THREE.DirectionalLight(0xFFA868, 0.55);
  rimLightLeft.position.set(-12, 6, 4);
  scene.add(rimLightLeft);

  // Right cool fill light
  const fillLightRight = new THREE.DirectionalLight(0x88C0E8, 0.45);
  fillLightRight.position.set(12, 4, 6);
  scene.add(fillLightRight);
}


// ==========================================================================
// 4. ULTRA LOW-POLY CRAFT STAGE & 5 INTERACTIVE ZONES
// ==========================================================================

function buildCraftStage() {
  // A. Backing Craft Wall
  const backGeo = new THREE.PlaneGeometry(36, 20);
  const backMat = createFlatMaterial(0xF4E6C8);
  const backWall = new THREE.Mesh(backGeo, backMat);
  backWall.position.set(0, 0, -2.5);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // B. FOREGROUND CARDBOARD RUNWAY (Low-Poly Multi-Layer Floor)
  buildCardboardRunway();

  // C. ZONE 1: LEFT INTRO BOARD (About & Education Sign)
  buildZone1Intro();

  // D. ZONE 2: CENTER WOODEN SHELF & CORKBOARD (Skills & Level Select)
  buildZone2Skills();

  // E. ZONE 3: UPPER HANGING TWINE & PENNANTS + EXPERIENCE GATE
  buildZone3Experience();

  // F. ZONE 4: RIGHT HANGING POLAROIDS & STARBURST PRIZE (Projects Gallery)
  buildZone4Projects();

  // G. ZONE 5: BOTTOM-RIGHT MAILBOX & CONTACT
  buildZone5Contact();
}

/**
 * Foreground low-poly corrugated cardboard floor with physical faceted flutes
 */
function buildCardboardRunway() {
  const floorGroup = new THREE.Group();

  // Top Walking Slab
  const topSlabGeo = new THREE.BoxGeometry(26, 0.5, 4.5, 1, 1, 1);
  const topSlab = new THREE.Mesh(topSlabGeo, materials.kraftCardboard);
  topSlab.position.set(0, -3.85, 0.8);
  topSlab.receiveShadow = true;
  topSlab.castShadow = true;
  floorGroup.add(topSlab);

  // Inner Corrugated Fluting Layer (Faceted dark kraft channel)
  const innerFluteGeo = new THREE.BoxGeometry(26, 0.35, 4.3, 1, 1, 1);
  const innerFlute = new THREE.Mesh(innerFluteGeo, materials.fluteInner);
  innerFlute.position.set(0, -4.27, 0.7);
  floorGroup.add(innerFlute);

  // Low-poly faceted teeth along front edge to represent corrugated wavy fluting physically
  const fluteTeethCount = 42;
  const toothWidth = 26 / fluteTeethCount;
  for (let i = 0; i < fluteTeethCount; i++) {
    const toothGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 6);
    const tooth = new THREE.Mesh(toothGeo, materials.kraftDark);
    tooth.position.set(-13 + i * toothWidth + toothWidth / 2, -4.27, 2.95);
    floorGroup.add(tooth);
  }

  // Bottom Base Liner Slab
  const botSlabGeo = new THREE.BoxGeometry(26, 0.35, 4.5, 1, 1, 1);
  const botSlab = new THREE.Mesh(botSlabGeo, materials.kraftCardboard);
  botSlab.position.set(0, -4.62, 0.8);
  botSlab.receiveShadow = true;
  floorGroup.add(botSlab);

  // Stacked Foam Sponge Platform 1 (Lime Green)
  const sponge1Geo = new THREE.BoxGeometry(2.2, 0.6, 2.0, 1, 1, 1);
  const sponge1 = new THREE.Mesh(sponge1Geo, materials.feltGreen);
  sponge1.position.set(-1.8, -2.6, 0.8);
  sponge1.castShadow = true;
  sponge1.receiveShadow = true;
  floorGroup.add(sponge1);

  // Stacked Foam Sponge Platform 2 (Cyan)
  const sponge2Geo = new THREE.BoxGeometry(2.4, 0.6, 2.0, 1, 1, 1);
  const sponge2 = new THREE.Mesh(sponge2Geo, materials.feltCyan);
  sponge2.position.set(1.2, -1.7, 0.8);
  sponge2.castShadow = true;
  sponge2.receiveShadow = true;
  floorGroup.add(sponge2);

  scene.add(floorGroup);
}

/**
 * Zone 1: Left Wall / Intro Board ("ABOUT & EDUCATION")
 */
function buildZone1Intro() {
  const zone1Group = new THREE.Group();
  zone1Group.position.set(-6.5, 0.8, -0.4);
  zone1Group.rotation.z = 0.04;

  // Corrugated Cardboard Board Slab
  const boardGeo = new THREE.BoxGeometry(5.4, 3.4, 0.16, 1, 1, 1);
  const boardMesh = new THREE.Mesh(boardGeo, materials.kraftCardboard);
  boardMesh.castShadow = true;
  boardMesh.receiveShadow = true;
  zone1Group.add(boardMesh);

  // Corner Fabric Patches (Single-color felt/denim blocks)
  const denimPatchGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05, 1, 1, 1);
  const denimPatch = new THREE.Mesh(denimPatchGeo, materials.denim);
  denimPatch.position.set(-2.0, 1.25, 0.1);
  zone1Group.add(denimPatch);

  const crimsonPatchGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05, 1, 1, 1);
  const crimsonPatch = new THREE.Mesh(crimsonPatchGeo, materials.feltCrimson);
  crimsonPatch.position.set(2.0, 1.25, 0.1);
  zone1Group.add(crimsonPatch);

  // Top Masking Tape Headline Banner
  const tapeGeo = new THREE.BoxGeometry(3.6, 0.55, 0.06, 1, 1, 1);
  const tapeMesh = new THREE.Mesh(tapeGeo, materials.tapeCream);
  tapeMesh.position.set(0, 0.95, 0.1);
  tapeMesh.rotation.z = -0.02;
  zone1Group.add(tapeMesh);

  // Center Name Plate Block (Chunky faceted sticker plate)
  const namePlateGeo = new THREE.BoxGeometry(4.4, 0.95, 0.08, 1, 1, 1);
  const namePlate = new THREE.Mesh(namePlateGeo, materials.feltCrimson);
  namePlate.position.set(0, 0.1, 0.11);
  zone1Group.add(namePlate);

  // Subtitle Plate Block
  const subPlateGeo = new THREE.BoxGeometry(4.0, 0.55, 0.06, 1, 1, 1);
  const subPlate = new THREE.Mesh(subPlateGeo, materials.feltCyan);
  subPlate.position.set(0, -0.75, 0.11);
  zone1Group.add(subPlate);

  // Bottom Prompt Tape Strip
  const botTapeGeo = new THREE.BoxGeometry(3.0, 0.38, 0.05, 1, 1, 1);
  const botTape = new THREE.Mesh(botTapeGeo, materials.feltGreen);
  botTape.position.set(0, -1.25, 0.1);
  zone1Group.add(botTape);

  // Faceted Low-Poly Pushpins in corners
  addLowPolyPushpin(zone1Group, -2.4, 1.4, 0.12, 0xD9534F); // Crimson
  addLowPolyPushpin(zone1Group, 2.4, 1.4, 0.12, 0x4EA8DE);  // Cyan
  addLowPolyPushpin(zone1Group, -2.4, -1.4, 0.12, 0x815CA8); // Purple

  // Twine suspension cords (6-segment cylinders)
  const twineGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6);
  const twineLeft = new THREE.Mesh(twineGeo, materials.twineRope);
  twineLeft.position.set(-2.0, 3.0, 0);
  twineLeft.rotation.z = -0.15;
  zone1Group.add(twineLeft);

  const twineRight = new THREE.Mesh(twineGeo, materials.twineRope);
  twineRight.position.set(2.0, 3.0, 0);
  twineRight.rotation.z = 0.15;
  zone1Group.add(twineRight);

  // Register interactive hit target
  boardMesh.userData = {
    action: 'about',
    title: 'About & Education Scrapbook',
    desc: 'Umar Farooq • CS Student, UCP • Tap or press Enter to read bio and degrees!'
  };
  interactiveObjects.push(boardMesh);

  scene.add(zone1Group);
}

/**
 * Zone 2: Center Wooden Shelf & Corkboard (Skills & Level Select)
 */
function buildZone2Skills() {
  const shelfGroup = new THREE.Group();
  shelfGroup.position.set(0.0, 0.2, -0.5);

  // Backing Corkboard
  const corkGeo = new THREE.BoxGeometry(5.8, 3.2, 0.12, 1, 1, 1);
  const corkMesh = new THREE.Mesh(corkGeo, materials.corkTan);
  corkMesh.position.set(0, 1.2, -0.1);
  corkMesh.receiveShadow = true;
  shelfGroup.add(corkMesh);

  // Stitched border frame
  const borderGeo = new THREE.BoxGeometry(6.0, 3.4, 0.08, 1, 1, 1);
  const borderMesh = new THREE.Mesh(borderGeo, materials.denim);
  borderMesh.position.set(0, 1.2, -0.18);
  shelfGroup.add(borderMesh);

  // Vertical Metal Zipper down center (faceted track)
  const zipTrackGeo = new THREE.BoxGeometry(0.12, 3.0, 0.08, 1, 1, 1);
  const zipTrack = new THREE.Mesh(zipTrackGeo, materials.metalScrew);
  zipTrack.position.set(0.35, 1.2, -0.02);
  shelfGroup.add(zipTrack);

  // Pine Wood Suspended Shelf Base
  const woodShelfGeo = new THREE.BoxGeometry(5.6, 0.35, 2.2, 1, 1, 1);
  const woodShelf = new THREE.Mesh(woodShelfGeo, materials.pineWood);
  woodShelf.position.set(0, -0.2, 0.9);
  woodShelf.castShadow = true;
  woodShelf.receiveShadow = true;
  shelfGroup.add(woodShelf);

  // Hexagon Screws on front shelf edge (6-segment chunky bolts)
  addLowPolyHexScrew(shelfGroup, -2.5, -0.2, 2.02);
  addLowPolyHexScrew(shelfGroup, 2.5, -0.2, 2.02);

  // Interactive Totem 1: Programming & C++ (Faceted Dual-Gear Assembly)
  const gearTotem = buildLowPolyGearTotem();
  gearTotem.position.set(-1.8, 0.5, 0.9);
  shelfGroup.add(gearTotem);
  craftTotems.push(gearTotem);

  // Interactive Totem 2: Game Dev & 3D (Faceted Isometric 3D Cube)
  const cubeTotem = buildLowPolyCubeTotem();
  cubeTotem.position.set(0.0, 0.8, 0.9);
  shelfGroup.add(cubeTotem);
  craftTotems.push(cubeTotem);

  // Interactive Totem 3: Video Production (Faceted Clapperboard)
  const clapperTotem = buildLowPolyClapperTotem();
  clapperTotem.position.set(1.8, 0.5, 0.9);
  shelfGroup.add(clapperTotem);
  craftTotems.push(clapperTotem);

  // Header tape note block: "SKILLS & LEVEL SELECT"
  const tapeGeo = new THREE.BoxGeometry(3.2, 0.55, 0.06, 1, 1, 1);
  const tapeMesh = new THREE.Mesh(tapeGeo, materials.tapeCream);
  tapeMesh.position.set(0.0, 2.7, 0.05);
  shelfGroup.add(tapeMesh);

  tapeMesh.userData = {
    action: 'skills',
    title: 'Skills & Masteries Blueprint',
    desc: 'C++, Unity, Unreal, 3D Blender, Video Editing & Low-Level'
  };
  interactiveObjects.push(tapeMesh);

  scene.add(shelfGroup);
}

/**
 * Totem 1: Low-Poly Faceted Dual-Gear Assembly
 */
function buildLowPolyGearTotem() {
  const group = new THREE.Group();

  // Low-poly 8-sided base pedestal
  const baseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 8);
  const base = new THREE.Mesh(baseGeo, materials.kraftCardboard);
  group.add(base);

  // Spinning Gear Group
  const gearGroup = new THREE.Group();
  gearGroup.position.set(0, 0.45, 0);

  // Main Gear (6-sided faceted gear with 6 teeth blocks)
  const mainGearMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 6), materials.feltCyan);
  mainGearMesh.position.set(-0.16, 0, 0);
  mainGearMesh.rotation.x = Math.PI / 2;
  gearGroup.add(mainGearMesh);

  const mainPin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 6), materials.feltAmber);
  mainPin.position.set(-0.16, 0, 0);
  mainPin.rotation.x = Math.PI / 2;
  gearGroup.add(mainPin);

  // Secondary Interlocking Gear (6-sided)
  const subGearMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 6), materials.feltGreen);
  subGearMesh.position.set(0.26, 0.18, 0);
  subGearMesh.rotation.x = Math.PI / 2;
  gearGroup.add(subGearMesh);

  const subPin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 6), materials.feltCrimson);
  subPin.position.set(0.26, 0.18, 0);
  subPin.rotation.x = Math.PI / 2;
  gearGroup.add(subPin);

  group.add(gearGroup);
  group.userData = {
    action: 'skills',
    title: 'Programming & C++ Mastery',
    desc: 'Advanced C++, 8086 Assembly, Algorithms & Data Structures',
    gearAnim: mainGearMesh,
    subGearAnim: subGearMesh,
    wobbleSpeed: 0,
    wobbleAngle: 0
  };
  interactiveObjects.push(group);
  return group;
}

/**
 * Totem 2: Low-Poly Faceted Isometric 3D Cube
 */
function buildLowPolyCubeTotem() {
  const group = new THREE.Group();

  // Pedestal
  const baseGeo = new THREE.BoxGeometry(0.9, 0.15, 0.9, 1, 1, 1);
  const base = new THREE.Mesh(baseGeo, materials.kraftCardboard);
  group.add(base);

  // 3D Cube Group
  const cubeGroup = new THREE.Group();
  cubeGroup.position.set(0, 0.55, 0);

  // Main Pine Wood Cube
  const cubeGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65, 1, 1, 1);
  const cubeMesh = new THREE.Mesh(cubeGeo, materials.pineWood);
  cubeGroup.add(cubeMesh);

  // Front Inset Patch
  const patchGeo = new THREE.BoxGeometry(0.48, 0.48, 0.68, 1, 1, 1);
  const patchMesh = new THREE.Mesh(patchGeo, materials.feltAmber);
  cubeGroup.add(patchMesh);

  group.add(cubeGroup);
  group.userData = {
    action: 'skills',
    title: 'Game Development & 3D',
    desc: 'Unity Engine (Proficient), Unreal Engine & Blender 3D',
    cubeAnim: cubeGroup,
    wobbleSpeed: 0,
    wobbleAngle: 0
  };
  interactiveObjects.push(group);
  return group;
}

/**
 * Totem 3: Low-Poly Clapperboard Totem
 */
function buildLowPolyClapperTotem() {
  const group = new THREE.Group();

  // Pedestal (8-sided)
  const baseGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 8);
  const base = new THREE.Mesh(baseGeo, materials.kraftCardboard);
  group.add(base);

  // Clapperboard body
  const clapperGroup = new THREE.Group();
  clapperGroup.position.set(0, 0.42, 0);

  const slateGeo = new THREE.BoxGeometry(0.75, 0.55, 0.08, 1, 1, 1);
  const slate = new THREE.Mesh(slateGeo, materials.inkDark);
  clapperGroup.add(slate);

  // Upper clapper stick with black & white blocks
  const stickGeo = new THREE.BoxGeometry(0.78, 0.12, 0.1, 1, 1, 1);
  const stick = new THREE.Mesh(stickGeo, materials.whitePaper);
  stick.position.set(0, 0.24, 0);
  clapperGroup.add(stick);

  const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.11, 1, 1, 1), materials.inkDark);
  stripe1.position.set(-0.22, 0.24, 0);
  clapperGroup.add(stripe1);

  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.11, 1, 1, 1), materials.inkDark);
  stripe2.position.set(0.1, 0.24, 0);
  clapperGroup.add(stripe2);

  group.add(clapperGroup);
  group.userData = {
    action: 'skills',
    title: 'Media & Creative Production',
    desc: 'Video Editing (Advanced) & Videography (Proficient)',
    clapperAnim: clapperGroup,
    wobbleSpeed: 0,
    wobbleAngle: 0
  };
  interactiveObjects.push(group);
  return group;
}

/**
 * Zone 3: Upper Twine String & Stitched Fabric Pennants + Experience Gate
 */
function buildZone3Experience() {
  const pennantsGroup = new THREE.Group();
  pennantsGroup.position.set(0, 3.4, 0);

  // Twine rope line (6-segment cylinder)
  const twineGeo = new THREE.CylinderGeometry(0.02, 0.02, 22, 6);
  const twine = new THREE.Mesh(twineGeo, materials.twineRope);
  twine.rotation.z = Math.PI / 2;
  pennantsGroup.add(twine);

  // Fabric Banners Configuration (EXPERIENCE, EDUCATION, SKILLS, PROJECTS)
  const pennantDefs = [
    { text: 'EXPERIENCE', color: 0xF0AD4E, tailColor: 0xD9534F, x: -4.2, action: 'experience', desc: 'Unroll Timeline of Work & Leadership Roles' },
    { text: 'EDUCATION', color: 0x4EA8DE, tailColor: 0xF0AD4E, x: -1.4, action: 'about', desc: 'View BS CS & Academic Diplomas' },
    { text: 'SKILLS', color: 0x5CB85C, tailColor: 0x4EA8DE, x: 1.4, action: 'skills', desc: 'Inspect Technical Proficiencies & Engines' },
    { text: 'PROJECTS', color: 0xD9534F, tailColor: 0x5CB85C, x: 4.2, action: 'projects', desc: 'Explore Game, Web & Creative Showcases' }
  ];

  pennantDefs.forEach((def, idx) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(def.x, 0, 0);

    // Wooden Clothespin
    const pegGeo = new THREE.BoxGeometry(0.14, 0.36, 0.12, 1, 1, 1);
    const peg = new THREE.Mesh(pegGeo, materials.pineWood);
    peg.position.set(0, 0.08, 0.04);
    pGroup.add(peg);

    // Spring metal clip
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.14, 1, 1, 1), materials.metalScrew);
    clip.position.set(0, 0.08, 0.04);
    pGroup.add(clip);

    // White Border Liner Frame
    const borderGeo = new THREE.BoxGeometry(1.58, 1.08, 0.04, 1, 1, 1);
    const borderMesh = new THREE.Mesh(borderGeo, materials.whitePaper);
    borderMesh.position.set(0, -0.65, 0);
    pGroup.add(borderMesh);

    // Solid Color Fabric Banner Plate
    const bannerGeo = new THREE.BoxGeometry(1.48, 0.98, 0.06, 1, 1, 1);
    const bannerMat = createFlatMaterial(def.color);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, -0.65, 0.02);
    pGroup.add(banner);

    // Ribbon Tail (3-sided cone / triangular ribbon)
    const tailGeo = new THREE.ConeGeometry(0.15, 0.32, 3);
    const tailMat = createFlatMaterial(def.tailColor);
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, -1.25, 0.02);
    tail.rotation.z = Math.PI;
    pGroup.add(tail);

    banner.userData = {
      action: def.action,
      title: def.text + ' Pennant',
      desc: def.desc
    };
    interactiveObjects.push(banner);

    hangingPennants.push({
      group: pGroup,
      baseX: def.x,
      speed: 1.2 + idx * 0.3,
      amplitude: 0.08 + idx * 0.02
    });

    pennantsGroup.add(pGroup);
  });

  // Hanging Strings of Low-Poly 8-Sided Sewing Buttons
  addLowPolyDanglingButton(pennantsGroup, -5.6, 0, 0x815CA8); // Purple
  addLowPolyDanglingButton(pennantsGroup, -5.0, -0.6, 0xF0AD4E); // Amber
  addLowPolyDanglingButton(pennantsGroup, 5.2, 0, 0x4EA8DE); // Cyan
  addLowPolyDanglingButton(pennantsGroup, 5.8, -0.5, 0x5CB85C); // Green

  scene.add(pennantsGroup);

  // Experience Stage Gate archway on the cardboard runway
  buildExperienceGate();
}

/**
 * Low-Poly Experience Stage Gate archway on the runway
 */
function buildExperienceGate() {
  const gateGroup = new THREE.Group();
  gateGroup.position.set(3.8, -2.4, 0.8);

  // Left & Right Low-Poly Cardboard Pillars
  const pillarGeo = new THREE.BoxGeometry(0.35, 2.2, 0.35, 1, 1, 1);
  const pillarLeft = new THREE.Mesh(pillarGeo, materials.kraftCardboard);
  pillarLeft.position.set(-1.1, 0, 0);
  pillarLeft.castShadow = true;
  gateGroup.add(pillarLeft);

  const pillarRight = new THREE.Mesh(pillarGeo, materials.kraftCardboard);
  pillarRight.position.set(1.1, 0, 0);
  pillarRight.castShadow = true;
  gateGroup.add(pillarRight);

  // Arch Header Beam / Lintel (Solid Amber Felt)
  const lintelGeo = new THREE.BoxGeometry(2.7, 0.5, 0.25, 1, 1, 1);
  const lintel = new THREE.Mesh(lintelGeo, materials.feltAmber);
  lintel.position.set(0, 1.1, 0);
  lintel.castShadow = true;
  gateGroup.add(lintel);

  // Arch Header Cardboard Backer
  const lintelBack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.58, 0.2, 1, 1, 1), materials.kraftCardboard);
  lintelBack.position.set(0, 1.1, -0.04);
  gateGroup.add(lintelBack);

  // Dangling low-poly button bell in center of arch
  const bellGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8);
  const bell = new THREE.Mesh(bellGeo, materials.feltCrimson);
  bell.position.set(0, 0.65, 0);
  bell.rotation.x = Math.PI / 2;
  gateGroup.add(bell);

  lintel.userData = {
    action: 'experience',
    title: 'Experience Stage Gate',
    desc: 'Walk into gate or click to unroll Umar\'s Experience Roll!'
  };
  interactiveObjects.push(lintel);

  scene.add(gateGroup);
}

/**
 * Zone 4: Right Hanging Polaroids Gallery ("PROJECTS")
 */
function buildZone4Projects() {
  const projectsGroup = new THREE.Group();
  projectsGroup.position.set(6.8, 0.8, -0.4);

  const projects = cvData?.projects || [];

  // Top masking tape block: "PORTFOLIO / PROJECTS"
  const tapeGeo = new THREE.BoxGeometry(3.4, 0.6, 0.06, 1, 1, 1);
  const tape = new THREE.Mesh(tapeGeo, materials.tapeCream);
  tape.position.set(0, 2.6, 0.2);
  projectsGroup.add(tape);

  // Spiky Starburst "PRIZE" badge (Chunky faceted cones & disc)
  const starburstGroup = new THREE.Group();
  starburstGroup.position.set(-2.0, 1.8, 0.25);

  const starCoreGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 8);
  const starCore = new THREE.Mesh(starCoreGeo, materials.feltCyan);
  starCore.rotation.x = Math.PI / 2;
  starburstGroup.add(starCore);

  // 8 Low-Poly Triangular Teeth
  for (let i = 0; i < 8; i++) {
    const toothGeo = new THREE.ConeGeometry(0.2, 0.45, 4);
    const tooth = new THREE.Mesh(toothGeo, materials.feltYellow);
    const angle = (i / 8) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0);
    tooth.rotation.z = angle - Math.PI / 2;
    starburstGroup.add(tooth);
  }

  // Pushpin in star center
  addLowPolyPushpin(starburstGroup, 0, 0, 0.08, 0xD9534F);

  starburstGroup.userData = {
    action: 'projects',
    title: 'Prize Showcase Projects',
    desc: 'Browse Umar\'s games, 3D prototypes, and interactive software!'
  };
  interactiveObjects.push(starburstGroup);
  projectsGroup.add(starburstGroup);

  // Hanging Low-Poly Polaroid Frames
  const polaroidOffsets = [
    { x: -0.8, y: 0.7, z: 0.1, rotZ: -0.05, modelType: 'cube' },
    { x: 1.2, y: 0.3, z: 0.25, rotZ: 0.04, modelType: 'ring' },
    { x: -0.2, y: -1.2, z: 0.35, rotZ: 0.02, modelType: 'prism' }
  ];

  projects.slice(0, 3).forEach((proj, i) => {
    const pGroup = new THREE.Group();
    const offset = polaroidOffsets[i] || { x: i * 0.8, y: 0, z: 0.1, rotZ: 0, modelType: 'cube' };
    pGroup.position.set(offset.x, offset.y, offset.z);
    pGroup.rotation.z = offset.rotZ;

    // White Paper Frame Block
    const frameGeo = new THREE.BoxGeometry(1.9, 2.3, 0.06, 1, 1, 1);
    const frameMesh = new THREE.Mesh(frameGeo, materials.whitePaper);
    frameMesh.castShadow = true;
    pGroup.add(frameMesh);

    // Dark Photo Inset Block
    const photoGeo = new THREE.BoxGeometry(1.6, 1.4, 0.08, 1, 1, 1);
    const photoMesh = new THREE.Mesh(photoGeo, materials.photoDark);
    photoMesh.position.set(0, 0.25, 0.01);
    pGroup.add(photoMesh);

    // Miniature 3D Low-Poly Single-Color Model inside Photo Window
    if (offset.modelType === 'cube') {
      const miniCube = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55, 1, 1, 1), materials.feltAmber);
      miniCube.position.set(0, 0.25, 0.3);
      miniCube.rotation.set(0.4, 0.6, 0);
      pGroup.add(miniCube);
    } else if (offset.modelType === 'ring') {
      const miniRing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 6), materials.feltCyan);
      miniRing.position.set(0, 0.25, 0.25);
      miniRing.rotation.set(0.7, 0.3, 0);
      pGroup.add(miniRing);
    } else {
      const miniPrism = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 3), materials.feltCrimson);
      miniPrism.position.set(0, 0.25, 0.25);
      miniPrism.rotation.set(0.5, 0.4, 0.2);
      pGroup.add(miniPrism);
    }

    // Bottom Label Strip
    const labelGeo = new THREE.BoxGeometry(1.5, 0.28, 0.08, 1, 1, 1);
    const labelMesh = new THREE.Mesh(labelGeo, materials.tapeCream);
    labelMesh.position.set(0, -0.75, 0.01);
    pGroup.add(labelMesh);

    // Clothespin on top
    const pegGeo = new THREE.BoxGeometry(0.12, 0.3, 0.08, 1, 1, 1);
    const peg = new THREE.Mesh(pegGeo, materials.pineWood);
    peg.position.set(0, 1.15, 0.04);
    pGroup.add(peg);

    // Twine holding polaroid to top
    const stringLen = 3.2 - offset.y;
    const strGeo = new THREE.CylinderGeometry(0.015, 0.015, stringLen, 6);
    const stringMesh = new THREE.Mesh(strGeo, materials.twineRope);
    stringMesh.position.set(0, stringLen / 2 + 1.15, -0.02);
    pGroup.add(stringMesh);

    frameMesh.userData = {
      action: 'project',
      projectIndex: i,
      title: proj.title || 'Project ' + (i + 1),
      desc: proj.category + ' • ' + (proj.techStack || []).join(', ') + ' • Click to inspect!'
    };
    interactiveObjects.push(frameMesh);

    hangingPolaroids.push({
      group: pGroup,
      baseRotZ: offset.rotZ,
      speed: 1.0 + i * 0.4,
      amp: 0.035
    });

    projectsGroup.add(pGroup);
  });

  scene.add(projectsGroup);
}

/**
 * Zone 5: Bottom-Right Mailbox & Contact
 */
function buildZone5Contact() {
  const contactGroup = new THREE.Group();
  contactGroup.position.set(8.2, -3.2, 1.2);

  // Low-Poly Envelope Slab
  const envGeo = new THREE.BoxGeometry(1.6, 1.1, 0.18, 1, 1, 1);
  const envMesh = new THREE.Mesh(envGeo, materials.whitePaper);
  envMesh.rotation.z = -0.12;
  envMesh.castShadow = true;
  contactGroup.add(envMesh);

  // Triangular Flap (3-sided prism)
  const flapGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 3);
  const flapMesh = new THREE.Mesh(flapGeo, materials.tapeCream);
  flapMesh.position.set(0, 0.1, 0.1);
  flapMesh.rotation.z = Math.PI;
  contactGroup.add(flapMesh);

  // Airmail Stripe Blocks (Red & Denim Blue)
  const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2, 1, 1, 1), materials.feltCrimson);
  stripe1.position.set(-0.55, 0.45, 0.05);
  contactGroup.add(stripe1);

  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2, 1, 1, 1), materials.denim);
  stripe2.position.set(0.55, 0.45, 0.05);
  contactGroup.add(stripe2);

  // Pinned Sewing Button Badge: "MESSAGE" (8-sided cylinder)
  const btnGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 8);
  const btnMesh = new THREE.Mesh(btnGeo, materials.feltCyan);
  btnMesh.position.set(0.9, -0.2, 0.15);
  btnMesh.rotation.x = Math.PI / 2;
  contactGroup.add(btnMesh);

  envMesh.userData = {
    action: 'contact',
    title: 'Craft Mailbox & Contact',
    desc: 'Send a message, grab Umar\'s contact info or download CV!'
  };
  interactiveObjects.push(envMesh);

  scene.add(contactGroup);
}

// Helpers for Low-Poly Primitives
function addLowPolyPushpin(parent, x, y, z, colorHex) {
  const pinGroup = new THREE.Group();
  pinGroup.position.set(x, y, z);

  // Faceted icosahedron head (detail 1: 20 facets)
  const headGeo = new THREE.IcosahedronGeometry(0.14, 1);
  const headMat = createFlatMaterial(colorHex, 0.15, 0.5);
  const head = new THREE.Mesh(headGeo, headMat);
  pinGroup.add(head);

  // Metal pin stem
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6);
  const stem = new THREE.Mesh(stemGeo, materials.metalScrew);
  stem.position.set(0, 0, -0.06);
  stem.rotation.x = Math.PI / 2;
  pinGroup.add(stem);

  parent.add(pinGroup);
}

function addLowPolyHexScrew(parent, x, y, z) {
  const screwGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 6);
  const screw = new THREE.Mesh(screwGeo, materials.metalScrew);
  screw.position.set(x, y, z);
  screw.rotation.x = Math.PI / 2;
  parent.add(screw);
}

function addLowPolyDanglingButton(parent, x, yOffset, colorHex) {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, 0.05);

  const stringLen = 1.8 + Math.abs(yOffset);
  const strGeo = new THREE.CylinderGeometry(0.015, 0.015, stringLen, 6);
  const strMesh = new THREE.Mesh(strGeo, materials.twineRope);
  strMesh.position.set(0, -stringLen / 2, 0);
  bGroup.add(strMesh);

  // Low-poly 8-sided button disc
  const btnGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8);
  const btnMat = createFlatMaterial(colorHex);
  const btn = new THREE.Mesh(btnGeo, btnMat);
  btn.position.set(0, -stringLen, 0);
  btn.rotation.x = Math.PI / 2;
  bGroup.add(btn);

  hangingButtons.push({
    group: bGroup,
    speed: 1.5 + Math.random(),
    amp: 0.06
  });

  parent.add(bGroup);
}


// ==========================================================================
// 5. ULTRA LOW-POLY STITCHED MASCOT (FACETED GEOMETRIC RAGDOLL)
// ==========================================================================

function buildMascot() {
  mascotGroup = new THREE.Group();
  mascotGroup.position.set(playerPhysics.x, playerPhysics.y, playerPhysics.z);

  // If a custom model path is set, attempt to load it
  if (CUSTOM_MASCOT_MODEL_PATH && CUSTOM_MASCOT_MODEL_PATH.trim() !== '') {
    const loader = new GLTFLoader();
    loader.load(
      CUSTOM_MASCOT_MODEL_PATH,
      (gltf) => {
        isCustomModelLoaded = true;
        const model = gltf.scene;
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(0, 0, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        mascotGroup.add(model);
        scene.add(mascotGroup);
      },
      undefined,
      (err) => {
        console.warn('Custom model failed to load. Falling back to procedural mascot.', err);
        buildProceduralLowPolyMascot();
      }
    );
  } else {
    buildProceduralLowPolyMascot();
  }
}

/**
 * Builds the ultra low-poly faceted stitched ragdoll mascot
 * All meshes use single solid colors and low segment counts
 */
function buildProceduralLowPolyMascot() {
  const root = new THREE.Group();

  // --- HEAD (Faceted Icosahedron, detail 1) ---
  const headGeo = new THREE.IcosahedronGeometry(0.66, 1);
  const headMesh = new THREE.Mesh(headGeo, materials.burlap);
  headMesh.position.set(0, 1.25, 0);
  headMesh.castShadow = true;
  root.add(headMesh);
  mascotLimbs.head = headMesh;

  // Headband seam (6x12 torus)
  const seamGeo = new THREE.TorusGeometry(0.66, 0.03, 6, 12);
  const seamMesh = new THREE.Mesh(seamGeo, materials.inkDark);
  seamMesh.rotation.y = Math.PI / 2;
  headMesh.add(seamMesh);

  // Left Eye: 6-sided Teal Sewing Button
  const eyeLeft = createLowPolyButtonEye(0x4EA8DE);
  eyeLeft.position.set(-0.24, 0.15, 0.6);
  eyeLeft.rotation.y = -0.25;
  headMesh.add(eyeLeft);

  // Right Eye: 6-sided Purple Sewing Button (Mismatched)
  const eyeRight = createLowPolyButtonEye(0x815CA8);
  eyeRight.position.set(0.24, 0.15, 0.6);
  eyeRight.rotation.y = 0.25;
  headMesh.add(eyeRight);

  // Stitched Felt Smile (Chunky 3-segment bar)
  const smileGroup = new THREE.Group();
  const smileBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06, 1, 1, 1), materials.inkDark);
  smileBar1.position.set(-0.16, -0.22, 0.6);
  smileBar1.rotation.z = -0.2;
  smileGroup.add(smileBar1);

  const smileBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06, 1, 1, 1), materials.inkDark);
  smileBar2.position.set(0.16, -0.22, 0.6);
  smileBar2.rotation.z = 0.2;
  smileGroup.add(smileBar2);

  const smileCenter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06, 1, 1, 1), materials.inkDark);
  smileCenter.position.set(0, -0.26, 0.62);
  smileGroup.add(smileCenter);
  headMesh.add(smileGroup);

  // Yarn Hair Tuft (Faceted Dodecahedron)
  const hairGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const hairMesh = new THREE.Mesh(hairGeo, materials.feltYellow);
  hairMesh.position.set(0, 0.72, 0);
  headMesh.add(hairMesh);

  // --- BODY (8-sided Cylinder) ---
  const bodyGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.85, 8);
  const bodyMesh = new THREE.Mesh(bodyGeo, materials.burlap);
  bodyMesh.position.set(0, 0.5, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);
  mascotLimbs.body = bodyMesh;

  // Solid Denim Belly Patch
  const patch1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.06, 1, 1, 1), materials.denim);
  patch1.position.set(-0.12, 0, 0.46);
  bodyMesh.add(patch1);

  // Solid Crimson Patch
  const patch2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.06, 1, 1, 1), materials.feltCrimson);
  patch2.position.set(0.18, 0.1, 0.45);
  bodyMesh.add(patch2);

  // Zipper Slider (Chunky metal block)
  const zipSlider = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.08, 1, 1, 1), materials.metalScrew);
  zipSlider.position.set(0, -0.15, 0.5);
  bodyMesh.add(zipSlider);

  // Yarn Scarf Collar (6x10 Torus)
  const scarfGeo = new THREE.TorusGeometry(0.46, 0.09, 6, 10);
  const scarf = new THREE.Mesh(scarfGeo, materials.feltGreen);
  scarf.position.set(0, 0.88, 0);
  scarf.rotation.x = Math.PI / 2;
  root.add(scarf);
  mascotLimbs.scarf = scarf;

  // --- ARMS (6-segment Cylinders) ---
  const armGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.6, 6);

  // Left Arm Pivot (Yellow)
  const armLeftPivot = new THREE.Group();
  armLeftPivot.position.set(-0.55, 0.75, 0);
  const armLeftMesh = new THREE.Mesh(armGeo, materials.feltYellow);
  armLeftMesh.position.set(0, -0.28, 0);
  armLeftMesh.castShadow = true;
  armLeftPivot.add(armLeftMesh);
  root.add(armLeftPivot);
  mascotLimbs.armLeft = armLeftPivot;

  // Right Arm Pivot (Cyan)
  const armRightPivot = new THREE.Group();
  armRightPivot.position.set(0.55, 0.75, 0);
  const armRightMesh = new THREE.Mesh(armGeo, materials.feltCyan);
  armRightMesh.position.set(0, -0.28, 0);
  armRightMesh.castShadow = true;
  armRightPivot.add(armRightMesh);
  root.add(armRightPivot);
  mascotLimbs.armRight = armRightPivot;

  // --- LEGS (6-segment Cylinders & Box Shoes) ---
  const legGeo = new THREE.CylinderGeometry(0.15, 0.16, 0.5, 6);
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.14, 0.32, 1, 1, 1);

  // Left Leg Pivot
  const legLeftPivot = new THREE.Group();
  legLeftPivot.position.set(-0.24, 0.05, 0);
  const legLeftMesh = new THREE.Mesh(legGeo, materials.burlap);
  legLeftMesh.position.set(0, -0.24, 0);
  legLeftMesh.castShadow = true;
  legLeftPivot.add(legLeftMesh);

  const shoeLeft = new THREE.Mesh(shoeGeo, materials.denim);
  shoeLeft.position.set(0, -0.48, 0.08);
  legLeftPivot.add(shoeLeft);

  root.add(legLeftPivot);
  mascotLimbs.legLeft = legLeftPivot;

  // Right Leg Pivot
  const legRightPivot = new THREE.Group();
  legRightPivot.position.set(0.24, 0.05, 0);
  const legRightMesh = new THREE.Mesh(legGeo, materials.burlap);
  legRightMesh.position.set(0, -0.24, 0);
  legRightMesh.castShadow = true;
  legRightPivot.add(legRightMesh);

  const shoeRight = new THREE.Mesh(shoeGeo, materials.denim);
  shoeRight.position.set(0, -0.48, 0.08);
  legRightPivot.add(shoeRight);

  root.add(legRightPivot);
  mascotLimbs.legRight = legRightPivot;

  mascotGroup.add(root);
  scene.add(mascotGroup);
}

function createLowPolyButtonEye(colorHex) {
  const eyeGroup = new THREE.Group();

  // 6-sided low-poly button
  const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 6);
  const discMat = createFlatMaterial(colorHex, 0.15, 0.4);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = Math.PI / 2;
  eyeGroup.add(disc);

  // Cross thread stitch (white blocks)
  const threadGeo = new THREE.BoxGeometry(0.14, 0.04, 0.08, 1, 1, 1);
  const thread1 = new THREE.Mesh(threadGeo, materials.whitePaper);
  thread1.position.z = 0.03;
  eyeGroup.add(thread1);

  const thread2 = new THREE.Mesh(threadGeo, materials.whitePaper);
  thread2.position.z = 0.03;
  thread2.rotation.z = Math.PI / 2;
  eyeGroup.add(thread2);

  return eyeGroup;
}


// ==========================================================================
// 6. ANIMATION & PLATFORMER TICK LOOP
// ==========================================================================

let walkCycleTime = 0;

function updatePhysics(dt) {
  if (currentMode !== 'play') return;

  // Input Movement
  let moveInput = 0;
  if (keysPressed.left) moveInput -= 1;
  if (keysPressed.right) moveInput += 1;

  playerPhysics.vx = moveInput * playerPhysics.speed;

  // Jump Input
  if (keysPressed.jump && playerPhysics.isGrounded) {
    playerPhysics.vy = playerPhysics.jumpForce;
    playerPhysics.isGrounded = false;
    keysPressed.jump = false; // consume jump
    playJumpSound();
  }

  // Gravity
  playerPhysics.vy += playerPhysics.gravity * dt;

  // Apply velocity
  playerPhysics.x += playerPhysics.vx * dt;
  playerPhysics.y += playerPhysics.vy * dt;

  // Bounds Clamping
  playerPhysics.x = Math.max(playerPhysics.boundsX[0], Math.min(playerPhysics.boundsX[1], playerPhysics.x));

  // Platform & Floor Collisions
  playerPhysics.isGrounded = false;

  for (const plat of playerPhysics.platforms) {
    const left = plat.x - plat.w / 2;
    const right = plat.x + plat.w / 2;
    const top = plat.y;

    if (playerPhysics.x >= left && playerPhysics.x <= right) {
      if (playerPhysics.y <= top && playerPhysics.y >= top - 0.5 && playerPhysics.vy <= 0) {
        playerPhysics.y = top;
        playerPhysics.vy = 0;
        playerPhysics.isGrounded = true;
        break;
      }
    }
  }

  // Update Mascot Mesh Position & Facing
  if (mascotGroup) {
    mascotGroup.position.x = playerPhysics.x;
    mascotGroup.position.y = playerPhysics.y;
    mascotGroup.position.z = playerPhysics.z;

    if (moveInput !== 0) {
      playerPhysics.facing = moveInput > 0 ? 1 : -1;
      mascotGroup.rotation.y = playerPhysics.facing > 0 ? 0.35 : Math.PI - 0.35;
    }
  }

  // Animate Mascot Limbs
  animateMascot(dt, moveInput);

  // Check Proximity Triggers for Props
  checkProximityTriggers();
}

function animateMascot(dt, moveInput) {
  if (!mascotLimbs.armLeft) return;

  const isMoving = Math.abs(moveInput) > 0.1 && playerPhysics.isGrounded;

  if (isMoving) {
    walkCycleTime += dt * 14;
    const armSwing = Math.sin(walkCycleTime) * 0.75;
    const legSwing = Math.sin(walkCycleTime) * 0.75;

    mascotLimbs.armLeft.rotation.x = armSwing;
    mascotLimbs.armRight.rotation.x = -armSwing;
    mascotLimbs.legLeft.rotation.x = -legSwing;
    mascotLimbs.legRight.rotation.x = legSwing;

    // Body bobbing
    if (mascotLimbs.body) {
      mascotLimbs.body.position.y = 0.5 + Math.abs(Math.cos(walkCycleTime)) * 0.08;
    }
  } else if (!playerPhysics.isGrounded) {
    // Jump Pose
    mascotLimbs.armLeft.rotation.x = -1.2;
    mascotLimbs.armRight.rotation.x = -1.2;
    mascotLimbs.legLeft.rotation.x = 0.4;
    mascotLimbs.legRight.rotation.x = -0.3;
  } else {
    // Idle Breathing
    const t = clock.getElapsedTime();
    mascotLimbs.armLeft.rotation.x = Math.sin(t * 2) * 0.1;
    mascotLimbs.armRight.rotation.x = -Math.sin(t * 2) * 0.1;
    mascotLimbs.legLeft.rotation.x = 0;
    mascotLimbs.legRight.rotation.x = 0;
    if (mascotLimbs.head) {
      mascotLimbs.head.rotation.z = Math.sin(t * 1.5) * 0.05;
    }
  }
}

function getNearestProximityProp() {
  let nearestProp = null;
  let minDist = 2.8;

  for (const obj of interactiveObjects) {
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    const dist = Math.hypot(worldPos.x - playerPhysics.x, worldPos.y - playerPhysics.y);
    if (dist < minDist) {
      minDist = dist;
      nearestProp = obj;
    }
  }
  return nearestProp;
}

function checkProximityTriggers() {
  const nearestProp = getNearestProximityProp();
  const tooltip = document.getElementById('craft-tooltip');
  if (nearestProp && nearestProp.userData) {
    showPropTooltip(nearestProp, true);
  } else if (!hoveredObject) {
    tooltip.classList.add('craft-tooltip-hidden');
  }
}

/**
 * Main Render Loop
 */
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  // 1. Update Platformer Physics
  updatePhysics(dt);

  // 2. Oscillate Hanging Pennants & Buttons
  hangingPennants.forEach((p) => {
    p.group.rotation.z = Math.sin(time * p.speed) * p.amplitude;
  });

  hangingButtons.forEach((b) => {
    b.group.rotation.z = Math.cos(time * b.speed) * b.amp;
  });

  hangingPolaroids.forEach((pol) => {
    pol.group.rotation.z = pol.baseRotZ + Math.sin(time * pol.speed) * pol.amp;
  });

  // 3. Spin Craft Totems (Gears & Levitating 3D Cube)
  craftTotems.forEach((totem) => {
    if (totem.userData.gearAnim) {
      totem.userData.gearAnim.rotation.z += 0.014;
    }
    if (totem.userData.subGearAnim) {
      totem.userData.subGearAnim.rotation.z -= 0.022;
    }
    if (totem.userData.cubeAnim) {
      totem.userData.cubeAnim.rotation.y += 0.015;
      totem.userData.cubeAnim.position.y = 0.55 + Math.sin(time * 2.5) * 0.06;
    }
    if (totem.userData.clapperAnim) {
      totem.userData.clapperAnim.rotation.y = Math.sin(time * 1.8) * 0.2;
    }
  });

  // 4. Camera Tracking (Play Mode vs Tour Mode)
  if (currentMode === 'play') {
    // Follow Player X smoothly with slight offset
    const camTargetX = THREE.MathUtils.clamp(playerPhysics.x * 0.65, -5.5, 5.5);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.0, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, isMobile ? 15.5 : 13.8, 0.08);
    camera.lookAt(camTargetX * 0.8, -0.6, 0);
  } else {
    // Tour Mode: Interpolate to target waypoint
    camera.position.lerp(targetCameraPos, 0.06);
    camera.lookAt(targetCameraLookAt);
  }

  // 5. Parallax Mouse Tilt
  if (!isMobile) {
    const tiltX = (clientMouse.x / window.innerWidth - 0.5) * 0.5;
    const tiltY = -(clientMouse.y / window.innerHeight - 0.5) * 0.3;
    camera.position.x += tiltX * 0.15;
    camera.position.y += tiltY * 0.15;
  }

  renderer.render(scene, camera);
}


// ==========================================================================
// 7. RAYCASTING, HOVER & CLICK INTERACTIONS
// ==========================================================================

function onMouseMove(e) {
  clientMouse.x = e.clientX;
  clientMouse.y = e.clientY;

  mousePointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  mousePointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mousePointer, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, true);

  if (intersects.length > 0) {
    let topObj = intersects[0].object;
    while (topObj && !topObj.userData?.action && topObj.parent) {
      topObj = topObj.parent;
    }

    if (topObj && topObj.userData?.action) {
      if (hoveredObject !== topObj) {
        hoveredObject = topObj;
        document.body.style.cursor = 'pointer';
        playTapSound(480);
        showPropTooltip(topObj, false, e.clientX, e.clientY);
      }
      return;
    }
  }

  if (hoveredObject) {
    hoveredObject = null;
    document.body.style.cursor = 'default';
    const tooltip = document.getElementById('craft-tooltip');
    tooltip.classList.add('craft-tooltip-hidden');
  }
}

function onCanvasClick(e) {
  initAudioContext();

  raycaster.setFromCamera(mousePointer, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, true);

  if (intersects.length > 0) {
    let topObj = intersects[0].object;
    while (topObj && !topObj.userData?.action && topObj.parent) {
      topObj = topObj.parent;
    }

    if (topObj && topObj.userData?.action) {
      handlePropAction(topObj.userData);
      playBoingSound();
    }
  }
}

function showPropTooltip(propObj, isProximity = false, mouseX = 0, mouseY = 0) {
  const tooltip = document.getElementById('craft-tooltip');
  const titleEl = document.getElementById('tooltip-title');
  const descEl = document.getElementById('tooltip-desc');
  const ctaEl = document.getElementById('tooltip-cta');

  if (!propObj.userData) return;

  titleEl.textContent = propObj.userData.title || 'Workshop Item';
  descEl.textContent = propObj.userData.desc || '';
  ctaEl.innerHTML = isProximity 
    ? '<i class="fa-solid fa-gamepad"></i> Press Space, E, or Click to Inspect' 
    : '<i class="fa-solid fa-arrow-pointer"></i> Click to Open Scrapbook';

  tooltip.classList.remove('craft-tooltip-hidden');

  if (isProximity) {
    tooltip.style.left = '50%';
    tooltip.style.top = '120px';
    tooltip.style.transform = 'translateX(-50%)';
  } else {
    tooltip.style.left = `${Math.min(window.innerWidth - 260, Math.max(20, mouseX + 18))}px`;
    tooltip.style.top = `${Math.min(window.innerHeight - 150, Math.max(80, mouseY - 40))}px`;
    tooltip.style.transform = 'none';
  }
}

function handlePropAction(data) {
  if (!data || !data.action) return;

  switch (data.action) {
    case 'about':
      openScrapbookModal('about');
      break;
    case 'skills':
      openScrapbookModal('skills');
      break;
    case 'experience':
      openScrapbookModal('experience');
      break;
    case 'projects':
      openScrapbookModal('projects');
      break;
    case 'project':
      openProjectBlueprint(data.projectIndex);
      break;
    case 'contact':
      openScrapbookModal('contact');
      break;
    default:
      break;
  }
}


// ==========================================================================
// 8. SCRAPBOOK MODALS SYSTEM & DYNAMIC TEMPLATES
// ==========================================================================

function openScrapbookModal(type) {
  initAudioContext();
  playPaperSound();

  const backdrop = document.getElementById('scrapbook-modal-backdrop');
  const titleEl = document.getElementById('modal-headline');
  const catEl = document.getElementById('modal-category');
  const iconEl = document.getElementById('modal-icon');
  const bodyEl = document.getElementById('modal-body-content');
  const footerAction = document.getElementById('modal-footer-actions');

  backdrop.classList.remove('modal-backdrop-hidden');

  switch (type) {
    case 'about':
      catEl.textContent = 'ABOUT & EDUCATION';
      titleEl.textContent = cvData?.profile?.fullName || 'MUHAMMAD UMAR FAROOQ';
      iconEl.innerHTML = '<i class="fa-solid fa-user-graduate"></i>';
      bodyEl.innerHTML = renderAboutScrapbook();
      footerAction.innerHTML = `
        <button class="craft-btn craft-btn-primary" id="modal-resume-btn">
          <i class="fa-solid fa-file-pdf"></i> Download Full CV
        </button>
      `;
      document.getElementById('modal-resume-btn')?.addEventListener('click', triggerCvDownload);
      break;

    case 'skills':
      catEl.textContent = 'WORKSHOP BLUEPRINT';
      titleEl.textContent = 'SKILLS & LEVEL SELECT';
      iconEl.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i>';
      bodyEl.innerHTML = renderSkillsScrapbook();
      footerAction.innerHTML = `
        <button class="craft-btn craft-btn-secondary" id="modal-projects-jump">
          <i class="fa-solid fa-gamepad"></i> View Project Demos
        </button>
      `;
      document.getElementById('modal-projects-jump')?.addEventListener('click', () => {
        closeScrapbookModal();
        openScrapbookModal('projects');
      });
      break;

    case 'experience':
      catEl.textContent = 'CAREER TIMELINE';
      titleEl.textContent = 'EXPERIENCE ROLL';
      iconEl.innerHTML = '<i class="fa-solid fa-scroll"></i>';
      bodyEl.innerHTML = renderExperienceScrapbook();
      footerAction.innerHTML = `
        <button class="craft-btn craft-btn-amber" id="modal-contact-jump">
          <i class="fa-solid fa-envelope"></i> Contact Umar
        </button>
      `;
      document.getElementById('modal-contact-jump')?.addEventListener('click', () => {
        closeScrapbookModal();
        openScrapbookModal('contact');
      });
      break;

    case 'projects':
      catEl.textContent = 'PORTFOLIO SHOWCASE';
      titleEl.textContent = 'THINGS I HAVE WORKED ON';
      iconEl.innerHTML = '<i class="fa-solid fa-camera-retro"></i>';
      bodyEl.innerHTML = renderProjectsGalleryScrapbook();
      footerAction.innerHTML = `
        <button class="craft-btn craft-btn-primary" id="modal-close-action">
          <i class="fa-solid fa-check"></i> Close Showcase
        </button>
      `;
      document.getElementById('modal-close-action')?.addEventListener('click', closeScrapbookModal);
      break;

    case 'contact':
      catEl.textContent = 'AIRMAIL ENVELOPE';
      titleEl.textContent = 'GET IN TOUCH';
      iconEl.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
      bodyEl.innerHTML = renderContactScrapbook();
      footerAction.innerHTML = `
        <button class="craft-btn craft-btn-primary" id="send-mail-btn">
          <i class="fa-solid fa-paper-plane"></i> Send Airmail
        </button>
      `;
      document.getElementById('send-mail-btn')?.addEventListener('click', handleSendAirmail);
      break;

    default:
      break;
  }
}

function openProjectBlueprint(index) {
  initAudioContext();
  playFanfareSound();

  const proj = cvData?.projects?.[index];
  if (!proj) return;

  const backdrop = document.getElementById('scrapbook-modal-backdrop');
  const titleEl = document.getElementById('modal-headline');
  const catEl = document.getElementById('modal-category');
  const iconEl = document.getElementById('modal-icon');
  const bodyEl = document.getElementById('modal-body-content');
  const footerAction = document.getElementById('modal-footer-actions');

  backdrop.classList.remove('modal-backdrop-hidden');

  catEl.textContent = 'PROJECT BLUEPRINT #' + (index + 1);
  titleEl.textContent = proj.title.replace('[', '').replace(']', '').replace(' - EDIT IN data.json', '');
  iconEl.innerHTML = '<i class="fa-solid fa-cubes"></i>';

  const tagsHtml = (proj.techStack || []).map(t => `<span class="felt-tag tag-cyan">${t}</span>`).join(' ');

  bodyEl.innerHTML = `
    <div class="project-blueprint-view">
      <div class="project-banner-frame">
        <div class="project-polaroid-large">
          ${proj.thumbnailPath && proj.thumbnailPath.trim() !== '' 
            ? `<img src="${proj.thumbnailPath}" alt="${proj.title}" class="project-thumbnail-img">`
            : `<div style="padding: 30px; text-align: center; background: #2A3644; border-radius: 6px; width: 100%;">
                 <i class="fa-solid fa-cubes-stacked" style="font-size: 3.5rem; color: #DFB47B;"></i>
                 <p style="color: #FFF; font-family: 'Patrick Hand'; font-size: 1.25rem; margin-top: 10px;">Tactile 3D Craft Showcase Prototype</p>
               </div>`
          }
          <div class="project-polaroid-caption">
            <span>${proj.category || 'Game / 3D Experience'}</span>
          </div>
        </div>
      </div>

      <div class="scrapbook-card">
        <div class="card-header-badge">
          <i class="fa-solid fa-file-lines" style="color: #5CB85C;"></i>
          <h3 class="card-header-title">Project Overview</h3>
        </div>
        <p class="scrapbook-bio-text">${proj.description}</p>
        <div class="badge-cluster">
          ${tagsHtml}
        </div>
      </div>
    </div>
  `;

  // Action Buttons (Graceful handling of empty URLs)
  let actionsHtml = '';
  if (proj.liveDemoUrl && proj.liveDemoUrl.trim() !== '') {
    actionsHtml += `<a href="${proj.liveDemoUrl}" target="_blank" rel="noopener" class="craft-btn craft-btn-primary"><i class="fa-solid fa-play"></i> Live Demo</a> `;
  }
  if (proj.githubRepoUrl && proj.githubRepoUrl.trim() !== '') {
    actionsHtml += `<a href="${proj.githubRepoUrl}" target="_blank" rel="noopener" class="craft-btn craft-btn-denim"><i class="fa-brands fa-github"></i> Source Code</a> `;
  }
  actionsHtml += `<button class="craft-btn craft-btn-amber" id="blueprint-close-btn"><i class="fa-solid fa-check"></i> Close</button>`;

  footerAction.innerHTML = actionsHtml;
  document.getElementById('blueprint-close-btn')?.addEventListener('click', closeScrapbookModal);
}

function closeScrapbookModal() {
  const backdrop = document.getElementById('scrapbook-modal-backdrop');
  backdrop.classList.add('modal-backdrop-hidden');
  playPaperSound();
}

/**
 * HTML Template: About & Education Scrapbook Page
 */
function renderAboutScrapbook() {
  const profile = cvData?.profile || {};
  const eduList = cvData?.education || [];

  const languagesHtml = (profile.languages || []).map(l => `<span class="felt-tag tag-cyan">${l}</span>`).join(' ');
  const hobbiesHtml = (profile.hobbies || []).map(h => `<span class="felt-tag tag-green">${h}</span>`).join(' ');

  const eduItemsHtml = eduList.map(item => `
    <div class="edu-certificate">
      <div class="edu-degree">${item.degree}</div>
      <div class="edu-meta">${item.institution} &bull; ${item.period}</div>
      <p class="edu-desc">${item.details}</p>
    </div>
  `).join('');

  return `
    <div class="scrapbook-grid">
      <!-- Left Column: Biography & Background -->
      <div class="scrapbook-card card-tilted-left">
        <span class="tape-strip tape-top-center"></span>
        <div class="card-header-badge">
          <i class="fa-solid fa-pencil" style="color: #F0AD4E;"></i>
          <h3 class="card-header-title">Creator Biography</h3>
        </div>
        <p class="scrapbook-bio-text">${profile.bio}</p>

        <div style="margin-top: 16px;">
          <h4 style="font-family: 'Fredoka'; font-size: 0.95rem; margin-bottom: 6px;">Languages</h4>
          <div class="badge-cluster">${languagesHtml}</div>
        </div>

        <div style="margin-top: 14px;">
          <h4 style="font-family: 'Fredoka'; font-size: 0.95rem; margin-bottom: 6px;">Hobbies & Interests</h4>
          <div class="badge-cluster">${hobbiesHtml}</div>
        </div>
      </div>

      <!-- Right Column: Educational Certificates -->
      <div class="scrapbook-card card-tilted-right">
        <div class="pushpin pin-blue"></div>
        <div class="card-header-badge">
          <i class="fa-solid fa-award" style="color: #4EA8DE;"></i>
          <h3 class="card-header-title">Education & Degrees</h3>
        </div>
        <div class="education-list">
          ${eduItemsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * HTML Template: Skills Blueprint Scrapbook Page
 */
function renderSkillsScrapbook() {
  const categories = cvData?.skills || [];

  const catBlocksHtml = categories.map(cat => {
    const itemsHtml = cat.items.map(sk => {
      const pct = sk.level === 'Advanced' ? '92%' : (sk.level === 'Proficient' ? '80%' : (sk.level === 'Intermediate' ? '68%' : '50%'));
      const fillCol = sk.level === 'Advanced' ? '#5CB85C' : (sk.level === 'Proficient' ? '#4EA8DE' : '#F0AD4E');
      return `
        <div class="skill-ribbon-card">
          <div class="skill-name-row">
            <span class="skill-name">${sk.name}</span>
            <span class="skill-level-badge">${sk.level}</span>
          </div>
          <div class="skill-track">
            <div class="skill-fill" style="width: ${pct}; background: ${fillCol};"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="skills-category-block">
        <div class="skills-cat-header">
          <i class="fa-solid fa-toolbox" style="color: #F0AD4E;"></i>
          <span>${cat.category}</span>
        </div>
        <div class="skills-item-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="scrapbook-card">
      <span class="tape-strip tape-top-center"></span>
      ${catBlocksHtml}
    </div>
  `;
}

/**
 * HTML Template: Experience Roll Timeline
 */
function renderExperienceScrapbook() {
  const experiences = cvData?.experienceRoll || [];

  const expNodesHtml = experiences.map((exp) => {
    const tagsHtml = (exp.tags || []).map(t => `<span class="felt-tag tag-denim">${t}</span>`).join(' ');
    return `
      <div class="exp-timeline-node">
        <div class="exp-node-button"></div>
        <div class="exp-card">
          <div class="exp-role">${exp.role}</div>
          <div class="exp-company">${exp.company} &bull; ${exp.location}</div>
          <div class="exp-period"><i class="fa-solid fa-calendar-days"></i> ${exp.period}</div>
          <p class="exp-desc">${exp.description}</p>
          <div class="badge-cluster">${tagsHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="experience-roll-container">
      <div class="timeline-twine"></div>
      ${expNodesHtml}
    </div>
  `;
}

/**
 * HTML Template: Projects Gallery Grid
 */
function renderProjectsGalleryScrapbook() {
  const projects = cvData?.projects || [];

  const cardsHtml = projects.map((p, idx) => {
    const cleanTitle = p.title.replace('[', '').replace(']', '').replace(' - EDIT IN data.json', '');
    return `
      <div class="scrapbook-card" style="cursor: pointer;" onclick="window.openProjectDetail(${idx})">
        <div class="pushpin pin-yellow"></div>
        <div class="card-header-badge">
          <i class="fa-solid fa-gamepad" style="color: #D9534F;"></i>
          <h3 class="card-header-title">${cleanTitle}</h3>
        </div>
        <p class="scrapbook-bio-text" style="font-size: 1rem;">${p.description}</p>
        <div class="badge-cluster" style="margin-top: 8px;">
          ${(p.techStack || []).map(t => `<span class="felt-tag tag-cyan">${t}</span>`).join(' ')}
        </div>
        <span style="display: block; font-family: 'Fredoka'; font-size: 0.8rem; color: #5CB85C; margin-top: 10px;">
          <i class="fa-solid fa-magnifying-glass-plus"></i> Click for Blueprint & Links
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="scrapbook-grid">
      ${cardsHtml}
    </div>
  `;
}

/**
 * HTML Template: Contact Airmail Envelope
 */
function renderContactScrapbook() {
  const profile = cvData?.profile || {};

  return `
    <div class="contact-scrapbook-envelope">
      <div class="contact-info-grid">
        <div class="contact-tile">
          <div class="tile-icon"><i class="fa-solid fa-envelope"></i></div>
          <div>
            <span class="tile-label">Direct Email</span>
            <a href="mailto:${profile.email}" class="tile-value">${profile.email}</a>
          </div>
        </div>

        <div class="contact-tile">
          <div class="tile-icon" style="background: #4EA8DE;"><i class="fa-solid fa-phone"></i></div>
          <div>
            <span class="tile-label">Phone & WhatsApp</span>
            <a href="tel:${profile.phone}" class="tile-value">${profile.phone}</a>
          </div>
        </div>

        <div class="contact-tile" style="grid-column: span 2;">
          <div class="tile-icon" style="background: #5CB85C;"><i class="fa-solid fa-location-dot"></i></div>
          <div>
            <span class="tile-label">Location Base</span>
            <span class="tile-value">${profile.location}</span>
          </div>
        </div>
      </div>

      <!-- Quick Airmail Form -->
      <form id="airmail-form" onsubmit="event.preventDefault(); window.submitAirmail();">
        <div class="craft-form-group">
          <label class="craft-form-label">Your Name</label>
          <input type="text" id="airmail-name" class="craft-input" placeholder="e.g. Recruiter or Collaborator" required>
        </div>
        <div class="craft-form-group">
          <label class="craft-form-label">Your Note / Message</label>
          <textarea id="airmail-note" class="craft-textarea" rows="3" placeholder="Hello Umar, let's build something creative..." required></textarea>
        </div>
      </form>
    </div>
  `;
}

// Global modal helpers exposed to inline HTML onclicks
window.openProjectDetail = function(idx) {
  openProjectBlueprint(idx);
};

window.submitAirmail = function() {
  handleSendAirmail();
};

function handleSendAirmail() {
  const nameEl = document.getElementById('airmail-name');
  const noteEl = document.getElementById('airmail-note');

  const senderName = nameEl ? nameEl.value : 'A Visitor';
  const senderNote = noteEl ? noteEl.value : 'Greetings!';

  const mailtoUrl = `mailto:${cvData?.profile?.email || 'Umarleg01@gmail.com'}?subject=Message from ${encodeURIComponent(senderName)} via Handcrafted Portfolio&body=${encodeURIComponent(senderNote)}`;
  window.open(mailtoUrl, '_blank');
  showToast('Airmail dispatched! Check your email client.');
  closeScrapbookModal();
}

function triggerCvDownload() {
  initAudioContext();
  playFanfareSound();
  const cvPath = cvData?.profile?.cvPdfPath;
  if (cvPath && cvPath.trim() !== '') {
    window.open(cvPath, '_blank');
    showToast('Downloading Umar\'s CV PDF!');
  } else {
    showToast('CV path is placeholder. Printing CV summary!');
    window.print();
  }
}

function showToast(msg) {
  const toast = document.getElementById('craft-toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.remove('toast-hidden');

  setTimeout(() => {
    toast.classList.add('toast-hidden');
  }, 3200);
}


// ==========================================================================
// 9. CONTROLS, KEYBOARD, TOUCH & VIRTUAL SCROLL
// ==========================================================================

function onKeyDown(e) {
  initAudioContext();

  switch (e.code) {
    case 'KeyA':
    case 'ArrowLeft':
      keysPressed.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keysPressed.right = true;
      break;
    case 'KeyW':
    case 'ArrowUp':
    case 'Space':
      keysPressed.jump = true;
      break;
    case 'KeyE':
    case 'Enter':
      if (hoveredObject && hoveredObject.userData) {
        handlePropAction(hoveredObject.userData);
      } else {
        const nearest = getNearestProximityProp();
        if (nearest && nearest.userData) {
          handlePropAction(nearest.userData);
        }
      }
      break;
    case 'Escape':
      closeScrapbookModal();
      break;
    default:
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyA':
    case 'ArrowLeft':
      keysPressed.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keysPressed.right = false;
      break;
    case 'KeyW':
    case 'ArrowUp':
    case 'Space':
      keysPressed.jump = false;
      break;
    default:
      break;
  }
}

function setupTouchControls() {
  const leftBtn = document.getElementById('touch-left');
  const rightBtn = document.getElementById('touch-right');
  const jumpBtn = document.getElementById('touch-jump');
  const interactBtn = document.getElementById('touch-interact');

  if (!leftBtn) return;

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('mobile-touch-controls')?.classList.remove('touch-controls-hidden');
  }

  // Left
  leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keysPressed.left = true; });
  leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.left = false; });
  leftBtn.addEventListener('mousedown', () => { keysPressed.left = true; });
  leftBtn.addEventListener('mouseup', () => { keysPressed.left = false; });

  // Right
  rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keysPressed.right = true; });
  rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.right = false; });
  rightBtn.addEventListener('mousedown', () => { keysPressed.right = true; });
  rightBtn.addEventListener('mouseup', () => { keysPressed.right = false; });

  // Jump
  jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keysPressed.jump = true; });
  jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.jump = false; });
  jumpBtn.addEventListener('mousedown', () => { keysPressed.jump = true; });
  jumpBtn.addEventListener('mouseup', () => { keysPressed.jump = false; });

  // Interact
  interactBtn.addEventListener('click', () => {
    if (hoveredObject && hoveredObject.userData) {
      handlePropAction(hoveredObject.userData);
    } else {
      const nearest = getNearestProximityProp();
      if (nearest && nearest.userData) {
        handlePropAction(nearest.userData);
      } else {
        openScrapbookModal('about');
      }
    }
  });
}

function onScrollTrack() {
  if (currentMode !== 'tour') return;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return;

  const progress = window.scrollY / maxScroll;
  const indexFloat = progress * (tourWaypoints.length - 1);
  const baseIdx = Math.floor(indexFloat);
  const blend = indexFloat - baseIdx;

  const wpA = tourWaypoints[baseIdx] || tourWaypoints[0];
  const wpB = tourWaypoints[Math.min(baseIdx + 1, tourWaypoints.length - 1)];

  targetCameraPos.lerpVectors(wpA.pos, wpB.pos, blend);
  targetCameraLookAt.lerpVectors(wpA.look, wpB.look, blend);

  updateWaypointIndicator(Math.round(indexFloat));
}

function switchStageMode(mode) {
  currentMode = mode;
  const toggleBtn = document.getElementById('mode-toggle-btn');
  const scrollIndicator = document.getElementById('scroll-mouse-indicator');
  const controlsHint = document.getElementById('controls-hint-card');

  if (mode === 'play') {
    toggleBtn.classList.remove('tour-active');
    toggleBtn.classList.add('play-active');
    scrollIndicator.style.display = 'none';
    if (!isMobile) controlsHint.style.display = 'block';
    showToast('Play Stage Mode Active! Use WASD to run & jump.');
  } else {
    toggleBtn.classList.remove('play-active');
    toggleBtn.classList.add('tour-active');
    scrollIndicator.style.display = 'flex';
    controlsHint.style.display = 'none';
    showToast('Tour Mode Active! Scroll or click to tour diorama.');
  }
}

function updateWaypointIndicator(idx) {
  currentWaypointIndex = idx;
  const buttons = document.querySelectorAll('#zone-waypoint-nav .waypoint-btn');
  buttons.forEach((btn, i) => {
    if (i === idx) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function flyToZone(zoneName) {
  const idx = tourWaypoints.findIndex(w => w.name === zoneName);
  if (idx !== -1) {
    currentWaypointIndex = idx;
    targetCameraPos.copy(tourWaypoints[idx].pos);
    targetCameraLookAt.copy(tourWaypoints[idx].look);
    updateWaypointIndicator(idx);
    playBoingSound();

    if (currentMode === 'play') {
      const targetX = tourWaypoints[idx].pos.x;
      playerPhysics.x = targetX;
      if (mascotGroup) mascotGroup.position.x = targetX;
    }
  }
}

function onWindowResize() {
  isMobile = window.innerWidth <= 768;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = isMobile ? 55 : 45;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


// ==========================================================================
// 10. BOOTSTRAP APPLICATION
// ==========================================================================

const DEFAULT_CV_DATA = {
  profile: {
    fullName: "MUHAMMAD UMAR FAROOQ",
    headline: "CS STUDENT & CREATOR",
    subHeadline: "Game Developer, 3D Generalist & Video Editor",
    bio: "Computer Science undergraduate at the University of Central Punjab specializing in programming, algorithms, data structures, game development in Unity & Unreal Engine, 3D modeling in Blender, and creative video production.",
    location: "Wapda Town, Gujranwala, Punjab, Pakistan",
    email: "Umarleg01@gmail.com",
    phone: "+92 310 7227522",
    avatarPath: "",
    cvPdfPath: "",
    languages: ["English", "Urdu"],
    hobbies: ["Video Gaming", "Coding", "Exercising", "Puzzle Solving"]
  },
  socials: {
    github: "",
    linkedin: "",
    itchio: "",
    youtube: "",
    instagram: "",
    artstation: "",
    website: ""
  },
  education: [
    {
      degree: "BS Computer Science",
      institution: "University of Central Punjab (UCP)",
      period: "Jul 2024 - Present",
      details: "Pursuing a 4-year BS degree in Computer Science with focus on programming, algorithms, data structures, and software development."
    },
    {
      degree: "Intermediate (FSc)",
      institution: "Board of Intermediate and Secondary Education, Punjab",
      period: "Completed: 2024",
      details: "Grade: A"
    },
    {
      degree: "Matriculation (SSC)",
      institution: "Board of Intermediate and Secondary Education, Punjab",
      period: "Completed: 2022",
      details: "Grade: A"
    }
  ],
  experienceRoll: [
    {
      role: "Full-Time BS Computer Science Student",
      company: "University of Central Punjab",
      period: "2024 - Present",
      location: "Lahore / Gujranwala",
      description: "Actively pursuing undergraduate studies, specializing in computer science fundamentals, game engines (Unity & Unreal), and technical software projects.",
      tags: ["C++", "Data Structures", "Unity", "Unreal Engine"]
    },
    {
      role: "Manager",
      company: "Kingston Auto Paint Booth",
      period: "2023 - 2024",
      location: "Khiali, Gujranwala",
      description: "Managed daily operations, coordinated team workflows, and ensured strict service quality standards in an automotive paint facility.",
      tags: ["Operations Management", "Workflow Coordination", "Quality Control"]
    },
    {
      role: "Part-Time Cashier / Chef",
      company: "Chicken Munch",
      period: "2022",
      location: "Kings Mall, Gujranwala",
      description: "Handled monetary transactions accurately, performed food preparation tasks, and maintained strict safety and hygiene standards.",
      tags: ["POS & Cash Handling", "Fast-Paced Operations", "Safety Standards"]
    },
    {
      role: "Part-Time Salesman",
      company: "Family Mart",
      period: "2019",
      location: "Wapda Town, Gujranwala",
      description: "Provided customer service, managed inventory stock levels, and assisted with daily retail floor operations.",
      tags: ["Customer Service", "Inventory Management", "Retail"]
    }
  ],
  skills: [
    {
      category: "Programming & Low-Level",
      items: [
        { name: "C++", level: "Advanced" },
        { name: "HTML5 / CSS3 / JavaScript", level: "Proficient" },
        { name: "Three.js / WebGL", level: "Exploring" },
        { name: "8086 Assembly Language", level: "Intermediate" }
      ]
    },
    {
      category: "Game Development & 3D",
      items: [
        { name: "Unity Engine", level: "Proficient" },
        { name: "Unreal Engine", level: "Intermediate" },
        { name: "Blender (3D Modeling)", level: "Intermediate" }
      ]
    },
    {
      category: "Media & Creative Production",
      items: [
        { name: "Video Editing", level: "Advanced" },
        { name: "Videography", level: "Proficient" }
      ]
    }
  ],
  projects: [
    {
      title: "[PROJECT 1 TITLE - EDIT IN data.json]",
      category: "Unity / 3D Game",
      description: "Placeholder slot for your game or coding project. Replace this description, tech stack, thumbnail, and links inside data.json.",
      techStack: ["Unity", "C#", "Blender"],
      thumbnailPath: "",
      liveDemoUrl: "",
      githubRepoUrl: ""
    },
    {
      title: "[PROJECT 2 TITLE - EDIT IN data.json]",
      category: "Web / Three.js",
      description: "Placeholder slot for your second project. Leave thumbnailPath or URLs blank if not ready—the Polaroid card handles empty fields cleanly.",
      techStack: ["HTML/CSS/JS", "Three.js"],
      thumbnailPath: "",
      liveDemoUrl: "",
      githubRepoUrl: ""
    },
    {
      title: "[PROJECT 3 TITLE - EDIT IN data.json]",
      category: "Unreal Engine / Video",
      description: "Placeholder slot for your third project, showreel, or software build.",
      techStack: ["Unreal Engine", "C++", "Video Editing"],
      thumbnailPath: "",
      liveDemoUrl: "",
      githubRepoUrl: ""
    }
  ]
};

async function initApp() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('Failed to load data.json');
    cvData = await res.json();
  } catch (err) {
    console.warn('Could not fetch data.json, using bundled profile data', err);
    cvData = DEFAULT_CV_DATA;
  }

  // Initialize Three.js Low-Poly Diorama Scene
  initThreeScene();

  // Setup UI Header Text from data.json
  const nameEl = document.getElementById('header-fullname');
  const headEl = document.getElementById('header-headline');
  const subEl = document.getElementById('header-subheadline');
  if (nameEl && cvData.profile) nameEl.textContent = cvData.profile.fullName;
  if (headEl && cvData.profile) headEl.textContent = cvData.profile.headline;
  if (subEl && cvData.profile) subEl.textContent = cvData.profile.subHeadline;

  // Pennants Nav Buttons
  document.querySelectorAll('.fabric-pennant').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      openScrapbookModal(action);
      flyToZone(action);
    });
  });

  // Waypoint Buttons
  document.querySelectorAll('#zone-waypoint-nav .waypoint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.dataset.zone;
      flyToZone(zone);
    });
  });

  // Mode Toggle Button
  document.getElementById('mode-toggle-btn')?.addEventListener('click', () => {
    initAudioContext();
    const newMode = currentMode === 'play' ? 'tour' : 'play';
    switchStageMode(newMode);
    playTapSound(520);
  });

  // Sound Toggle Button
  const sfxBtn = document.getElementById('sfx-toggle-btn');
  const sfxIcon = document.getElementById('sfx-icon');
  sfxBtn?.addEventListener('click', () => {
    initAudioContext();
    soundEnabled = !soundEnabled;
    if (sfxIcon) {
      sfxIcon.className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
    showToast(soundEnabled ? 'Tactile Sound Effects ON' : 'Audio Muted');
  });

  // Download CV Button
  document.getElementById('download-cv-btn')?.addEventListener('click', triggerCvDownload);

  // Side notes & badges
  document.querySelectorAll('.taped-paper-note, .starburst-badge, .mailbox-card').forEach(el => {
    el.addEventListener('click', () => {
      const act = el.dataset.action;
      if (act) {
        if (act === 'next-zone') {
          const nextIdx = (currentWaypointIndex + 1) % tourWaypoints.length;
          flyToZone(tourWaypoints[nextIdx].name);
        } else {
          openScrapbookModal(act);
        }
      }
    });
  });

  // Modal Close Button & Backdrop
  document.getElementById('modal-close-btn')?.addEventListener('click', closeScrapbookModal);
  document.getElementById('scrapbook-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'scrapbook-modal-backdrop') {
      closeScrapbookModal();
    }
  });

  // Start Render Loop
  animate();
}

// Start Application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
