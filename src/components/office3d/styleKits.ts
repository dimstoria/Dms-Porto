import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  type Material,
  type Mesh,
  type Scene,
  type Texture,
} from 'three';

export type GayaId = 'hologram' | 'pecellele';

export interface GayaOption {
  id: GayaId;
  nama: string;
  ket: string;
}

export const GAYA_OPTIONS: GayaOption[] = [
  {id: 'hologram', nama: 'Hologram', ket: 'Blueprint cyan dua tingkat & partikel data'},
  {
    id: 'pecellele',
    nama: 'Pecel Lele',
    ket: 'Tenda terpal, spanduk lukis, bangku plastik & neon malam',
  },
];

export type ObjectRole =
  | 'alas'
  | 'lantai'
  | 'karpet'
  | 'garis'
  | 'dinding'
  | 'kaca'
  | 'bingkai'
  | 'kayu'
  | 'papan'
  | 'catatan'
  | 'meja'
  | 'kaki'
  | 'kursi'
  | 'layar'
  | 'kertas'
  | 'buku'
  | 'pot'
  | 'daun'
  | 'batang'
  | 'tanah'
  | 'batu'
  | 'awan'
  | 'sofa'
  | 'lampu'
  | 'baju'
  | 'celana'
  | 'kulit'
  | 'rambut'
  | 'logam';

export interface StyleWorldContext {
  scene: Scene;
  kantor: Group;
  kit: StyleKit;
  attach: (g: BufferGeometry, m: Material, x: number, y: number, z: number, parent?: Group) => Mesh;
}

export interface StyleWorldResult {
  replaceOutside?: boolean;
  heightOffset?: number;
  widthScale?: number;
  zoomFarScale?: number;
  onTick?: (tSec: number, dtSec: number) => void;
}

export interface StyleKit {
  id: GayaId;
  alwaysNight?: boolean;
  colorMap: (hex: string, role: ObjectRole) => string;
  material: (hex: string, role: ObjectRole, emissive?: string) => Material;
  box: (w: number, h: number, d: number, role: ObjectRole) => BufferGeometry;
  sphere: (r: number, role: ObjectRole, dome?: boolean) => BufferGeometry;
  cylinder: (rt: number, rb: number, h: number, role: ObjectRole) => BufferGeometry;
  cone: (r: number, h: number, role: ObjectRole, open?: boolean) => BufferGeometry;
  capsule: (r: number, len: number, role: ObjectRole) => BufferGeometry;
  decorate?: (mesh: Mesh, role: ObjectRole) => void;
  agentScale: {head: number; body: number};
  outside: {shape: 'box' | 'round'; size: number; clouds?: boolean; baseColor?: string};
  lighting: {sky: string; ground: string; hemiIntensity: number; sun: string; sunIntensity: number};
  envIntensity: [number, number];
  fog: [string, string] | null;
  buildWorld?: (ctx: StyleWorldContext) => StyleWorldResult;
  track: <T extends {dispose(): void}>(resource: T) => T;
  dispose: () => void;
}

function createResourceTracker() {
  const pool: {dispose(): void}[] = [];
  return {
    track<T extends {dispose(): void}>(res: T): T {
      pool.push(res);
      return res;
    },
    disposeAll() {
      for (let i = pool.length - 1; i >= 0; i--) {
        pool[i]?.dispose();
      }
      pool.length = 0;
    },
  };
}

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function makeCanvasTexture(
  track: <T extends {dispose(): void}>(r: T) => T,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: {srgb?: boolean; maxAnisotropy?: number} = {},
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, w, h);
  }
  const tex = track(new CanvasTexture(canvas));
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  if (opts.srgb) tex.colorSpace = SRGBColorSpace;
  if (opts.maxAnisotropy && opts.maxAnisotropy > 1) {
    tex.anisotropy = opts.maxAnisotropy;
  }
  return tex;
}

function applyShadowFlags(mesh: Mesh, role: ObjectRole): void {
  if (role === 'awan' || role === 'garis') {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return;
  }
  if (role === 'lantai' || role === 'karpet' || role === 'tanah' || role === 'alas') {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }
  if (role === 'kaca' || role === 'lampu' || role === 'layar' || role === 'catatan') {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

function makeRolePBRMaterial(
  hex: string,
  role: ObjectRole,
  opts: {
    map?: Texture | null;
    roughnessMap?: Texture | null;
    bumpMap?: Texture | null;
    bumpScale?: number;
    emissive?: string;
    emissiveIntensity?: number;
  } = {},
): Material {
  const {
    map = null,
    roughnessMap = null,
    bumpMap = null,
    bumpScale = 0.015,
    emissive,
    emissiveIntensity,
  } = opts;

  if (role === 'kaca') {
    return new MeshPhysicalMaterial({
      color: hex,
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      ior: 1.5,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      emissive: emissive ? new Color(emissive) : new Color('#000000'),
      emissiveIntensity: emissiveIntensity ?? 0.25,
    });
  }

  if (role === 'logam' || role === 'bingkai' || role === 'kaki') {
    return new MeshPhysicalMaterial({
      color: hex,
      map,
      roughness: role === 'logam' ? 0.22 : 0.34,
      metalness: role === 'logam' ? 0.86 : 0.68,
      clearcoat: 0.22,
      clearcoatRoughness: 0.2,
      anisotropy: role === 'logam' ? 0.65 : 0,
    });
  }

  if (role === 'baju') {
    return new MeshPhysicalMaterial({
      color: hex,
      map,
      roughness: 0.34,
      metalness: 0.26,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18,
    });
  }

  if (role === 'pot') {
    return new MeshPhysicalMaterial({
      color: hex,
      map,
      roughness: 0.26,
      metalness: 0.04,
      clearcoat: 0.82,
      clearcoatRoughness: 0.14,
    });
  }

  if (role === 'karpet' || role === 'sofa' || role === 'kursi') {
    return new MeshPhysicalMaterial({
      color: hex,
      map,
      roughness: 0.9,
      metalness: 0.0,
      sheen: 0.65,
      sheenRoughness: 0.62,
      sheenColor: new Color(hex).lerp(new Color('#FFFFFF'), 0.35),
      bumpMap,
      bumpScale: bumpMap ? bumpScale * 0.7 : 0,
    });
  }

  if (role === 'layar' || role === 'lampu' || role === 'catatan') {
    return new MeshStandardMaterial({
      color: hex,
      map,
      roughness: role === 'layar' ? 0.24 : 0.38,
      metalness: role === 'layar' ? 0.12 : 0.02,
      emissive: emissive ? new Color(emissive) : new Color('#000000'),
      emissiveIntensity: emissiveIntensity ?? 0.7,
    });
  }

  const roughnessByRole: Partial<Record<ObjectRole, number>> = {
    meja: 0.56,
    kayu: 0.62,
    lantai: 0.66,
    garis: 0.74,
    alas: 0.82,
    dinding: 0.91,
    papan: 0.88,
    tanah: 0.94,
    batu: 0.9,
    daun: 0.76,
    batang: 0.9,
    celana: 0.8,
    kulit: 0.68,
    rambut: 0.72,
    kertas: 0.88,
    buku: 0.64,
    awan: 0.95,
  };

  return new MeshStandardMaterial({
    color: hex,
    map,
    roughnessMap,
    roughness: roughnessByRole[role] ?? 0.72,
    metalness: role === 'celana' ? 0.1 : 0.02,
    bumpMap,
    bumpScale: bumpMap ? bumpScale : 0,
    emissive: emissive ? new Color(emissive) : new Color('#000000'),
    emissiveIntensity: emissiveIntensity ?? (emissive ? 0.35 : 0),
  });
}

interface KitPartial {
  alwaysNight?: boolean;
  colorMap?: (hex: string, role: ObjectRole) => string;
  material?: (mappedHex: string, role: ObjectRole, emissive?: string) => Material;
  decorate?: (mesh: Mesh, role: ObjectRole) => void;
  agentScale?: Partial<{head: number; body: number}>;
  outside?: Partial<{shape: 'box' | 'round'; size: number; clouds?: boolean; baseColor?: string}>;
  lighting?: Partial<{
    sky: string;
    ground: string;
    hemiIntensity: number;
    sun: string;
    sunIntensity: number;
  }>;
  envIntensity?: [number, number];
  fog?: [string, string] | null;
  buildWorld?: (ctx: StyleWorldContext) => StyleWorldResult;
}

function assembleKit(
  id: GayaId,
  tracker: ReturnType<typeof createResourceTracker>,
  overrides: KitPartial,
): StyleKit {
  const colorMap = overrides.colorMap ?? ((hex: string) => hex);
  const g = <T extends BufferGeometry>(geom: T) => tracker.track(geom);

  return {
    id,
    alwaysNight: overrides.alwaysNight,
    colorMap,
    material: (hex, role, emissive) => {
      const mapped = colorMap(hex, role);
      const mat = tracker.track(
        overrides.material
          ? overrides.material(mapped, role, emissive)
          : makeRolePBRMaterial(mapped, role, {emissive}),
      );
      mat.userData.role = role;
      if (emissive && 'emissive' in mat && mat.emissive instanceof Color) {
        mat.emissive.set(emissive);
      }
      return mat;
    },
    box: (w, h, d) => g(new BoxGeometry(w, h, d)),
    sphere: (r, _role, dome) =>
      g(
        dome
          ? new SphereGeometry(r, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.8)
          : new SphereGeometry(r, 16, 12),
      ),
    cylinder: (rt, rb, h) => g(new CylinderGeometry(rt, rb, h, 14)),
    cone: (r, h, _role, open) => g(new ConeGeometry(r, h, 14, 1, Boolean(open))),
    capsule: (r, len) => g(new CapsuleGeometry(r, len, 4, 12)),
    decorate: (mesh, role) => {
      applyShadowFlags(mesh, role);
      overrides.decorate?.(mesh, role);
    },
    agentScale: {head: 1, body: 1, ...overrides.agentScale},
    outside: {shape: 'box', size: 58, ...overrides.outside},
    lighting: {
      sky: '#FFF6EA',
      ground: '#A58B73',
      hemiIntensity: 1.15,
      sun: '#FFE4BC',
      sunIntensity: 1.95,
      ...overrides.lighting,
    },
    envIntensity: overrides.envIntensity ?? [0.78, 0.36],
    fog: overrides.fog === undefined ? ['#03060D', '#03060D'] : overrides.fog,
    buildWorld: overrides.buildWorld,
    track: tracker.track,
    dispose: tracker.disposeAll,
  };
}

export function createStyleKit(gaya: GayaId, maxAnisotropy = 1): StyleKit {
  const tracker = createResourceTracker();

  if (gaya === 'pecellele') {
    const rand = createSeededRandom(37);
    const STREET_Y = -0.65;

    const kuasTex = makeCanvasTexture(
      tracker.track,
      128,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#ECECEC';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 180; i++) {
          ctx.globalAlpha = 0.06 + rand() * 0.07;
          ctx.strokeStyle = rand() > 0.5 ? '#FFFFFF' : '#6A5440';
          ctx.lineWidth = 2 + rand() * 4;
          ctx.lineCap = 'round';
          const x = rand() * w;
          const y = rand() * h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 8 + rand() * 18, y + rand() * 6 - 3);
          ctx.stroke();
        }
      },
      {srgb: true, maxAnisotropy},
    );

    const makeTerpalTex = (a: string, b: string) =>
      makeCanvasTexture(
        tracker.track,
        128,
        128,
        (ctx, w, h) => {
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 ? a : b;
            ctx.fillRect(i * 16, 0, 16, h);
          }
          for (let i = 0; i < 700; i++) {
            ctx.fillStyle = `rgba(0,0,0,${rand() * 0.06})`;
            ctx.fillRect(rand() * w, rand() * h, 3, 1);
          }
        },
        {srgb: true, maxAnisotropy},
      );

    const makeWoodTex = (a: string, b: string) =>
      makeCanvasTexture(
        tracker.track,
        128,
        128,
        (ctx, w, h) => {
          ctx.fillStyle = a;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = b;
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 14; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 9 + rand() * 3);
            ctx.bezierCurveTo(
              40,
              i * 9 + rand() * 6,
              80,
              i * 9 - rand() * 6,
              128,
              i * 9,
            );
            ctx.stroke();
          }
        },
        {srgb: true, maxAnisotropy},
      );

    const makeAsphaltTex = (base: string) =>
      makeCanvasTexture(
        tracker.track,
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 5000; i++) {
            const v = rand() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.08})`;
            ctx.fillRect(rand() * w, rand() * h, 2, 2);
          }
        },
        {srgb: true, maxAnisotropy},
      );

    const makePavingTex = (cs: string[]) =>
      makeCanvasTexture(
        tracker.track,
        256,
        256,
        (ctx) => {
          ctx.fillStyle = '#00000033';
          ctx.fillRect(0, 0, 256, 256);
          for (let y = 0; y < 8; y++) {
            for (let x = -1; x < 8; x++) {
              ctx.fillStyle = cs[(x * 3 + y * 5 + 24) % cs.length]!;
              ctx.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32 + 1, 30, 30);
            }
          }
        },
        {srgb: true, maxAnisotropy},
      );

    const chalkboardTex = makeCanvasTexture(
      tracker.track,
      512,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#243028';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
          ctx.fillRect(rand() * w, rand() * h, 20, 2);
        }
        ctx.fillStyle = '#F6F1E0';
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText('PESANAN HARI INI', 24, 44);
        ctx.fillRect(24, 54, w - 48, 3);
      },
      {srgb: true, maxAnisotropy},
    );

    const makeSpandukTex = (
      lines: {t: string; c: string; f: string}[],
      bg: string,
      border: string,
      w = 1024,
      h = 256,
    ) =>
      makeCanvasTexture(
        tracker.track,
        w,
        h,
        (ctx) => {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = border;
          ctx.lineWidth = 10;
          ctx.strokeRect(10, 10, w - 20, h - 20);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          lines.forEach((line, idx) => {
            ctx.fillStyle = line.c;
            ctx.font = line.f;
            ctx.fillText(line.t, w / 2, (h / (lines.length + 1)) * (idx + 1), w - 60);
          });
        },
        {srgb: true, maxAnisotropy},
      );

    const asphaltRoughTex = makeCanvasTexture(
      tracker.track,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#C8C8C8';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) {
          const px = rand() * w;
          const py = rand() * h;
          const r = 24 + rand() * 34;
          const grad = ctx.createRadialGradient(px, py, 2, px, py, r);
          grad.addColorStop(0, '#303030');
          grad.addColorStop(1, 'rgba(200,200,200,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      {srgb: false, maxAnisotropy},
    );
    asphaltRoughTex.repeat.set(10, 1.2);

    const terpalWall = makeTerpalTex('#E8742A', '#D8641E');
    terpalWall.repeat.set(6, 2);
    const pavFloor = makePavingTex(['#8A857C', '#7D786F', '#95907F']);
    pavFloor.repeat.set(5, 3);
    const mejaWood = makeWoodTex('#E6D6B8', '#B8A07A');

    const roleTextures: Partial<Record<ObjectRole, Texture>> = {
      lantai: pavFloor,
      karpet: pavFloor,
      garis: pavFloor,
      dinding: terpalWall,
      meja: mejaWood,
      kayu: mejaWood,
      alas: pavFloor,
      papan: chalkboardTex,
    };

    return assembleKit('pecellele', tracker, {
      alwaysNight: true,
      colorMap: (hex, role) => (roleTextures[role] ? '#FFFFFF' : hex),
      material: (hex, role, emissive) => {
        const map = roleTextures[role] ?? null;
        if (role === 'kaca') {
          return new MeshPhysicalMaterial({
            color: '#FFE1A8',
            roughness: 0.08,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.06,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
            emissive: new Color('#5A340C'),
            emissiveIntensity: 0.35,
          });
        }
        return makeRolePBRMaterial(map ? '#FFFFFF' : hex, role, {
          map: map ?? kuasTex,
          bumpMap: role === 'lantai' || role === 'dinding' ? map ?? kuasTex : null,
          bumpScale: 0.014,
          emissive: emissive ?? '#100804',
          emissiveIntensity: emissive ? 0.55 : 0.14,
        });
      },
      lighting: {
        sky: '#B8C4FF',
        ground: '#2D202A',
        hemiIntensity: 1.25,
        sun: '#DCE9FF',
        sunIntensity: 1.15,
      },
      envIntensity: [0.48, 0.48],
      fog: ['#1D2440', '#1D2440'],
      buildWorld: ({kantor, kit, attach}) => {
        let currentParent: Group = kantor;
        const matCache = new Map<string, Material>();

        const makeStreetMat = (
          col: string,
          opts: {
            map?: Texture;
            roughnessMap?: Texture;
            em?: string;
            basic?: boolean;
            op?: number;
            metalness?: number;
            roughness?: number;
            clearcoat?: number;
            anisotropy?: number;
          } = {},
        ): Material => {
          const key = `${col}|${opts.map?.uuid ?? ''}|${opts.roughnessMap?.uuid ?? ''}|${opts.em ?? ''}|${opts.basic ? 1 : 0}|${opts.op ?? 1}|${opts.metalness ?? -1}|${opts.roughness ?? -1}|${opts.clearcoat ?? -1}`;
          if (!matCache.has(key)) {
            if (opts.basic) {
              matCache.set(
                key,
                tracker.track(
                  new MeshBasicMaterial({
                    color: col,
                    map: opts.map ?? null,
                    transparent: Boolean(opts.op && opts.op < 1),
                    opacity: opts.op ?? 1,
                    side: DoubleSide,
                  }),
                ),
              );
            } else if ((opts.clearcoat ?? 0) > 0 || (opts.anisotropy ?? 0) > 0) {
              matCache.set(
                key,
                tracker.track(
                  new MeshPhysicalMaterial({
                    color: col,
                    map: opts.map ?? kuasTex,
                    roughnessMap: opts.roughnessMap ?? null,
                    metalness: opts.metalness ?? 0.08,
                    roughness: opts.roughness ?? 0.32,
                    clearcoat: opts.clearcoat ?? 0,
                    clearcoatRoughness: 0.14,
                    anisotropy: opts.anisotropy ?? 0,
                    emissive: new Color(opts.em ?? '#0A0604'),
                    emissiveIntensity: opts.em ? 0.5 : 0.12,
                    transparent: Boolean(opts.op && opts.op < 1),
                    opacity: opts.op ?? 1,
                    depthWrite: !(opts.op && opts.op < 1),
                  }),
                ),
              );
            } else {
              matCache.set(
                key,
                tracker.track(
                  new MeshStandardMaterial({
                    color: col,
                    map: opts.map ?? kuasTex,
                    roughnessMap: opts.roughnessMap ?? null,
                    metalness: opts.metalness ?? 0.05,
                    roughness: opts.roughness ?? 0.78,
                    emissive: new Color(opts.em ?? '#0A0604'),
                    emissiveIntensity: opts.em ? 0.5 : 0.12,
                    transparent: Boolean(opts.op && opts.op < 1),
                    opacity: opts.op ?? 1,
                    depthWrite: !(opts.op && opts.op < 1),
                  }),
                ),
              );
            }
          }
          return matCache.get(key)!;
        };

        const resolveStreetMat = (
          col: string | Material,
          opts?: Parameters<typeof makeStreetMat>[1],
        ) => (typeof col === 'string' ? makeStreetMat(col, opts) : col);

        const putBox = (
          w: number,
          h: number,
          d: number,
          col: string | Material,
          x: number,
          y: number,
          z: number,
          opts?: Parameters<typeof makeStreetMat>[1],
          shadowRole: ObjectRole = 'kayu',
        ) => {
          const mesh = attach(
            kit.box(w, h, d, shadowRole),
            resolveStreetMat(col, opts),
            x,
            y,
            z,
            currentParent,
          );
          applyShadowFlags(mesh, shadowRole);
          return mesh;
        };

        const putCyl = (
          rt: number,
          rb: number,
          h: number,
          col: string | Material,
          x: number,
          y: number,
          z: number,
          opts?: Parameters<typeof makeStreetMat>[1],
          shadowRole: ObjectRole = 'logam',
        ) => {
          const mesh = attach(
            kit.cylinder(rt, rb, h, shadowRole),
            resolveStreetMat(col, opts),
            x,
            y,
            z,
            currentParent,
          );
          applyShadowFlags(mesh, shadowRole);
          return mesh;
        };

        const putBall = (
          r: number,
          col: string | Material,
          x: number,
          y: number,
          z: number,
          opts?: Parameters<typeof makeStreetMat>[1],
        ) => {
          const mesh = attach(
            kit.sphere(r, 'daun'),
            resolveStreetMat(col, opts),
            x,
            y,
            z,
            currentParent,
          );
          applyShadowFlags(mesh, 'daun');
          return mesh;
        };

        const putPlane = (
          w: number,
          h: number,
          map: Texture,
          x: number,
          y: number,
          z: number,
          ry = 0,
        ) => {
          const mesh = attach(
            tracker.track(new PlaneGeometry(w, h)),
            tracker.track(
              new MeshStandardMaterial({
                map,
                emissiveMap: map,
                emissive: new Color('#FFFFFF'),
                emissiveIntensity: 0.42,
                roughness: 0.85,
                metalness: 0.0,
                side: DoubleSide,
              }),
            ),
            x,
            y,
            z,
            currentParent,
          );
          mesh.rotation.y = ry;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          return mesh;
        };

        const withGroup = (
          x: number,
          z: number,
          ry: number,
          fn: () => void,
          y = STREET_Y,
        ) => {
          const grp = new Group();
          grp.position.set(x, y, z);
          grp.rotation.y = ry;
          currentParent.add(grp);
          const prev = currentParent;
          currentParent = grp;
          fn();
          currentParent = prev;
          return grp;
        };

        const putWheel = (r: number, tube: number, x: number, y: number, z: number) => {
          const m = attach(
            tracker.track(new TorusGeometry(r, tube, 8, 18)),
            makeStreetMat('#1A1A1A', {roughness: 0.88, metalness: 0.04}),
            x,
            y,
            z,
            currentParent,
          );
          m.rotation.y = Math.PI / 2;
          m.castShadow = true;
          m.receiveShadow = true;
          return m;
        };

        const putLight = (
          x: number,
          y: number,
          z: number,
          col: string,
          intensity: number,
          dist = 11,
        ) => {
          const light = new PointLight(col, intensity, dist, 1.6);
          light.position.set(x, y, z);
          kantor.add(light);
          tracker.track({dispose: () => light.removeFromParent()});
          return light;
        };

        const extraHemi = new HemisphereLight('#E8F0FF', '#3A2A30', 0.95);
        kantor.add(extraHemi);
        tracker.track({dispose: () => extraHemi.removeFromParent()});

        // Paving trotoar + aspal malam basah yang diperlebar untuk kantor 2 lantai
        const asphaltTex = makeAsphaltTex('#30333C');
        asphaltTex.repeat.set(12, 1.2);
        const sidewalkTex = makePavingTex(['#6E6A64', '#77736C', '#625F59']);
        sidewalkTex.repeat.set(16, 10);

        putBox(
          54,
          0.2,
          36,
          makeStreetMat('#FFFFFF', {map: sidewalkTex, roughness: 0.86, metalness: 0.02}),
          0,
          STREET_Y - 0.1,
          -2,
          undefined,
          'alas',
        );
        putBox(
          54,
          0.06,
          5.2,
          makeStreetMat('#FFFFFF', {
            map: asphaltTex,
            roughnessMap: asphaltRoughTex,
            roughness: 0.88,
            metalness: 0.08,
          }),
          0,
          STREET_Y + 0.03,
          8.7,
          undefined,
          'alas',
        );
        for (let k = -10; k < 11; k++) {
          putBox(
            1.4,
            0.02,
            0.16,
            makeStreetMat('#F2EFE2', {roughness: 0.55, metalness: 0.05, em: '#26231C'}),
            k * 2.6,
            STREET_Y + 0.07,
            8.7,
            undefined,
            'garis',
          );
        }
        for (let k = -26; k < 27; k++) {
          putBox(1, 0.22, 0.25, k % 2 ? '#F0F0F0' : '#2A2A2A', k, STREET_Y + 0.08, 6.0, {
            roughness: 0.82,
          });
        }

        // Rangka tenda terpal 2 tingkat + spanduk lukis besar memahkotai tingkat atas
        const awningMat = makeStreetMat('#FFFFFF', {
          map: makeTerpalTex('#E8742A', '#F4F0E6'),
          roughness: 0.88,
          metalness: 0.02,
        });
        const chromeMat = makeStreetMat('#C0C4C8', {
          metalness: 0.88,
          roughness: 0.22,
          anisotropy: 0.65,
        });
        for (const x of [-9.4, -3.2, 3.2, 9.4]) {
          putCyl(0.06, 0.06, 8.2, chromeMat, x, STREET_Y + 4.1, -3.9);
        }
        // Tiang teras depan diletakkan di kedua sisi terluar agar tengah 2 lantai terbuka lega
        for (const x of [-9.4, 9.4]) {
          putCyl(0.06, 0.06, 4.1, chromeMat, x, STREET_Y + 2.05, 3.7);
        }
        putBox(19.2, 0.06, 2.8, awningMat, 0, 7.65, -4.85).rotation.x = -0.35;
        putBox(18.9, 0.08, 0.08, chromeMat, 0, 3.45, 3.7);

        const mainBanner = makeSpandukTex(
          [
            {
              t: 'PECEL LELE · AYAM GORENG · SEAFOOD',
              c: '#A02A1A',
              f: 'bold 74px Impact, sans-serif',
            },
            {
              t: 'sambal terasi · lalapan · studio 2 lantai',
              c: '#1F5A8A',
              f: 'italic bold 48px Georgia, serif',
            },
          ],
          '#FFF4DC',
          '#A02A1A',
          1536,
          320,
        );
        putPlane(16.8, 2.35, mainBanner, 0, 7.15, -3.66, 0);

        const sideBanner = makeSpandukTex(
          [
            {t: 'LELE', c: '#3A5A2A', f: 'bold 120px Impact, sans-serif'},
            {t: 'ayam · bebek · cumi', c: '#A02A1A', f: 'bold 48px Georgia, serif'},
          ],
          '#FFF4DC',
          '#3A5A2A',
          512,
          256,
        );
        putPlane(4.8, 2.5, sideBanner, -9.12, 1.85, 0.0, Math.PI / 2);

        // Meja panjang & bangku plastik warna-warni di trotoar depan
        const longTableMat = makeStreetMat('#FFFFFF', {map: mejaWood, roughness: 0.56, metalness: 0.04});
        putBox(10.6, 0.08, 0.9, longTableMat, 0, STREET_Y + 0.85, 4.95);
        for (const x of [-4.8, 0, 4.8]) {
          putBox(0.1, 0.8, 0.7, chromeMat, x, STREET_Y + 0.42, 4.95);
        }
        const stoolColors = [
          '#D22A2A',
          '#1F6AD2',
          '#D22A2A',
          '#2AA04A',
          '#1F6AD2',
          '#D22A2A',
          '#2AA04A',
        ];
        const putStool = (x: number, z: number, col: string) =>
          withGroup(x, z, 0, () => {
            const stoolMat = makeStreetMat(col, {roughness: 0.28, metalness: 0.02, clearcoat: 0.72});
            putCyl(0.22, 0.19, 0.05, stoolMat, 0, 0.47, 0);
            for (const [lx, lz] of [
              [-0.14, -0.14],
              [0.14, -0.14],
              [-0.14, 0.14],
              [0.14, 0.14],
            ] as const) {
              putCyl(0.03, 0.04, 0.46, stoolMat, lx, 0.23, lz);
            }
          });
        for (let i = 0; i < 7; i++) {
          putStool(-4.5 + i * 1.5, 4.2, stoolColors[i]!);
          putStool(-4.5 + i * 1.5, 5.65, stoolColors[6 - i]!);
        }
        for (let i = 0; i < 5; i++) {
          putCyl(0.2, 0.17, 0.04, '#F4F0E6', -4 + i * 2, STREET_Y + 0.91, 4.95, {
            roughness: 0.22,
            clearcoat: 0.8,
          });
          putCyl(0.07, 0.06, 0.18, '#C9862A', -3.6 + i * 2, STREET_Y + 0.98, 4.95, {
            roughness: 0.18,
            clearcoat: 0.65,
          });
        }
        putCyl(0.08, 0.08, 0.2, '#D22A2A', 0.4, STREET_Y + 0.99, 4.95, {roughness: 0.35});

        // Gerobak penggorengan digeser keluar dari tangga & lantai 1 kanan
        withGroup(11.35, 0.2, -Math.PI / 2, () => {
          putBox(3.2, 1.0, 1.3, '#D8DDE2', 0, 1.0, 0, {
            metalness: 0.85,
            roughness: 0.24,
            anisotropy: 0.7,
          });
          putBox(
            3.2,
            0.7,
            1.3,
            makeStreetMat('#BFE3FF', {op: 0.36, roughness: 0.06, clearcoat: 1.0}),
            0,
            1.85,
            0,
            undefined,
            'kaca',
          );
          putBox(3.3, 0.06, 1.4, '#A8ADB2', 0, 2.22, 0, {
            metalness: 0.88,
            roughness: 0.22,
            anisotropy: 0.7,
          });
          putPlane(
            3,
            0.8,
            makeSpandukTex(
              [
                {t: 'PECEL LELE', c: '#A02A1A', f: 'bold 90px Impact, sans-serif'},
                {t: 'CAK MALIK', c: '#1F5A8A', f: 'bold 50px Georgia, serif'},
              ],
              '#FFF4DC',
              '#A02A1A',
              512,
              220,
            ),
            0,
            1.0,
            0.66,
            0,
          );
          for (const wx of [-1.1, 1.1]) putWheel(0.4, 0.07, wx, 0.42, 0.7);
          for (let i = 0; i < 6; i++) {
            putBall(0.12, i % 2 ? '#C88A3A' : '#E0A050', -1.1 + i * 0.35, 1.7, 0, {
              roughness: 0.42,
              clearcoat: 0.35,
            });
          }
          putCyl(0.6, 0.55, 0.7, '#3A3A3A', -2.4, 0.35, 0, {metalness: 0.72, roughness: 0.48});
          putCyl(0.7, 0.35, 0.22, '#2A2A2A', -2.4, 0.82, 0, {metalness: 0.82, roughness: 0.34});
          putCyl(0.62, 0.62, 0.04, '#C88A2A', -2.4, 0.92, 0, {
            em: '#9C4D10',
            roughness: 0.28,
            clearcoat: 0.5,
          });
          putLight(-2.4, 1.3, 0, '#FF8A3A', 12, 4.5);

          // Custom GLSL cooking steam & heat shimmer rising from wok
          const steamShader = tracker.track(
            new ShaderMaterial({
              uniforms: {
                uTime: {value: 0},
              },
              vertexShader: `
                varying vec2 vUv;
                uniform float uTime;
                void main() {
                  vUv = uv;
                  vec3 pos = position;
                  float sway = sin(uv.y * 5.2 - uTime * 2.4) * 0.085 * uv.y;
                  pos.x += sway;
                  pos.z += cos(uv.y * 4.1 - uTime * 1.9) * 0.055 * uv.y;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
              `,
              fragmentShader: `
                varying vec2 vUv;
                uniform float uTime;
                void main() {
                  float edgeX = 1.0 - abs(vUv.x * 2.0 - 1.0);
                  float verticalFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
                  float wispA = 0.5 + 0.5 * sin(vUv.y * 10.0 - uTime * 3.1 + vUv.x * 6.0);
                  float wispB = 0.5 + 0.5 * cos(vUv.y * 7.0 - uTime * 2.2 - vUv.x * 5.0);
                  float alpha = pow(edgeX, 1.6) * verticalFade * (0.14 + 0.18 * wispA * wispB);
                  vec3 col = mix(vec3(1.0, 0.78, 0.55), vec3(0.95, 0.96, 0.98), vUv.y);
                  gl_FragColor = vec4(col, alpha);
                }
              `,
              transparent: true,
              depthWrite: false,
              side: DoubleSide,
              blending: AdditiveBlending,
            }),
          );
          const steamPlaneA = attach(
            tracker.track(new PlaneGeometry(0.92, 1.75, 4, 14)),
            steamShader,
            -2.4,
            1.85,
            0,
            currentParent,
          );
          const steamPlaneB = attach(
            tracker.track(new PlaneGeometry(0.92, 1.75, 4, 14)),
            steamShader,
            -2.4,
            1.85,
            0,
            currentParent,
          );
          steamPlaneB.rotation.y = Math.PI / 2;
          steamPlaneA.userData.steamShader = steamShader;
        });

        // Lampu neon tabung menerangi lantai bawah & tingkat mezzanine atas
        const neonLights: PointLight[] = [];
        for (const x of [-6, 0, 6]) {
          putBox(1.5, 0.08, 0.08, '#F4FBFF', x, 3.35, 3.55, {basic: true}, 'lampu');
          neonLights.push(putLight(x, 3.6, 2.8, '#EAF6FF', 16, 11.5));
          putBox(1.5, 0.08, 0.08, '#F4FBFF', x, 5.75, -2.5, {basic: true}, 'lampu');
          neonLights.push(putLight(x, 5.5, -2.2, '#FFF2DD', 15, 11.5));
        }

        // Tiang listrik + kabel semrawut + motor parkir
        const cableMat = tracker.track(new LineBasicMaterial({color: '#111111'}));
        const putPole = (x: number, z: number, h = 8.4) => {
          putCyl(0.13, 0.17, h, '#7D8085', x, STREET_Y + h / 2, z, {
            roughness: 0.88,
            metalness: 0.05,
          });
          putBox(1.8, 0.1, 0.1, '#5D6065', x, STREET_Y + h - 0.6, z, {
            metalness: 0.78,
            roughness: 0.35,
          });
          putBox(0.4, 0.6, 0.35, '#A6A9AE', x + 0.25, STREET_Y + h - 1.4, z, {
            metalness: 0.72,
            roughness: 0.38,
          });
          return new Vector3(x, STREET_Y + h - 0.55, z);
        };
        const putCable = (a: Vector3, b: Vector3, sag = 1) => {
          const pts: Vector3[] = [];
          for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            pts.push(
              new Vector3()
                .lerpVectors(a, b, t)
                .add(new Vector3(0, -sag * 4 * t * (1 - t), 0)),
            );
          }
          const line = new Line(
            tracker.track(new BufferGeometry().setFromPoints(pts)),
            cableMat,
          );
          kantor.add(line);
          tracker.track({dispose: () => line.removeFromParent()});
        };

        const pole1 = putPole(-11.4, 6.4);
        const pole2 = putPole(12.8, 6.4);
        const pole3 = putPole(-11.8, -6.5, 8.8);
        putCable(pole1, pole2, 1.2);
        putCable(
          pole1.clone().add(new Vector3(0.7, 0, 0)),
          pole2.clone().add(new Vector3(0.7, 0, 0)),
          1.5,
        );
        putCable(
          pole1.clone().add(new Vector3(-0.7, 0, 0)),
          pole2.clone().add(new Vector3(-0.7, 0, 0)),
          0.9,
        );
        putCable(pole1, pole3, 0.9);
        putCable(pole1, new Vector3(-9.4, 5.6, 3.7), 0.5);
        putCable(pole2, new Vector3(9.4, 5.6, 3.7), 0.6);

        const putMotor = (x: number, z: number, ry: number, col: string) =>
          withGroup(x, z, ry, () => {
            const paintMat = makeStreetMat(col, {
              metalness: 0.45,
              roughness: 0.22,
              clearcoat: 0.9,
            });
            for (const ax of [-0.65, 0.65]) putWheel(0.26, 0.09, ax, 0.33, 0);
            putBox(1.2, 0.25, 0.3, paintMat, 0, 0.6, 0);
            putBox(0.6, 0.18, 0.34, '#1D1D1D', -0.15, 0.82, 0, {roughness: 0.82});
            putBox(0.25, 0.6, 0.3, paintMat, 0.55, 0.75, 0);
            putCyl(0.03, 0.03, 0.7, chromeMat, 0.62, 1.1, 0).rotation.x = Math.PI / 2;
            putBall(0.09, '#FFF6C0', 0.72, 0.95, 0, {em: '#FFE080'});
          });

        putMotor(-11.4, 2.7, 0.4, '#2A2A2A');
        putMotor(-11.0, 0.3, 0.3, '#C8A02A');
        putMotor(14.0, 1.2, -0.3, '#B42A2A');

        let activeSteamShader: ShaderMaterial | null = null;
        kantor.traverse((obj) => {
          if (obj.userData.steamShader) {
            activeSteamShader = obj.userData.steamShader as ShaderMaterial;
          }
        });

        return {
          replaceOutside: true,
          widthScale: 1.24,
          zoomFarScale: 0.85,
          onTick: (tSec) => {
            if (activeSteamShader) {
              activeSteamShader.uniforms.uTime!.value = tSec;
            }
            for (let i = 0; i < neonLights.length; i++) {
              const baseIntensity = i % 2 === 0 ? 16 : 15;
              const pulse = 1 + 0.045 * Math.sin(tSec * 3.8 + i * 1.9);
              neonLights[i]!.intensity = baseIntensity * pulse;
            }
          },
        };
      },
    });
  }

  // Default: 'hologram' two-story blueprint cyan cyber architecture
  const rand = createSeededRandom(41);
  const CYAN = '#22D3EE';
  const AMBER = '#FBBF24';
  const DARK_BLUE = '#07111F';
  const EDGE_ROLES: ObjectRole[] = [
    'alas',
    'meja',
    'kursi',
    'sofa',
    'baju',
    'celana',
    'kulit',
    'rambut',
    'dinding',
    'bingkai',
    'kaki',
    'pot',
    'buku',
    'logam',
  ];
  const GLOW_ROLES: ObjectRole[] = ['layar', 'lampu', 'catatan'];

  const edgeMat = tracker.track(
    new LineBasicMaterial({color: CYAN, transparent: true, opacity: 0.72}),
  );
  const amberEdgeMat = tracker.track(new LineBasicMaterial({color: AMBER}));

  return assembleKit('hologram', tracker, {
    alwaysNight: true,
    colorMap: (hex, role) => {
      if (role === 'lantai' || role === 'karpet') return '#041022';
      if (role === 'garis') return '#0B2A3A';
      return hex;
    },
    material: (hex, role) => {
      if (role === 'kaca' || role === 'dinding') {
        return new MeshLambertMaterial({
          color: '#0E7490',
          transparent: true,
          opacity: role === 'kaca' ? 0.11 : 0.14,
          side: DoubleSide,
          depthWrite: false,
        });
      }
      if (role === 'papan') {
        return new MeshLambertMaterial({
          color: '#3A2A06',
          emissive: '#3A2A06',
          transparent: true,
          opacity: 0.58,
          side: DoubleSide,
          depthWrite: false,
        });
      }
      if (role === 'catatan') {
        return new MeshLambertMaterial({color: AMBER, emissive: AMBER});
      }
      if (role === 'lantai' || role === 'garis' || role === 'karpet') {
        return new MeshLambertMaterial({color: '#041022', emissive: '#020812'});
      }
      if (GLOW_ROLES.includes(role)) {
        return new MeshLambertMaterial({
          color: new Color(hex).multiplyScalar(0.55),
          emissive: hex,
        });
      }
      return new MeshLambertMaterial({
        color: new Color(DARK_BLUE).lerp(
          new Color(hex),
          role === 'kulit' || role === 'baju' ? 0.28 : 0.12,
        ),
        emissive: '#030A16',
      });
    },
    decorate: (mesh, role) => {
      if (role === 'catatan') {
        const mat = mesh.material as MeshLambertMaterial;
        mat.color.set(AMBER);
        mat.emissive.set(AMBER);
        mat.emissiveIntensity = 0.65;
        mesh.scale.set(1.08, 0.4, 1);
        return;
      }
      if (role === 'papan') {
        mesh.add(new LineSegments(tracker.track(new EdgesGeometry(mesh.geometry)), amberEdgeMat));
        return;
      }
      if (EDGE_ROLES.includes(role)) {
        mesh.add(new LineSegments(tracker.track(new EdgesGeometry(mesh.geometry, 30)), edgeMat));
      }
    },
    lighting: {
      sky: '#6B8CFF',
      ground: '#03060D',
      hemiIntensity: 1.15,
      sun: '#9BE7FF',
      sunIntensity: 0.78,
    },
    envIntensity: [0.46, 0.46],
    fog: ['#03060D', '#03060D'],
    buildWorld: ({kantor, attach}) => {
      const floorY = -0.65;
      const innerGrid = new GridHelper(19, 38, CYAN, '#0E4A5E');
      innerGrid.position.set(0, 0.03, -0.15);
      const outerGrid = new GridHelper(120, 60, '#0B3A4A', '#0A2233');
      outerGrid.position.y = floorY - 0.02;
      kantor.add(innerGrid, outerGrid);

      for (const grid of [innerGrid, outerGrid]) {
        const lineMat = grid.material as LineBasicMaterial;
        lineMat.transparent = true;
        lineMat.opacity = grid === innerGrid ? 0.56 : 0.45;
        tracker.track({
          dispose: () => {
            grid.geometry.dispose();
            lineMat.dispose();
            grid.removeFromParent();
          },
        });
      }

      // Custom GLSL holographic blueprint floor field with radial scanline wave
      const holoFieldMat = tracker.track(
        new ShaderMaterial({
          uniforms: {
            uTime: {value: 0},
            uCyan: {value: new Color(CYAN)},
            uBase: {value: new Color('#02060D')},
          },
          vertexShader: `
            varying vec2 vWorldXZ;
            void main() {
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldXZ = wp.xz;
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `,
          fragmentShader: `
            varying vec2 vWorldXZ;
            uniform float uTime;
            uniform vec3 uCyan;
            uniform vec3 uBase;
            void main() {
              float dist = length(vWorldXZ);
              float wave = smoothstep(0.86, 1.0, sin(dist * 0.55 - uTime * 1.45));
              float rings = smoothstep(0.95, 1.0, cos(dist * 1.6));
              float fade = exp(-dist * 0.045);
              float gridX = smoothstep(0.96, 1.0, abs(cos(vWorldXZ.x * 1.57)));
              float gridZ = smoothstep(0.96, 1.0, abs(cos(vWorldXZ.y * 1.57)));
              float microGrid = max(gridX, gridZ) * 0.08 * fade;
              vec3 col = uBase + uCyan * (wave * 0.16 * fade + rings * 0.05 * fade + microGrid);
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        }),
      );
      const basePlane = attach(
        tracker.track(new PlaneGeometry(120, 120)),
        holoFieldMat,
        0,
        floorY - 0.04,
        0,
        kantor,
      );
      basePlane.rotation.x = -Math.PI / 2;

      // Custom GLSL Holographic Atrium Beacon Ring beneath Mission Board
      const beaconRingMat = tracker.track(
        new ShaderMaterial({
          uniforms: {
            uTime: {value: 0},
            uCyan: {value: new Color(CYAN)},
            uAmber: {value: new Color(AMBER)},
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uCyan;
            uniform vec3 uAmber;
            void main() {
              vec2 p = vUv * 2.0 - 1.0;
              float r = length(p);
              float a = atan(p.y, p.x);
              float outer = smoothstep(0.04, 0.0, abs(r - 0.86));
              float inner = smoothstep(0.03, 0.0, abs(r - 0.62));
              float arc = smoothstep(0.1, 0.9, sin(a * 3.0 - uTime * 2.1));
              float arc2 = smoothstep(0.2, 0.95, cos(a * 2.0 + uTime * 1.5));
              float alpha = clamp(outer * (0.25 + 0.55 * arc) + inner * (0.2 + 0.45 * arc2), 0.0, 0.78);
              vec3 col = mix(uCyan, uAmber, inner * 0.45);
              gl_FragColor = vec4(col, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          blending: AdditiveBlending,
        }),
      );
      const beaconPlane = attach(
        tracker.track(new PlaneGeometry(3.4, 3.4)),
        beaconRingMat,
        0,
        0.028,
        -0.78,
        kantor,
      );
      beaconPlane.rotation.x = -Math.PI / 2;

      // Additive cyan data stream flowing from both Floor 1 & Floor 2 monitors to Mission Board
      const count = 190;
      const pGeom = tracker.track(new BufferGeometry());
      const positions = new Float32Array(count * 3);
      pGeom.setAttribute('position', new Float32BufferAttribute(positions, 3));

      const pMat = tracker.track(
        new PointsMaterial({
          color: '#A5F3FC',
          size: 0.09,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      );
      const points = new Points(pGeom, pMat);
      points.frustumCulled = false;
      kantor.add(points);
      tracker.track({dispose: () => points.removeFromParent()});

      const boardDest = new Vector3(0, 1.55, -0.78);
      const origins: Vector3[] = [];
      const phases = Array.from({length: count}, () => rand());
      const lanes = Array.from({length: count}, () => rand());
      const tmpVec = new Vector3();

      const updateStreams = (sec: number) => {
        if (origins.length === 0) {
          kantor.traverse((obj) => {
            const mesh = obj as Mesh;
            if (
              mesh.isMesh &&
              (mesh.material as {userData?: {role?: string}}).userData?.role === 'layar'
            ) {
              origins.push(mesh.position.clone());
            }
          });
          if (origins.length === 0) {
            origins.push(new Vector3(-6, 1.1, 0), new Vector3(6, 3.9, -2.5));
          }
        }

        for (let i = 0; i < count; i++) {
          const src = origins[Math.floor(lanes[i]! * origins.length)]!;
          const u = (sec * 0.22 + phases[i]!) % 1;
          tmpVec.lerpVectors(src, boardDest, u);
          tmpVec.y += Math.sin(u * Math.PI) * 1.1;
          positions[i * 3] = tmpVec.x;
          positions[i * 3 + 1] = tmpVec.y;
          positions[i * 3 + 2] = tmpVec.z;
        }
        pGeom.attributes.position!.needsUpdate = true;
      };
      updateStreams(0);

      return {
        replaceOutside: true,
        widthScale: 1.18,
        zoomFarScale: 0.9,
        onTick: (tSec) => {
          holoFieldMat.uniforms.uTime!.value = tSec;
          beaconRingMat.uniforms.uTime!.value = tSec;
          updateStreams(tSec);
        },
      };
    },
  });
}
