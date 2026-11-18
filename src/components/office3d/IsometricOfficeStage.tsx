import {useEffect, useRef, type RefObject} from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Raycaster,
  RectAreaLight,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {
  MEZZANINE_Y,
  STUDIO_ROOMS,
  THE_AGENTS,
  type AgentActivityKind,
  type AgentId,
} from '../../data/theAgents';
import type {AgentStatusState} from '../../context/AgentContext';
import {createStyleKit, type GayaId, type ObjectRole} from './styleKits';
import {ensureGsapRegistered, gsap} from '../../lib/gsapCoordinator';

export type IdleSpot = 'meja' | 'papan' | 'kopi' | 'sofa';

export const IDLE_SPOT_LABEL: Record<IdleSpot, string> = {
  meja: 'siap beraksi',
  papan: 'cek Mission Board',
  kopi: 'seduh kopi dulu',
  sofa: 'diskusi di sofa',
};

const X0 = -8.8;
const X1 = 8.8;
const ROOM_W = X1 - X0;
const Z0 = -3.5;
const Z1 = 3.2;
const ROOM_D = Z1 - Z0;
const MEZZ_Z0 = -3.5;
const MEZZ_Z1 = -0.95;
const MEZZ_D = MEZZ_Z1 - MEZZ_Z0;
const WALL_H = 5.85;

const BOARD_POS = new Vector3(0.0, 0, -0.78);
const FLOOR1_CORRIDOR_Z = 0.72;
const FLOOR2_CORRIDOR_Z = -1.38;
const WALK_SPEED = 2.55;
const SPOTS: readonly IdleSpot[] = ['papan', 'kopi', 'sofa'];

const FLOOR1_BOARD_SLOTS: readonly [number, number][] = [
  [-1.65, -0.02],
  [-0.95, 0.08],
  [-0.25, -0.02],
  [0.45, 0.08],
  [1.15, -0.02],
  [1.75, 0.08],
];

// Pre-allocated math scratchpad (zero GC inside animation loop)
const _proj = new Vector3();
const _boardAt = new Vector3();
const _labelAt = new Vector3();
const _dest = new Vector3();
const _ahead = new Vector3();
const _pointer = new Vector2();
const _raycaster = new Raycaster();
let rectAreaInitialized = false;

function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

function shadeHex(hex: string, factor: number): string {
  const c = new Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = (target - current + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  diff -= Math.PI;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function computeIdleSpot(index: number, tSec: number): {
  spot: IdleSpot;
  k: number;
  walking: boolean;
} {
  const shifted = tSec + index * 5.3;
  const cycle = ((shifted % 16) + 16) % 16;
  const cycleCount = Math.floor(shifted / 16);
  const spot = SPOTS[(((cycleCount + index) % 3) + 3) % 3]!;
  if (cycle < 2.5) return {spot, k: smoothstep(cycle / 2.5), walking: true};
  if (cycle < 8) return {spot, k: 1, walking: false};
  if (cycle < 10.5) return {spot, k: 1 - smoothstep((cycle - 8) / 2.5), walking: true};
  return {spot: 'meja', k: 0, walking: false};
}

function stepCorridorWalk(
  pos: Vector3,
  dest: Vector3,
  corridorZ: number,
  maxStep: number,
  aheadOut: Vector3,
): boolean {
  const remX = dest.x - pos.x;
  const remZ = dest.z - pos.z;
  const totalDist = Math.hypot(remX, remZ);
  if (totalDist <= 0.035) {
    pos.copy(dest);
    return false;
  }

  if (Math.abs(remX) <= 0.16) {
    aheadOut.copy(dest);
  } else if (Math.abs(pos.z - corridorZ) > 0.08) {
    aheadOut.set(pos.x, dest.y, corridorZ);
  } else {
    aheadOut.set(dest.x, dest.y, corridorZ);
  }

  const wx = aheadOut.x - pos.x;
  const wz = aheadOut.z - pos.z;
  const wDist = Math.hypot(wx, wz);
  if (wDist > 1e-5) {
    const step = Math.min(maxStep, wDist);
    pos.x += (wx / wDist) * step;
    pos.z += (wz / wDist) * step;
  }
  pos.y = dest.y;
  return true;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return true;
  }
}

interface ActorRig {
  id: AgentId;
  index: number;
  floor: 1 | 2;
  baseY: number;
  massive: boolean;
  auraColor: string;
  root: Group;
  body: Mesh;
  chestRim: Mesh;
  head: Mesh;
  armL: Mesh;
  armR: Mesh;
  legL: Mesh;
  legR: Mesh;
  screen: Mesh;
  deskTop: Mesh;
  book: Mesh;
  lamp: Mesh;
  light: PointLight | null;
  floorRing: Mesh;
  floorRingMat: MeshBasicMaterial;
  contactShadow: Mesh;
  contactShadowMat: MeshBasicMaterial;
  seat: Vector3;
  currentPos: Vector3;
  facingYaw: number;
  labelWorld: Vector3;
  phase: number;
  animBodyY: number;
  animHeadX: number;
  animHeadY: number;
  animArmLX: number;
  animArmLZ: number;
  animArmRX: number;
  animArmRZ: number;
  animLegLX: number;
  animLegRX: number;
  animChestGlow: number;
  animRingOpacity: number;
  animRingScale: number;
}

export interface IsometricOfficeStageProps {
  gaya: GayaId;
  agentStates: Record<AgentId, AgentStatusState>;
  boardAgentIds: AgentId[];
  boardSelected?: boolean;
  hoveredAgentId: AgentId | null;
  selectedAgentId: AgentId | null;
  pulseProgressMap: Partial<Record<AgentId, number>>;
  anchorsRef: RefObject<Map<AgentId, HTMLElement>>;
  boardAnchorRef: RefObject<HTMLElement | null>;
  spotCallbackRef: RefObject<((spots: Partial<Record<AgentId, IdleSpot>>) => void) | null>;
  onHoverAgent: (id: AgentId | null) => void;
  onSelectAgent: (id: AgentId) => void;
  onSelectBoard: () => void;
  onWebGLUnavailable: () => void;
}

export function IsometricOfficeStage({
  gaya,
  agentStates,
  boardAgentIds,
  boardSelected = false,
  hoveredAgentId,
  selectedAgentId,
  pulseProgressMap,
  anchorsRef,
  boardAnchorRef,
  spotCallbackRef,
  onHoverAgent,
  onSelectAgent,
  onSelectBoard,
  onWebGLUnavailable,
}: IsometricOfficeStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renderOnceRef = useRef<(() => void) | null>(null);
  const cameraTransitionRef = useRef<(() => void) | null>(null);

  const liveRef = useRef({
    agentStates,
    boardAgentIds,
    boardSelected,
    hoveredAgentId,
    selectedAgentId,
    pulseProgressMap,
    onHoverAgent,
    onSelectAgent,
    onSelectBoard,
    onWebGLUnavailable,
  });
  liveRef.current = {
    agentStates,
    boardAgentIds,
    boardSelected,
    hoveredAgentId,
    selectedAgentId,
    pulseProgressMap,
    onHoverAgent,
    onSelectAgent,
    onSelectBoard,
    onWebGLUnavailable,
  };

  useEffect(() => {
    cameraTransitionRef.current?.();
  }, [selectedAgentId, boardSelected, boardAgentIds.length]);

  useEffect(() => {
    renderOnceRef.current?.();
  }, [agentStates, boardAgentIds, boardSelected, hoveredAgentId, selectedAgentId, pulseProgressMap]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: isSoftwareGl ? 'low-power' : 'high-performance',
      });
    } catch {
      liveRef.current.onWebGLUnavailable();
      return;
    }

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new Scene();
    const pmremGenerator = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const maxAniso = isSoftwareGl
      ? 1
      : Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
    const K = createStyleKit(gaya, maxAniso);
    scene.environmentIntensity = K.envIntensity[1];

    if (K.fog) {
      scene.fog = new Fog(K.fog[1], 32, 52);
    }

    const kantor = new Group();
    scene.add(kantor);

    const camera = new OrthographicCamera(-12, 12, 7.5, -7.5, 0.1, 110);
    const homeTarget = new Vector3(0.0, 2.05, -0.2);

    const C = K.lighting;
    const isHolo = K.id === 'hologram';
    const hemi = new HemisphereLight(C.sky, C.ground, C.hemiIntensity);
    const sun = new DirectionalLight(C.sun, C.sunIntensity);
    sun.position.set(-8.5, 16.5, 9.5);
    sun.target.position.set(0, 1.2, -0.2);
    if (!isSoftwareGl) {
      sun.castShadow = true;
      const mapDim = isTouch ? 1024 : 2048;
      sun.shadow.mapSize.set(mapDim, mapDim);
      sun.shadow.camera.left = -15.5;
      sun.shadow.camera.right = 15.5;
      sun.shadow.camera.top = 13.5;
      sun.shadow.camera.bottom = -11.5;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 42;
      sun.shadow.bias = -0.0002;
      sun.shadow.normalBias = 0.025;
      sun.shadow.radius = 2.4;
      sun.shadow.intensity = 0.6;
    }

    const rimLight = new DirectionalLight(isHolo ? '#22D3EE' : '#6B94FF', 0.88);
    rimLight.position.set(10, 8.5, -10.5);
    rimLight.target.position.set(0, 1.5, 0);

    const amb = new AmbientLight('#FFFFFF', 0.16);
    scene.add(hemi, sun, sun.target, rimLight, rimLight.target, amb);

    if (!isSoftwareGl) {
      if (!rectAreaInitialized) {
        RectAreaLightUniformsLib.init();
        rectAreaInitialized = true;
      }
      const leftWindowLight = new RectAreaLight(
        isHolo ? '#22D3EE' : '#FFD9A8',
        isHolo ? 2.2 : 2.6,
        6.2,
        1.6,
      );
      leftWindowLight.position.set(-5.2, 3.6, Z0 + 0.25);
      leftWindowLight.lookAt(-4.8, 0.8, 1.6);
      const rightWindowLight = new RectAreaLight(
        isHolo ? '#22D3EE' : '#FFD9A8',
        isHolo ? 2.2 : 2.6,
        6.2,
        1.6,
      );
      rightWindowLight.position.set(5.2, 3.6, Z0 + 0.25);
      rightWindowLight.lookAt(4.8, 0.8, 1.6);
      scene.add(leftWindowLight, rightWindowLight);
    }

    const disposables: {dispose(): void}[] = [];
    const trackGeo = <T extends BufferGeometry>(geom: T): T => {
      disposables.push(geom);
      return geom;
    };
    const trackMat = <T extends Material>(mat: T): T => {
      disposables.push(mat);
      return mat;
    };

    const mat = (hex: string, role: ObjectRole, emissive?: string) =>
      K.material(hex, role, emissive);
    const roleOf = (m: Material): ObjectRole =>
      (m.userData.role as ObjectRole | undefined) ?? 'kayu';

    const add = (
      mesh: Mesh,
      x: number,
      y: number,
      z: number,
      parent: Scene | Group | Mesh = kantor,
    ) => {
      mesh.position.set(x, y, z);
      parent.add(mesh);
      K.decorate?.(mesh, roleOf(mesh.material as Material));
      return mesh;
    };

    const box = (
      w: number,
      h: number,
      d: number,
      m: Material,
      x: number,
      y: number,
      z: number,
      parent?: Group,
    ) => add(new Mesh(K.box(w, h, d, roleOf(m)), m), x, y, z, parent);

    const cyl = (rt: number, rb: number, h: number, m: Material) =>
      new Mesh(K.cylinder(rt, rb, h, roleOf(m)), m);
    const ball = (r: number, m: Material, dome = false) =>
      new Mesh(K.sphere(r, roleOf(m), dome), m);
    const cone = (r: number, h: number, m: Material, open = false) =>
      new Mesh(K.cone(r, h, roleOf(m), open), m);

    // ---------- Widened 2-Story Building (Lantai 1 + Mezzanine Tingkat 2) ----------
    const lineM = mat('#3C3029', 'garis');
    for (const r of STUDIO_ROOMS) {
      const rw = r.x1 - r.x0;
      const cx = (r.x0 + r.x1) / 2;
      const floorCol = shadeHex(r.floor, 0.38);
      box(rw - 0.04, 0.14, ROOM_D, mat(floorCol, 'lantai'), cx, -0.07, (Z0 + Z1) / 2);
      for (let z = Z0 + 0.55; z < Z1; z += 0.72) {
        box(rw - 0.12, 0.005, 0.02, lineM, cx, 0.002, z);
      }
      box(3.1, 0.02, 2.0, mat(r.rug, 'karpet'), cx, 0.014, 1.1);
    }

    // Foundation plinth under widened building
    box(ROOM_W + 0.7, 0.5, ROOM_D + 0.6, mat('#2C243D', 'alas'), 0, -0.4, (Z0 + Z1) / 2 + 0.15);

    const wallM = mat('#FBF6EF', 'dinding');
    const wallSideM = mat('#F1E8DC', 'dinding');
    const trimM = mat('#221B35', 'bingkai');
    const woodM = mat('#A87C56', 'kayu');

    // Back wall & Left side wall covering full 2-story height
    box(ROOM_W, WALL_H, 0.18, wallM, 0, WALL_H / 2, Z0 - 0.09);
    box(0.18, WALL_H, ROOM_D, wallSideM, X0 - 0.09, WALL_H / 2, (Z0 + Z1) / 2);
    box(ROOM_W, 0.12, 0.22, woodM, 0, 0.06, Z0 - 0.02);
    box(0.22, 0.12, ROOM_D, woodM, X0 - 0.02, 0.06, (Z0 + Z1) / 2);

    // Cutaway room dividers on Floor 1 with open center walkway (CORRIDOR_Z = 0.72)
    for (const x of [-2.6, 2.6]) {
      box(0.14, 1.25, 1.55, wallSideM, x, 0.62, Z0 + 1.85);
      box(0.14, 1.25, 1.5, wallSideM, x, 0.62, Z1 - 0.75);
      box(0.18, 0.06, 1.55, woodM, x, 1.27, Z0 + 1.85);
      box(0.18, 0.06, 1.5, woodM, x, 1.27, Z1 - 0.75);
    }

    // Windows across both Floor 1 and Floor 2 back/left walls
    const glassM = mat(isHolo ? '#18204A' : '#FFE1A8', 'kaca', isHolo ? '#10173A' : '#5A340C');
    for (const x of [-7.0, -4.4, 4.4, 7.0]) {
      box(1.55, 1.15, 0.06, trimM, x, 1.65, Z0 + 0.02);
      box(1.4, 1.0, 0.04, glassM, x, 1.65, Z0 + 0.05);
      box(0.05, 1.0, 0.05, trimM, x, 1.65, Z0 + 0.07);
    }
    for (const x of [-6.4, -3.2, 0.0, 3.2, 6.4]) {
      box(1.75, 1.2, 0.06, trimM, x, MEZZANINE_Y + 1.68, Z0 + 0.02);
      box(1.6, 1.05, 0.04, glassM, x, MEZZANINE_Y + 1.68, Z0 + 0.05);
      box(0.05, 1.05, 0.05, trimM, x, MEZZANINE_Y + 1.68, Z0 + 0.07);
    }
    for (const z of [-1.2, 1.55]) {
      box(0.06, 1.1, 1.4, trimM, X0, 1.65, z);
      box(0.04, 0.96, 1.26, glassM, X0 + 0.03, 1.65, z);
    }
    box(0.06, 1.15, 1.6, trimM, X0, MEZZANINE_Y + 1.65, -2.2);
    box(0.04, 1.0, 1.44, glassM, X0 + 0.03, MEZZANINE_Y + 1.65, -2.2);

    // Upper floor zone headers on Floor 2 back wall
    for (const r of STUDIO_ROOMS) {
      box(
        1.8,
        0.24,
        0.04,
        mat(r.rug, 'catatan', r.rug),
        (r.x0 + r.x1) / 2,
        MEZZANINE_Y + 2.65,
        Z0 + 0.03,
      );
    }

    // Floor 2 Mezzanine Slab (rear deck: Z -3.5 .. -0.95, leaving Floor 1 desks & sofa open)
    const MEZZ_CENTER_Z = (MEZZ_Z0 + MEZZ_Z1) / 2;
    for (const r of STUDIO_ROOMS) {
      const rw = r.x1 - r.x0;
      const cx = (r.x0 + r.x1) / 2;
      box(rw - 0.04, 0.14, MEZZ_D, mat(shadeHex(r.floor, 0.42), 'lantai'), cx, MEZZANINE_Y - 0.07, MEZZ_CENTER_Z);
      box(rw - 0.55, 0.02, 0.9, mat(r.rug, 'karpet'), cx, MEZZANINE_Y + 0.014, -2.25);
    }
    // Front structural steel beam & support columns
    box(ROOM_W - 0.1, 0.2, 0.14, trimM, 0, MEZZANINE_Y - 0.1, MEZZ_Z1 - 0.04);
    for (const cx of [-8.55, -2.6, 2.6, 8.55]) {
      box(0.16, MEZZANINE_Y, 0.16, trimM, cx, MEZZANINE_Y / 2, MEZZ_Z1 - 0.06);
    }

    // Front glass railing along Floor 2 mezzanine (opening at x = 7.3..8.7 for staircase landing)
    const RAIL_W = 15.9;
    const RAIL_CX = -0.75;
    box(RAIL_W, 0.06, 0.06, woodM, RAIL_CX, MEZZANINE_Y + 0.88, MEZZ_Z1 - 0.04);
    box(RAIL_W, 0.72, 0.03, glassM, RAIL_CX, MEZZANINE_Y + 0.46, MEZZ_Z1 - 0.04);
    for (const px of [-8.6, -5.4, -2.6, 0.0, 2.6, 5.4, 7.18]) {
      box(0.06, 0.9, 0.06, trimM, px, MEZZANINE_Y + 0.45, MEZZ_Z1 - 0.04);
    }

    // Architectural Staircase on East Wing (Floor 1 z = 2.4 -> Floor 2 landing z = -0.95)
    const STAIR_X = 8.05;
    const STEP_COUNT = 9;
    for (let s = 0; s < STEP_COUNT; s++) {
      const frac = (s + 0.6) / STEP_COUNT;
      const stepY = frac * (MEZZANINE_Y - 0.12);
      const stepZ = MathUtils.lerp(2.35, MEZZ_Z1 + 0.18, s / (STEP_COUNT - 1));
      box(1.15, 0.1, 0.42, woodM, STAIR_X, stepY, stepZ);
      box(1.12, 0.04, 0.36, trimM, STAIR_X, stepY - 0.07, stepZ);
    }
    // Slanted stair stringer side rails
    for (const sx of [STAIR_X - 0.62, STAIR_X + 0.62]) {
      const rail = box(0.06, 0.08, 4.45, trimM, sx, MEZZANINE_Y * 0.52, 0.65);
      rail.rotation.x = 0.7;
    }

    // Central Mission Board Monolith in Floor 1 Atrium (front-facing, unobstructed)
    const boardPostL = box(0.1, 1.35, 0.1, trimM, BOARD_POS.x - 1.25, 0.68, BOARD_POS.z);
    const boardPostR = box(0.1, 1.35, 0.1, trimM, BOARD_POS.x + 1.25, 0.68, BOARD_POS.z);
    boardPostL.userData.boardHit = true;
    boardPostR.userData.boardHit = true;

    const boardFrame = box(2.85, 1.38, 0.1, trimM, BOARD_POS.x, 1.48, BOARD_POS.z);
    boardFrame.userData.boardHit = true;
    boardFrame.layers.enable(1);
    const boardSurface = box(
      2.66,
      1.2,
      0.04,
      mat('#F7F2EA', 'papan'),
      BOARD_POS.x,
      1.48,
      BOARD_POS.z + 0.06,
    );
    boardSurface.userData.boardHit = true;
    boardSurface.layers.enable(1);

    const noteColors = [
      '#9333EA',
      '#0284C7',
      '#EC4899',
      '#10B981',
      '#F59E0B',
      '#EF4444',
    ];
    const boardNotes: Mesh[] = noteColors.map((c, i) => {
      const note = box(
        0.5,
        0.38,
        0.02,
        mat(c, 'catatan', c),
        BOARD_POS.x - 0.85 + (i % 3) * 0.85,
        1.74 - Math.floor(i / 3) * 0.52,
        BOARD_POS.z + 0.1,
      );
      if ('emissiveIntensity' in note.material) {
        (note.material as MeshStandardMaterial).emissiveIntensity = 0.72;
      }
      note.rotation.z = ((i * 37) % 7) / 60 - 0.05;
      return note;
    });

    // Bookshelves, Plants, Lounge Sofa & Coffee Nodes on Floor 1 + Floor 2
    const buildShelf = (x: number, y: number, z: number, rotY = 0) => {
      const shelfGroup = new Group();
      box(1.15, 1.65, 0.34, woodM, 0, 0.825, 0, shelfGroup);
      const bookColors = ['#0D9488', '#0284C7', '#EC4899', '#10B981', '#F59E0B', '#E11D48'];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          box(
            0.14,
            0.32,
            0.24,
            mat(bookColors[(col + row) % bookColors.length]!, 'buku'),
            -0.4 + col * 0.2,
            0.36 + row * 0.5,
            0.04,
            shelfGroup,
          );
        }
      }
      shelfGroup.position.set(x, y, z);
      shelfGroup.rotation.y = rotY;
      kantor.add(shelfGroup);
    };
    buildShelf(-8.5, 0, 1.4, Math.PI / 2);
    buildShelf(7.95, 0, -3.15);

    const potM = mat('#C26B3B', 'pot');
    const leafM = mat('#3F9B4F', 'daun');
    const leaf2M = mat('#5BBF5E', 'daun');
    const buildPlant = (x: number, y: number, z: number, scale = 1) => {
      add(cyl(0.18 * scale, 0.14 * scale, 0.36 * scale, potM), x, y + 0.18 * scale, z);
      add(cone(0.3 * scale, 0.8 * scale, leafM), x, y + 0.75 * scale, z);
      add(ball(0.22 * scale, leaf2M), x + 0.1 * scale, y + 0.62 * scale, z + 0.08 * scale);
    };
    buildPlant(-8.2, 0, 2.65, 1.1);
    buildPlant(-8.2, 0, -2.9, 1.0);
    buildPlant(-8.2, MEZZANINE_Y, -3.05, 0.85);
    buildPlant(8.2, MEZZANINE_Y, -3.05, 0.85);
    buildPlant(3.2, 0, 2.7, 0.9);

    // Lounge Sofa (Floor 1 center-front)
    box(1.9, 0.42, 0.72, mat('#3B4B6B', 'sofa'), 0.0, 0.21, 2.5);
    box(1.9, 0.48, 0.18, mat('#25314B', 'sofa'), 0.0, 0.6, 2.8);
    box(0.76, 0.28, 0.48, woodM, 0.0, 0.14, 1.72);

    // Floor 1 Coffee Bar (Craft Wing inner wall)
    box(1.3, 0.92, 0.48, woodM, -3.0, 0.46, -0.55);
    box(0.34, 0.4, 0.28, trimM, -3.22, 1.12, -0.55);
    add(cyl(0.065, 0.055, 0.14, mat('#FFFFFF', 'kertas')), -2.78, 0.99, -0.5);

    // Floor 2 Mezzanine Mini Coffee Node & East Telemetry Console
    box(0.9, 0.88, 0.42, woodM, -8.1, MEZZANINE_Y + 0.44, -2.35);
    box(0.28, 0.34, 0.24, trimM, -8.15, MEZZANINE_Y + 1.05, -2.35);
    box(0.9, 0.88, 0.42, trimM, 7.9, MEZZANINE_Y + 0.44, -2.45);
    box(0.7, 0.36, 0.06, mat('#0EA5E9', 'layar', '#0EA5E9'), 7.9, MEZZANINE_Y + 1.12, -2.45);

    // Hanging Pendant Shades over Floor 1 & Floor 2
    for (const [x, y, z] of [
      [-5.6, 2.68, 0.9],
      [0.0, 2.68, 1.2],
      [5.5, 2.68, 0.9],
      [-4.8, 5.25, -2.2],
      [0.0, 5.25, -2.2],
      [4.8, 5.25, -2.2],
    ] as const) {
      box(0.02, 0.65, 0.02, trimM, x, y + 0.42, z);
      add(cone(0.28, 0.26, mat('#271B3F', 'lampu', '#FFB35C'), true), x, y, z);
    }

    // ---------- Style World Extension ----------
    const worldInfo =
      K.buildWorld?.({
        scene,
        kantor,
        kit: K,
        attach: (geom, m, x, y, z, parent = kantor) => {
          const mesh = new Mesh(geom, m);
          mesh.position.set(x, y, z);
          parent.add(mesh);
          return mesh;
        },
      }) ?? {};

    const heightOffset = worldInfo.heightOffset ?? 0;
    kantor.position.y = heightOffset;
    homeTarget.y += heightOffset;

    // ---------- 11 Portfolio Desks & Articulated 3D Agents (Floor 1 & Floor 2) ----------
    const legM = mat('#4B3B62', 'kaki');
    const chairM = mat('#3A2A5C', 'kursi');

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, 'rgba(18,12,28,0.68)');
      grad.addColorStop(0.55, 'rgba(18,12,28,0.28)');
      grad.addColorStop(1, 'rgba(18,12,28,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const contactShadowTex = new CanvasTexture(shadowCanvas);
    contactShadowTex.colorSpace = SRGBColorSpace;
    disposables.push(contactShadowTex);

    const deskShadowMat = trackMat(
      new MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    const deskShadowGeo = trackGeo(new PlaneGeometry(2.05, 1.7));
    const actorShadowGeo = trackGeo(new PlaneGeometry(1.16, 1.16));
    const floorRingGeo = trackGeo(new RingGeometry(0.45, 0.61, 28));
    const hitGeo = trackGeo(K.box(1.15, 2.0, 1.15, 'baju'));
    const hitMat = trackMat(
      new MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );

    const nightLightsEnabled = !isTouch && !isSoftwareGl;

    const actors: ActorRig[] = THE_AGENTS.map((agent, idx) => {
      const x = agent.deskX;
      const z = agent.deskZ;
      const baseY = agent.floor === 2 ? MEZZANINE_Y : 0;
      const isMassive = Boolean(agent.massive);

      const deskTop = box(
        1.36,
        0.08,
        0.74,
        mat('#C9A27C', 'meja', '#000000'),
        x,
        baseY + 0.78,
        z,
      );
      box(1.26, 0.7, 0.05, legM, x, baseY + 0.38, z - 0.31);
      box(0.06, 0.74, 0.64, woodM, x - 0.62, baseY + 0.38, z);
      box(0.06, 0.74, 0.64, woodM, x + 0.62, baseY + 0.38, z);

      // Monitor + Craft Side Display
      box(0.66, 0.44, 0.05, trimM, x - 0.05, baseY + 1.12, z - 0.21);
      const screen = box(
        0.58,
        0.35,
        0.015,
        mat('#1B1330', 'layar', '#000000'),
        x - 0.05,
        baseY + 1.12,
        z - 0.18,
      );
      box(0.08, 0.16, 0.08, trimM, x - 0.05, baseY + 0.9, z - 0.21);
      if (agent.room === 'craft') {
        box(0.34, 0.24, 0.04, trimM, x + 0.43, baseY + 1.02, z - 0.12).rotation.set(0, -0.5, 0);
      }

      // Keyboard pad, accent mug, notebook, lamp
      box(0.5, 0.02, 0.17, mat('#EFE9F6', 'kertas'), x - 0.05, baseY + 0.83, z + 0.08);
      add(
        cyl(0.055, 0.045, 0.11, mat(agent.colors.armorMid, 'pot')),
        x + 0.48,
        baseY + 0.88,
        z + 0.14,
      );
      const book = box(
        0.32,
        0.06,
        0.24,
        mat(agent.colors.auraColor, 'buku'),
        x + 0.3,
        baseY + 0.86,
        z + 0.11,
      );
      const lamp = add(
        ball(0.095, mat('#FFF3B0', 'lampu', '#FFCF4D')),
        x - 0.5,
        baseY + 1.1,
        z - 0.14,
      );
      box(0.04, 0.28, 0.04, trimM, x - 0.5, baseY + 0.96, z - 0.14);

      let light: PointLight | null = null;
      if (nightLightsEnabled) {
        light = new PointLight('#FFB35C', 3.6, 4.2, 2);
        light.position.set(x - 0.38, baseY + 1.48, z + 0.18);
        kantor.add(light);
      }

      // Chair
      box(0.54, 0.08, 0.54, chairM, x, baseY + 0.5, z + 0.72);
      box(0.54, 0.6, 0.08, chairM, x, baseY + 0.83, z + 0.99);
      box(0.06, 0.46, 0.06, legM, x, baseY + 0.25, z + 0.72);

      const shadowMesh = add(new Mesh(deskShadowGeo, deskShadowMat), x, baseY + 0.008, z + 0.28);
      shadowMesh.rotation.x = -Math.PI / 2;

      const contactShadowMat = trackMat(
        new MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        }),
      );
      const contactShadow = add(
        new Mesh(actorShadowGeo, contactShadowMat),
        x,
        baseY + 0.014,
        z + 0.7,
      );
      contactShadow.rotation.x = -Math.PI / 2;

      const floorRingMat = trackMat(
        new MeshBasicMaterial({
          color: agent.colors.auraColor,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      const floorRing = add(
        new Mesh(floorRingGeo, floorRingMat),
        x,
        baseY + 0.022,
        z + 0.7,
      );
      floorRing.rotation.x = -Math.PI / 2;

      // Composite Multi-Part Character Rig
      const root = new Group();
      const seat = new Vector3(x, baseY, z + 0.7);
      root.position.copy(seat);
      const scaleMult = isMassive ? 1.18 : 1.0;

      const armorMain = mat(agent.colors.armorMid, 'baju');
      const armorTrim = mat(agent.colors.armorLight, 'baju');
      const jointM = mat(agent.colors.jointMid, 'celana');
      const armorDeep = mat(agent.colors.armorDeep, 'celana');
      const chestBgMat = mat(agent.colors.chestBg, 'baju');
      const chestRimMat = mat(
        agent.colors.chestRim,
        'catatan',
        agent.colors.chestRim,
      );
      const glowingEyeAgents: AgentId[] = [
        'antislop',
        'uiux',
        'design-dna',
        'motion',
        'genjutsu',
        'threejs',
        'gsap',
      ];
      const hasGlowingEyes = glowingEyeAgents.includes(agent.id);
      const eyeMat = mat(
        agent.colors.eyeColor,
        hasGlowingEyes ? 'catatan' : 'rambut',
        hasGlowingEyes ? agent.colors.eyeColor : undefined,
      );

      // Torso + Chest Core Plate
      const body = add(
        new Mesh(K.capsule(0.23, 0.4, 'baju'), armorMain),
        0,
        0.92,
        0,
        root,
      );
      body.scale.set(
        K.agentScale.body * (isMassive ? 1.16 : 1.0),
        K.agentScale.body,
        K.agentScale.body * (isMassive ? 1.08 : 1.0),
      );

      box(0.28, 0.24, 0.08, chestBgMat, 0, 0.04, 0.21, body as unknown as Group);
      const chestRim = box(
        0.16,
        0.12,
        0.04,
        chestRimMat,
        0,
        0.04,
        0.24,
        body as unknown as Group,
      );

      if (isMassive) {
        box(0.22, 0.16, 0.26, armorTrim, -0.32, 0.18, 0, body as unknown as Group);
        box(0.22, 0.16, 0.26, armorTrim, 0.32, 0.18, 0, body as unknown as Group);
      }

      // Head + Distinctive Helmet Crest per Agent
      const head = add(ball(0.22, armorMain), 0, 1.44, 0, root);
      head.scale.setScalar(K.agentScale.head);

      box(0.08, 0.14, 0.12, armorTrim, -0.22, 0.06, 0, head as unknown as Group);
      box(0.08, 0.14, 0.12, armorTrim, 0.22, 0.06, 0, head as unknown as Group);

      if (agent.id === 'apple') {
        box(0.08, 0.13, 0.1, chestRimMat, 0.03, 0.24, 0, head as unknown as Group).rotation.z = -0.35;
      } else if (isMassive) {
        box(0.08, 0.14, 0.1, armorTrim, -0.14, 0.22, 0, head as unknown as Group);
        box(0.08, 0.14, 0.1, armorTrim, 0.14, 0.22, 0, head as unknown as Group);
      } else if (agent.id === 'design-dna') {
        add(ball(0.055, chestRimMat), -0.1, 0.26, 0, head as unknown as Group);
        add(ball(0.055, chestRimMat), 0.1, 0.26, 0, head as unknown as Group);
      } else if (agent.id === 'motion') {
        box(0.06, 0.12, 0.24, chestRimMat, 0, 0.23, -0.02, head as unknown as Group).rotation.x = -0.25;
      } else if (agent.id === 'genjutsu') {
        box(0.16, 0.09, 0.09, chestRimMat, 0, 0.24, 0.02, head as unknown as Group).rotation.z = Math.PI / 4;
      } else if (agent.id === 'threejs') {
        add(cone(0.11, 0.16, chestRimMat), 0, 0.27, 0, head as unknown as Group);
      } else if (agent.id === 'gsap') {
        box(0.22, 0.05, 0.1, chestRimMat, 0, 0.24, 0, head as unknown as Group);
      } else {
        box(0.14, 0.08, 0.12, armorTrim, 0, 0.22, 0, head as unknown as Group);
      }

      // Face visor + glowing/contrasting eyes
      box(0.32, 0.16, 0.06, armorDeep, 0, -0.01, 0.19, head as unknown as Group);
      if (agent.id === 'genjutsu') {
        box(0.05, 0.05, 0.04, eyeMat, -0.08, 0.0, 0.22, head as unknown as Group);
        box(0.05, 0.05, 0.04, eyeMat, 0.0, 0.02, 0.22, head as unknown as Group);
        box(0.05, 0.05, 0.04, eyeMat, 0.08, 0.0, 0.22, head as unknown as Group);
      } else {
        box(0.07, 0.06, 0.04, eyeMat, -0.075, 0.0, 0.22, head as unknown as Group);
        box(0.07, 0.06, 0.04, eyeMat, 0.075, 0.0, 0.22, head as unknown as Group);
      }

      const makeLimb = (
        r: number,
        len: number,
        limbMat: Material,
        px: number,
        py: number,
      ) => {
        const g = K.capsule(r, len, roleOf(limbMat));
        g.translate(0, -len / 2 - r / 2, 0);
        return add(new Mesh(g, limbMat), px, py, 0, root);
      };

      const armL = makeLimb(0.075, 0.34, jointM, -0.31, 1.14);
      const armR = makeLimb(0.075, 0.34, jointM, 0.31, 1.14);
      const legL = makeLimb(0.088, 0.38, armorDeep, -0.12, 0.62);
      const legR = makeLimb(0.088, 0.38, armorDeep, 0.12, 0.62);

      const hitMesh = new Mesh(hitGeo, hitMat);
      hitMesh.position.set(0, 1.0, 0);
      hitMesh.userData.agentId = agent.id;
      hitMesh.layers.set(1);
      root.add(hitMesh);

      root.scale.setScalar(scaleMult);
      kantor.add(root);

      return {
        id: agent.id,
        index: idx,
        floor: agent.floor,
        baseY,
        massive: isMassive,
        auraColor: agent.colors.auraColor,
        root,
        body,
        chestRim,
        head,
        armL,
        armR,
        legL,
        legR,
        screen,
        deskTop,
        book,
        lamp,
        light,
        floorRing,
        floorRingMat,
        contactShadow,
        contactShadowMat,
        seat,
        currentPos: seat.clone(),
        facingYaw: Math.PI,
        labelWorld: new Vector3(),
        phase: idx * 1.35 + agent.idlePhase,
        animBodyY: 0.92,
        animHeadX: 0,
        animHeadY: 0,
        animArmLX: -0.48,
        animArmLZ: 0.12,
        animArmRX: -0.48,
        animArmRZ: -0.12,
        animLegLX: -1.35,
        animLegRX: -1.35,
        animChestGlow: 0.55,
        animRingOpacity: 0,
        animRingScale: 1,
      };
    });

    // ---------- Subtle GPU Desktop-Only Selective Bloom (Off on Mobile/Touch) ----------
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let useComposer = false;
    if (!isSoftwareGl && !isTouch) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new Vector2(el.clientWidth || 1, el.clientHeight || 1),
        isHolo ? 0.12 : 0.08,
        0.18,
        0.96,
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // ---------- Responsive Orthographic Camera ----------
    let isPortrait = false;
    const fitViewport = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      useComposer = Boolean(composer && w >= 768 && !reduceMotion);
      if (composer && useComposer) {
        composer.setSize(w, h);
        bloomPass?.resolution.set(w, h);
      }
      const aspect = w / h;
      isPortrait = aspect < 0.85;
      let halfW = (isPortrait ? 6.5 : 8.5) * (worldInfo.widthScale ?? 1);
      let halfH = halfW / aspect;
      const minH = (isPortrait ? 4.3 : 5.3) * (worldInfo.widthScale ?? 1);
      if (halfH < minH) {
        halfH = minH;
        halfW = halfH * aspect;
      }
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    };
    fitViewport();
    const ro = new ResizeObserver(fitViewport);
    ro.observe(el);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ---------- GSAP Camera Choreography & Interactive Orbit Drag ----------
    ensureGsapRegistered();
    const baseZoom = 1.0 * (worldInfo.zoomFarScale ?? 1);
    const cameraRig = {
      lookX: homeTarget.x,
      lookY: homeTarget.y,
      lookZ: homeTarget.z,
      zoom: reduceMotion ? baseZoom : baseZoom * 0.9,
      azimuth: reduceMotion ? 0 : -0.22,
      elevationY: reduceMotion ? 14.2 : 15.8,
      dragYaw: 0,
      dragPitchY: 0,
    };

    const currentLook = homeTarget.clone();
    let activeCamTween: gsap.core.Tween | null = null;
    let isPointerDown = false;
    let didDragOrbit = false;
    let suppressNextClick = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let prevDragX = 0;
    let prevDragY = 0;

    const animateCameraPreset = (isInitialMount = false) => {
      const {
        selectedAgentId: selIdNow,
        boardSelected: isBoardSelNow,
        boardAgentIds: activeBoardNow,
      } = liveRef.current;

      let toLookX = homeTarget.x;
      let toLookY = homeTarget.y;
      let toLookZ = homeTarget.z;
      let toZoom = baseZoom;
      let toAzimuth = 0;
      let toElevationY = 14.2;
      let duration = isInitialMount ? 1.15 : 0.85;
      let ease = 'power3.out';

      const focusedActor = selIdNow ? actors.find((a) => a.id === selIdNow) : undefined;
      if (focusedActor) {
        toLookX = MathUtils.lerp(homeTarget.x, focusedActor.currentPos.x, 0.62);
        toLookY = MathUtils.lerp(homeTarget.y, focusedActor.baseY + 1.15 + heightOffset, 0.72);
        toLookZ = MathUtils.lerp(homeTarget.z, focusedActor.currentPos.z, 0.5);
        toZoom = (isPortrait ? 1.24 : 1.22) * (worldInfo.zoomFarScale ?? 1);
        toAzimuth = MathUtils.clamp(-focusedActor.currentPos.x * 0.025, -0.18, 0.18);
        toElevationY = 13.0;
        duration = 0.85;
        ease = 'power3.inOut';
      } else if (isBoardSelNow) {
        toLookX = BOARD_POS.x;
        toLookY = 1.45 + heightOffset;
        toLookZ = -0.35;
        toZoom = (isPortrait ? 1.2 : 1.24) * (worldInfo.zoomFarScale ?? 1);
        toAzimuth = -0.1;
        toElevationY = 12.6;
        duration = 0.9;
        ease = 'power3.inOut';
      } else if (activeBoardNow.length > 0 && !isInitialMount) {
        toLookX = BOARD_POS.x;
        toLookY = homeTarget.y + 0.12;
        toLookZ = -0.35;
        toZoom = (isPortrait ? 1.04 : 1.06) * (worldInfo.zoomFarScale ?? 1);
        toAzimuth = -0.06;
        toElevationY = 13.6;
        duration = 0.95;
        ease = 'power2.inOut';
      }

      activeCamTween?.kill();
      if (reduceMotion) {
        gsap.set(cameraRig, {
          lookX: toLookX,
          lookY: toLookY,
          lookZ: toLookZ,
          zoom: toZoom,
          azimuth: toAzimuth,
          elevationY: toElevationY,
          dragYaw: 0,
          dragPitchY: 0,
        });
        renderOnceRef.current?.();
        return;
      }

      activeCamTween = gsap.to(cameraRig, {
        lookX: toLookX,
        lookY: toLookY,
        lookZ: toLookZ,
        zoom: toZoom,
        azimuth: toAzimuth,
        elevationY: toElevationY,
        dragYaw: 0,
        dragPitchY: 0,
        duration,
        ease,
        overwrite: 'auto',
      });
    };

    cameraTransitionRef.current = () => animateCameraPreset(false);
    animateCameraPreset(true);

    // ---------- Raycasting & Gentle Orbit Pointer Interaction ----------
    _raycaster.layers.set(1);
    let lastRaycastAt = 0;
    let isBoardHovered = false;

    const pickHitTarget = (clientX: number, clientY: number): {
      agentId: AgentId | null;
      isBoard: boolean;
    } => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return {agentId: null, isBoard: false};
      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(kantor.children, true);
      for (const hit of hits) {
        const aId = hit.object.userData.agentId as AgentId | undefined;
        if (aId) return {agentId: aId, isBoard: false};
        if (hit.object.userData.boardHit) return {agentId: null, isBoard: true};
      }
      return {agentId: null, isBoard: false};
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      isPointerDown = true;
      didDragOrbit = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      prevDragX = e.clientX;
      prevDragY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown) {
        const movedFromStart = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
        if (movedFromStart > 6) {
          didDragOrbit = true;
          activeCamTween?.kill();
          const dx = e.clientX - prevDragX;
          const dy = e.clientY - prevDragY;
          cameraRig.dragYaw = MathUtils.clamp(cameraRig.dragYaw - dx * 0.0045, -0.48, 0.48);
          cameraRig.dragPitchY = MathUtils.clamp(cameraRig.dragPitchY + dy * 0.014, -2.4, 3.6);
          renderer.domElement.style.cursor = 'grabbing';
        }
        prevDragX = e.clientX;
        prevDragY = e.clientY;
        return;
      }

      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - lastRaycastAt < 45) return;
      lastRaycastAt = now;

      const {agentId, isBoard} = pickHitTarget(e.clientX, e.clientY);
      isBoardHovered = isBoard;
      renderer.domElement.style.cursor = agentId || isBoard ? 'pointer' : 'grab';
      if (agentId !== liveRef.current.hoveredAgentId) {
        liveRef.current.onHoverAgent(agentId);
      }
    };

    const handlePointerUp = () => {
      if (didDragOrbit) {
        suppressNextClick = true;
        window.setTimeout(() => {
          suppressNextClick = false;
        }, 0);
      }
      isPointerDown = false;
      didDragOrbit = false;
      renderer.domElement.style.cursor = 'grab';
    };

    const handlePointerLeave = () => {
      isPointerDown = false;
      didDragOrbit = false;
      isBoardHovered = false;
      renderer.domElement.style.cursor = 'default';
      if (liveRef.current.hoveredAgentId !== null) {
        liveRef.current.onHoverAgent(null);
      }
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      const {agentId, isBoard} = pickHitTarget(e.clientX, e.clientY);
      if (agentId) {
        liveRef.current.onSelectAgent(agentId);
      } else if (isBoard) {
        liveRef.current.onSelectBoard();
      }
    };

    const handleDoubleClick = () => {
      if (reduceMotion) {
        cameraRig.dragYaw = 0;
        cameraRig.dragPitchY = 0;
        renderOnceRef.current?.();
        return;
      }
      gsap.to(cameraRig, {
        dragYaw: 0,
        dragPitchY: 0,
        duration: 0.65,
        ease: 'power3.out',
      });
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    let lastSpotPush = 0;

    const placeDomNode = (node: HTMLElement | null | undefined, worldPos: Vector3) => {
      if (!node) return;
      _proj.copy(worldPos).project(camera);
      const sx = ((_proj.x + 1) / 2) * el.clientWidth;
      const sy = ((1 - _proj.y) / 2) * el.clientHeight;
      node.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      const flip = sy < 145 ? 'down' : 'up';
      if (node.dataset.flipY !== flip) {
        node.dataset.flipY = flip;
      }
    };

    const updateFrame = (tSec: number, dtSec: number) => {
      const {
        agentStates: liveAgentStates,
        boardAgentIds: activeBoardIds,
        boardSelected: isBoardSelNow,
        hoveredAgentId: hoverId,
        selectedAgentId: selId,
        pulseProgressMap: pulseMap,
      } = liveRef.current;

      worldInfo.onTick?.(reduceMotion ? 0 : tSec, dtSec);

      const focusedActor = selId ? actors.find((a) => a.id === selId) : undefined;
      if (focusedActor && !activeCamTween?.isActive() && !isPointerDown) {
        const followX = MathUtils.lerp(homeTarget.x, focusedActor.root.position.x, 0.62);
        const followY = MathUtils.lerp(homeTarget.y, focusedActor.baseY + 1.15 + heightOffset, 0.72);
        const followZ = MathUtils.lerp(homeTarget.z, focusedActor.root.position.z, 0.5);
        const followLambda = reduceMotion ? 1 : 4.5;
        cameraRig.lookX = MathUtils.damp(cameraRig.lookX, followX, followLambda, dtSec);
        cameraRig.lookY = MathUtils.damp(cameraRig.lookY, followY, followLambda, dtSec);
        cameraRig.lookZ = MathUtils.damp(cameraRig.lookZ, followZ, followLambda, dtSec);
      }

      currentLook.set(cameraRig.lookX, cameraRig.lookY, cameraRig.lookZ);

      const swing =
        reduceMotion || isPointerDown
          ? 0
          : (isPortrait ? 0.055 : 0.095) * Math.sin(tSec * 0.22);
      const angle =
        (isPortrait ? 1.04 : Math.PI / 4) +
        cameraRig.azimuth +
        cameraRig.dragYaw +
        swing;
      const elevY = MathUtils.clamp(cameraRig.elevationY + cameraRig.dragPitchY, 9.5, 19.5);
      camera.position.set(
        currentLook.x + 19 * Math.sin(angle),
        currentLook.y + elevY,
        currentLook.z + 19 * Math.cos(angle),
      );
      camera.lookAt(currentLook);
      if (Math.abs(camera.zoom - cameraRig.zoom) > 0.0005) {
        camera.zoom = cameraRig.zoom;
        camera.updateProjectionMatrix();
      }

      const boardGlowBoost = isBoardHovered || isBoardSelNow ? 0.38 : 0;
      boardNotes.forEach((note, idx) => {
        const noteMat = note.material as MeshStandardMaterial;
        if (!('emissiveIntensity' in noteMat)) return;
        const targetGlow =
          (activeBoardIds.length > 0 && !reduceMotion
            ? 0.72 + 0.35 * (0.5 + 0.5 * Math.sin(tSec * 4.2 + idx * 0.9))
            : 0.72) + boardGlowBoost;
        noteMat.emissiveIntensity = reduceMotion
          ? targetGlow
          : MathUtils.damp(noteMat.emissiveIntensity, targetGlow, 10, dtSec);
      });

      const focusAnchorIdx = actors.findIndex((a) => a.id === (hoverId ?? selId));
      const nextSpots: Partial<Record<AgentId, IdleSpot>> = {};
      const boardBusy = activeBoardIds.length > 0;

      for (const actor of actors) {
        const spec = THE_AGENTS[actor.index]!;
        const pulseProg = pulseMap[actor.id];
        const isPulsing = pulseProg !== undefined;
        const isHovered = hoverId === actor.id;
        const isSelected = selId === actor.id;
        const isFocused = isHovered || isSelected;
        const isDispatchedToBoard = activeBoardIds.includes(actor.id);
        const liveStatus = liveAgentStates[actor.id] ?? 'idle';
        const act: AgentActivityKind =
          liveStatus === 'idle'
            ? 'siaga'
            : spec.activity === 'siaga'
              ? 'kerja'
              : spec.activity;

        const sm = actor.screen.material as MeshStandardMaterial;
        const busy = act === 'kerja' || act === 'laporan';
        sm.emissive.set(
          isPulsing || isFocused
            ? actor.auraColor
            : busy
              ? act === 'laporan'
                ? '#7BDFF2'
                : '#66E3A5'
              : act === 'belajar'
                ? '#FFD166'
                : '#5B4A92',
        );
        sm.emissiveIntensity =
          isPulsing || isFocused
            ? 0.92
            : busy
              ? 0.65 + (reduceMotion ? 0 : 0.14 * Math.sin(tSec * 8 + actor.phase))
              : 0.48;

        const targetRingOpacity = isPulsing
          ? 0.84 * Math.sin(pulseProg * Math.PI)
          : isFocused
            ? 0.62
            : 0;
        const targetRingScale = isPulsing
          ? 1 + pulseProg * 0.85
          : isHovered
            ? 1.14
            : isSelected
              ? 1.06
              : 0.92;
        actor.animRingOpacity = reduceMotion
          ? targetRingOpacity
          : MathUtils.damp(actor.animRingOpacity, targetRingOpacity, 14, dtSec);
        actor.animRingScale = reduceMotion
          ? targetRingScale
          : MathUtils.damp(actor.animRingScale, targetRingScale, 12, dtSec);

        actor.floorRing.position.set(
          actor.root.position.x,
          actor.baseY + 0.022,
          actor.root.position.z,
        );
        actor.floorRing.scale.setScalar(actor.animRingScale);
        actor.floorRingMat.opacity = actor.animRingOpacity;

        const dm = actor.deskTop.material as MeshStandardMaterial;
        if (isPulsing || isSelected) {
          dm.emissive.set(actor.auraColor);
          dm.emissiveIntensity = isPulsing
            ? 0.48 * Math.sin(pulseProg * Math.PI)
            : 0.2;
        } else {
          dm.emissiveIntensity = 0;
        }

        actor.book.visible = act === 'belajar';
        const lampOn = true;
        actor.lamp.visible = lampOn;
        if (actor.light) {
          actor.light.intensity = isFocused ? 5.2 : 3.2;
        }

        // Smooth continuous floor-aware locomotion to Mission Board, idle spots, or desk
        let desiredSpot: IdleSpot = 'meja';
        if (isDispatchedToBoard) {
          desiredSpot = 'papan';
        } else if (act === 'siaga' && !reduceMotion && !isFocused && !isPulsing) {
          desiredSpot = computeIdleSpot(actor.index, tSec).spot;
        }

        if (actor.floor === 1) {
          const slotIdx = actor.index % FLOOR1_BOARD_SLOTS.length;
          const boardSlot = FLOOR1_BOARD_SLOTS[slotIdx]!;
          const slotOffset = (actor.index % 3) - 1;
          if (desiredSpot === 'papan') {
            _dest.set(boardSlot[0], 0, boardSlot[1]);
          } else if (desiredSpot === 'kopi') {
            _dest.set(-3.05 + slotOffset * 0.42, 0, 0.25);
          } else if (desiredSpot === 'sofa') {
            _dest.set(0.0 + slotOffset * 0.58, 0, 2.38);
          } else {
            _dest.copy(actor.seat);
          }
        } else {
          // Floor 2 mezzanine promenade spots (never walks off balcony edge)
          const upperIdx = actor.index - 6;
          if (desiredSpot === 'papan') {
            _dest.set(-2.4 + upperIdx * 1.2, MEZZANINE_Y, -1.24);
          } else if (desiredSpot === 'kopi') {
            _dest.set(-7.35 + (upperIdx % 2) * 0.55, MEZZANINE_Y, -1.45);
          } else if (desiredSpot === 'sofa') {
            _dest.set(7.2 - (upperIdx % 2) * 0.55, MEZZANINE_Y, -1.45);
          } else {
            _dest.copy(actor.seat);
          }
        }

        const floorCorridorZ = actor.floor === 1 ? FLOOR1_CORRIDOR_Z : FLOOR2_CORRIDOR_Z;

        let walking = false;
        if (isPulsing || isFocused) {
          walking = false;
        } else if (reduceMotion) {
          actor.currentPos.copy(_dest);
          walking = false;
        } else {
          walking = stepCorridorWalk(
            actor.currentPos,
            _dest,
            floorCorridorZ,
            WALK_SPEED * dtSec,
            _ahead,
          );
        }

        const distFromDesk = Math.hypot(
          actor.currentPos.x - actor.seat.x,
          actor.currentPos.z - actor.seat.z,
        );
        const arrivedAtDest =
          Math.hypot(actor.currentPos.x - _dest.x, actor.currentPos.z - _dest.z) <= 0.08;
        const atBoard = desiredSpot === 'papan' && arrivedAtDest && !walking;
        const atSofa = actor.floor === 1 && desiredSpot === 'sofa' && arrivedAtDest && !walking;
        const atDesk = distFromDesk <= 0.15 && !walking && !isPulsing;
        const sitting = atDesk || atSofa;

        const reportedSpot: IdleSpot = atBoard
          ? 'papan'
          : desiredSpot === 'papan'
            ? 'meja'
            : distFromDesk <= 0.15
              ? 'meja'
              : desiredSpot;
        nextSpots[actor.id] = reportedSpot;

        actor.root.position.copy(actor.currentPos);

        let targetYaw = Math.PI;
        if (walking) {
          const dx = _ahead.x - actor.currentPos.x;
          const dz = _ahead.z - actor.currentPos.z;
          if (dx * dx + dz * dz > 1e-6) {
            targetYaw = Math.atan2(dx, dz);
          }
        } else if (isPulsing || isFocused) {
          targetYaw = Math.PI * 0.16;
        } else if (atBoard) {
          if (actor.floor === 2) {
            targetYaw = Math.atan2(
              BOARD_POS.x - actor.currentPos.x,
              BOARD_POS.z + 0.5 - actor.currentPos.z,
            );
          } else {
            targetYaw = Math.atan2(
              BOARD_POS.x - actor.currentPos.x,
              BOARD_POS.z - actor.currentPos.z,
            );
          }
        } else if (atSofa) {
          targetYaw = 0;
        } else {
          targetYaw = Math.PI;
        }

        actor.facingYaw = reduceMotion
          ? targetYaw
          : dampAngle(actor.facingYaw, targetYaw, 9.5, dtSec);
        actor.root.rotation.set(0, actor.facingYaw, 0);

        const pulseHop = isPulsing ? Math.sin(pulseProg * Math.PI) * 0.28 : 0;
        actor.root.position.y = actor.baseY + (atSofa ? -0.05 : 0) + pulseHop;

        actor.contactShadow.position.set(
          actor.currentPos.x,
          actor.baseY + 0.014,
          actor.currentPos.z,
        );
        const shadowScale = (actor.massive ? 1.18 : 1.0) * (1 - pulseHop * 0.45);
        actor.contactShadow.scale.set(shadowScale, shadowScale, 1);
        actor.contactShadowMat.opacity = Math.max(0.16, 0.42 - pulseHop * 0.45);

        const headHeightBonus =
          0.22 * (K.agentScale.head - 1) + (actor.massive ? 0.28 : 0);
        actor.labelWorld.set(
          actor.currentPos.x,
          actor.baseY + (!sitting ? 1.98 : 1.8) + headHeightBonus + pulseHop,
          actor.currentPos.z,
        );

        if (reduceMotion) continue;

        const stride = Math.sin(tSec * 9.5 + actor.phase);

        let neighborLookYaw = 0;
        if (
          focusAnchorIdx !== -1 &&
          focusAnchorIdx !== actor.index &&
          Math.abs(focusAnchorIdx - actor.index) <= 2
        ) {
          neighborLookYaw = focusAnchorIdx > actor.index ? -0.26 : 0.26;
        }

        let tBodyY = 0.92;
        let tHeadX = 0;
        let tHeadY = neighborLookYaw;
        let tArmLX = -0.48;
        let tArmLZ = 0.12;
        let tArmRX = -0.48;
        let tArmRZ = -0.12;
        let tLegLX = -1.35;
        let tLegRX = -1.35;
        let tChestGlow = isHovered ? 0.95 : isSelected ? 0.82 : 0.5;

        if (isPulsing) {
          const wave = Math.sin(pulseProg * Math.PI * 4);
          actor.legL.position.y = actor.legR.position.y = 0.62;
          actor.head.position.y = 1.48;
          actor.armL.position.y = actor.armR.position.y = 1.16;
          tBodyY = 0.96;
          tLegLX = 0;
          tLegRX = 0;
          tArmLX = 0;
          tArmLZ = 0.2 + wave * 0.25;
          tArmRX = -2.5 + wave * 0.35;
          tArmRZ = -0.25;
          tHeadX = -0.08;
          tHeadY = Math.sin(pulseProg * Math.PI * 2) * 0.25;
          tChestGlow = 1.2;
        } else if (!sitting) {
          const bob = walking ? 0.032 * Math.abs(stride) : 0.01 * Math.sin(tSec * 2.2 + actor.phase);
          tBodyY = 0.96 + bob;
          actor.head.position.y = 1.48 + bob;
          actor.armL.position.y = actor.armR.position.y = 1.16 + bob;
          actor.legL.position.y = actor.legR.position.y = 0.68;
          tLegLX = walking ? 0.56 * stride : 0;
          tLegRX = walking ? -0.56 * stride : 0;

          if (walking) {
            tArmLX = -0.5 * stride;
            tArmLZ = 0.08;
            tArmRX = 0.5 * stride;
            tArmRZ = -0.08;
            tHeadX = 0;
            tHeadY = neighborLookYaw;
          } else if (atBoard) {
            const inspectWave = Math.sin(tSec * 3.1 + actor.phase);
            tArmLX = -0.32;
            tArmLZ = 0.12;
            tArmRX = boardBusy ? -0.95 + 0.2 * inspectWave : -0.55 + 0.12 * inspectWave;
            tArmRZ = -0.14;
            tHeadX = actor.floor === 2 ? 0.24 : -0.18 + 0.05 * Math.sin(tSec * 2.0 + actor.phase);
            tHeadY = neighborLookYaw + 0.16 * Math.sin(tSec * 1.1 + actor.phase);
          } else {
            tArmLX = -0.18;
            tArmLZ = 0.08;
            tArmRX = -0.18;
            tArmRZ = -0.08;
            tHeadX = -0.12;
            tHeadY = neighborLookYaw;
          }
        } else {
          actor.legL.position.y = actor.legR.position.y = 0.62;
          tLegLX = -1.35;
          tLegRX = -1.35;
          tBodyY = 0.92;
          actor.head.position.y = 1.44;
          actor.armL.position.y = actor.armR.position.y = 1.14;

          if (isHovered) {
            tArmLX = -0.4;
            tArmLZ = 0.14;
            tArmRX = -2.35 + Math.sin(tSec * 10) * 0.32;
            tArmRZ = -0.24;
            tBodyY = 0.94 + Math.sin(tSec * 6) * 0.015;
            tHeadX = -0.08;
            tHeadY = Math.sin(tSec * 3) * 0.14;
          } else if (busy) {
            tArmLX = -1.12 + 0.12 * Math.sin(tSec * 15 + actor.phase);
            tArmLZ = 0.1;
            tArmRX = -1.12 + 0.12 * Math.sin(tSec * 15 + actor.phase + 2);
            tArmRZ = -0.1;
            tBodyY = 0.92 + 0.012 * Math.abs(stride);
            tHeadX = 0.08 + 0.04 * Math.sin(tSec * 3 + actor.phase);
            tHeadY = neighborLookYaw + 0.08 * Math.sin(tSec * 1.3 + actor.phase);
          } else if (act === 'belajar') {
            tArmLX = -0.88;
            tArmLZ = 0.18;
            tArmRX = -0.88 + 0.18 * Math.max(0, Math.sin(tSec * 0.8 + actor.phase));
            tArmRZ = -0.18;
            tHeadX = 0.34 + 0.04 * Math.sin(tSec * 1.2 + actor.phase);
            tHeadY = neighborLookYaw + 0.28;
          } else {
            tArmLX = -0.48;
            tArmLZ = 0.12;
            tArmRX = -0.48;
            tArmRZ = -0.12;
            tBodyY = 0.92 + 0.012 * Math.sin(tSec * 1.6 + actor.phase);
            tHeadX = 0;
            tHeadY = neighborLookYaw + 0.45 * Math.sin(tSec * 0.42 + actor.phase);
          }
        }

        const poseLambda = 13.5;
        actor.animBodyY = MathUtils.damp(actor.animBodyY, tBodyY, poseLambda, dtSec);
        actor.animHeadX = MathUtils.damp(actor.animHeadX, tHeadX, poseLambda, dtSec);
        actor.animHeadY = MathUtils.damp(actor.animHeadY, tHeadY, poseLambda, dtSec);
        actor.animArmLX = MathUtils.damp(actor.animArmLX, tArmLX, poseLambda, dtSec);
        actor.animArmLZ = MathUtils.damp(actor.animArmLZ, tArmLZ, poseLambda, dtSec);
        actor.animArmRX = MathUtils.damp(actor.animArmRX, tArmRX, poseLambda, dtSec);
        actor.animArmRZ = MathUtils.damp(actor.animArmRZ, tArmRZ, poseLambda, dtSec);
        actor.animLegLX = MathUtils.damp(actor.animLegLX, tLegLX, poseLambda, dtSec);
        actor.animLegRX = MathUtils.damp(actor.animLegRX, tLegRX, poseLambda, dtSec);
        actor.animChestGlow = MathUtils.damp(actor.animChestGlow, tChestGlow, 11, dtSec);

        actor.body.position.y = actor.animBodyY;
        actor.head.rotation.set(actor.animHeadX, actor.animHeadY, 0);
        actor.armL.rotation.set(actor.animArmLX, 0, actor.animArmLZ);
        actor.armR.rotation.set(actor.animArmRX, 0, actor.animArmRZ);
        actor.legL.rotation.set(actor.animLegLX, 0, 0);
        actor.legR.rotation.set(actor.animLegRX, 0, 0);

        const coreMat = actor.chestRim.material as MeshStandardMaterial;
        if ('emissiveIntensity' in coreMat) {
          coreMat.emissiveIntensity = actor.animChestGlow;
        }
      }

      if (tSec - lastSpotPush > 0.25) {
        lastSpotPush = tSec;
        spotCallbackRef.current?.(nextSpots);
      }

      if (useComposer && composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      const anchors = anchorsRef.current;
      if (anchors) {
        for (const actor of actors) {
          _labelAt.set(
            actor.labelWorld.x,
            actor.labelWorld.y + heightOffset,
            actor.labelWorld.z,
          );
          placeDomNode(anchors.get(actor.id), _labelAt);
        }
      }
      _boardAt.set(BOARD_POS.x, 2.34 + heightOffset, BOARD_POS.z + 0.06);
      placeDomNode(boardAnchorRef.current, _boardAt);
    };

    // ---------- Software-WebGL Paced Animation Loop ----------
    let frameId = 0;
    let running = true;
    let isVisible = true;
    const startMs = performance.now();
    let prevNow = startMs;

    function afterDraw(cb: () => void) {
      if (!running) return;
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (!running) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (status === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
          return;
        }
      } catch {
        // Ignore if sync primitives unavailable
      }
      frameId = window.setTimeout(cb, 80);
    }

    const tick = () => {
      frameId = 0;
      if (!running || !isVisible || document.hidden) return;
      const now = performance.now();
      const dtSec = Math.min(0.1, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;
      updateFrame((now - startMs) / 1000, dtSec);

      if (reduceMotion) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (!running || frameId || !isVisible || document.hidden) return;
      if (reduceMotion) {
        updateFrame(0, 0.016);
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting);
      if (isVisible) kick();
    });
    io.observe(el);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        prevNow = performance.now();
        kick();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      running = false;
      liveRef.current.onWebGLUnavailable();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    renderOnceRef.current = () => {
      if (running && reduceMotion) {
        updateFrame(0, 0.016);
      }
    };

    updateFrame(0, 0.016);
    kick();

    return () => {
      running = false;
      renderOnceRef.current = null;
      cameraTransitionRef.current = null;
      activeCamTween?.kill();
      gsap.killTweensOf(cameraRig);
      if (frameId) {
        cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
      }
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      for (const d of disposables) {
        d.dispose();
      }
      K.dispose();
      composer?.dispose();
      envTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [gaya, anchorsRef, boardAnchorRef, spotCallbackRef]);

  return (
    <div
      ref={hostRef}
      className="relative w-full h-full overflow-hidden select-none"
    />
  );
}
