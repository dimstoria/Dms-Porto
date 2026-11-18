export type AgentId =
  | 'impeccable'
  | 'frontend'
  | 'tastes'
  | 'uiux'
  | 'apple'
  | 'antislop'
  | 'design-dna'
  | 'motion'
  | 'genjutsu'
  | 'threejs'
  | 'gsap';

export type StudioRoomKey = 'craft' | 'engineering' | 'guard';

export interface StudioRoomSpec {
  key: StudioRoomKey;
  label: string;
  x0: number;
  x1: number;
  floor: string;
  rug: string;
}

export const MEZZANINE_Y = 2.85;

export const STUDIO_ROOMS: StudioRoomSpec[] = [
  {
    key: 'craft',
    label: 'Craft Studio',
    x0: -8.8,
    x1: -2.6,
    floor: '#E9DFD1',
    rug: '#9333EA',
  },
  {
    key: 'engineering',
    label: 'Code & Flow',
    x0: -2.6,
    x1: 2.6,
    floor: '#EFE6D7',
    rug: '#0284C7',
  },
  {
    key: 'guard',
    label: 'Clarity & Guard',
    x0: 2.6,
    x1: 8.8,
    floor: '#E5DDD0',
    rug: '#F59E0B',
  },
];

export type AgentActivityKind = 'kerja' | 'laporan' | 'belajar' | 'siaga';

export interface AgentPaletteTokens {
  outline: string;
  armorDeep: string;
  armorShadow: string;
  armorMid: string;
  armorLight: string;
  armorGlint: string;
  jointDark: string;
  jointMid: string;
  jointLight: string;
  chestBg: string;
  chestRim: string;
  chestFg: string;
  eyeColor: string;
  auraColor: string;
  particleInk: string;
  nightParticleInk: string;
}

export interface TheAgentSpec {
  id: AgentId;
  name: string;
  shortName: string;
  colorTag: string;
  roleTitle: string;
  functionText: string;
  activityLabel: string;
  summaryBubble: string;
  activity: AgentActivityKind;
  room: StudioRoomKey;
  floor: 1 | 2;
  deskX: number;
  deskZ: number;
  massive?: boolean;
  idlePhase: number;
  colors: AgentPaletteTokens;
}

export const ANTI_SLOP_AUDITS: string[] = [
  'Audit bersih: nol titik status dekoratif, nol kartu bersarang, dan kontras teks di atas 4.5:1.',
  'Tipografi editorial portofolio tetap terbaca rapi tanpa badge atau label klise di sekitar karya.',
  'Seluruh tombol dan navigasi memenuhi target sentuh 44px dengan fokus keyboard yang jelas.',
];

export const THE_AGENTS: TheAgentSpec[] = [
  // ================= LANTAI 1 (6 Agen Inti) =================
  {
    id: 'impeccable',
    name: 'Impeccable Agent',
    shortName: 'Impeccable',
    colorTag: 'Ungu',
    roleTitle: 'Craft & Visual Precision',
    functionText: 'Memoles detail piksel, proporsi ruang, dan konsistensi hasil akhir antarmuka.',
    activityLabel: 'poles proporsi & detail',
    summaryBubble: 'Menyelaraskan grid 8px, margin ruang, dan ritme kontras antarmuka.',
    activity: 'kerja',
    room: 'craft',
    floor: 1,
    deskX: -6.7,
    deskZ: 0.05,
    idlePhase: 0.0,
    colors: {
      outline: '#1A0B2E',
      armorDeep: '#3B0F6B',
      armorShadow: '#6B21A8',
      armorMid: '#9333EA',
      armorLight: '#C084FC',
      armorGlint: '#F3E8FF',
      jointDark: '#2E1065',
      jointMid: '#581C87',
      jointLight: '#A855F7',
      chestBg: '#2E0F54',
      chestRim: '#C084FC',
      chestFg: '#FFFFFF',
      eyeColor: '#12071F',
      auraColor: '#22D3EE',
      particleInk: '#7E22CE',
      nightParticleInk: '#E9D5FF',
    },
  },
  {
    id: 'tastes',
    name: 'Tastes Agent',
    shortName: 'Tastes',
    colorTag: 'Pink',
    roleTitle: 'Aesthetic & Rhythm',
    functionText: 'Menjaga cita rasa desain, harmoni palet warna, dan karakter tampilan tetap hidup.',
    activityLabel: 'kurasi ritme warna',
    summaryBubble: 'Menjaga keseimbangan palet 60-30-10 agar suasana karya terasa matang.',
    activity: 'siaga',
    room: 'craft',
    floor: 1,
    deskX: -4.2,
    deskZ: 1.65,
    idlePhase: 1.6,
    colors: {
      outline: '#2A0B1B',
      armorDeep: '#831843',
      armorShadow: '#BE185D',
      armorMid: '#EC4899',
      armorLight: '#F9A8D4',
      armorGlint: '#FFF1F2',
      jointDark: '#6E3219',
      jointMid: '#B45A32',
      jointLight: '#E58D60',
      chestBg: '#70123D',
      chestRim: '#F472B6',
      chestFg: '#FFF1F2',
      eyeColor: '#1F0814',
      auraColor: '#FB7185',
      particleInk: '#BE185D',
      nightParticleInk: '#FBCFE8',
    },
  },
  {
    id: 'frontend',
    name: 'Frontend Design Agent',
    shortName: 'Frontend',
    colorTag: 'Biru',
    roleTitle: 'Architecture & Code Execution',
    functionText: 'Menerjemahkan konsep visual menjadi komponen kode bersih, responsif, dan gerak 60fps.',
    activityLabel: 'rakit komponen 60fps',
    summaryBubble: 'Mengoptimalkan transisi compositor dan merakit tata letak responsif.',
    activity: 'kerja',
    room: 'engineering',
    floor: 1,
    deskX: -1.35,
    deskZ: 1.25,
    idlePhase: 0.85,
    colors: {
      outline: '#0A1633',
      armorDeep: '#1E3A8A',
      armorShadow: '#1D4ED8',
      armorMid: '#0284C7',
      armorLight: '#38BDF8',
      armorGlint: '#E0F2FE',
      jointDark: '#0F172A',
      jointMid: '#1E40AF',
      jointLight: '#60A5FA',
      chestBg: '#0C2D6B',
      chestRim: '#38BDF8',
      chestFg: '#FFFFFF',
      eyeColor: '#091124',
      auraColor: '#38BDF8',
      particleInk: '#0369A1',
      nightParticleInk: '#7DD3FC',
    },
  },
  {
    id: 'uiux',
    name: 'UI UX Pro Max Agent',
    shortName: 'UI/UX',
    colorTag: 'Hijau Cyan',
    roleTitle: 'Information Hierarchy & Flow',
    functionText: 'Merancang alur interaksi yang intuitif, keterbacaan konten, dan kenyamanan navigasi.',
    activityLabel: 'uji alur & navigasi',
    summaryBubble: 'Memastikan fokus keyboard, jarak sentuh 44px, dan hierarki baca lancar.',
    activity: 'belajar',
    room: 'engineering',
    floor: 1,
    deskX: 1.35,
    deskZ: 1.25,
    idlePhase: 2.35,
    colors: {
      outline: '#06201A',
      armorDeep: '#064E3B',
      armorShadow: '#047857',
      armorMid: '#10B981',
      armorLight: '#5EEAD4',
      armorGlint: '#ECFDF5',
      jointDark: '#042F2E',
      jointMid: '#0F766E',
      jointLight: '#2DD4BF',
      chestBg: '#04382F',
      chestRim: '#22D3EE',
      chestFg: '#FFFFFF',
      eyeColor: '#22D3EE',
      auraColor: '#10B981',
      particleInk: '#047857',
      nightParticleInk: '#6EE7B7',
    },
  },
  {
    id: 'apple',
    name: 'Apple Design Agent',
    shortName: 'Apple',
    colorTag: 'Emas',
    roleTitle: 'Clarity & Ergonomic Balance',
    functionText: 'Menjamin kejelasan kontrol, kontras aksesibel, dan kesederhanaan pengalaman pengguna.',
    activityLabel: 'kalibrasi kejelasan kontrol',
    summaryBubble: 'Menyederhanakan tombol dan umpan balik taktil agar langsung dipahami.',
    activity: 'laporan',
    room: 'guard',
    floor: 1,
    deskX: 4.3,
    deskZ: 0.05,
    idlePhase: 3.1,
    colors: {
      outline: '#291404',
      armorDeep: '#78350F',
      armorShadow: '#B45309',
      armorMid: '#F59E0B',
      armorLight: '#FCD34D',
      armorGlint: '#FFFBEB',
      jointDark: '#5C2908',
      jointMid: '#9A480B',
      jointLight: '#FBBF24',
      chestBg: '#6B2F08',
      chestRim: '#FBBF24',
      chestFg: '#FFFFFF',
      eyeColor: '#1C0D03',
      auraColor: '#F59E0B',
      particleInk: '#B45309',
      nightParticleInk: '#FDE68A',
    },
  },
  {
    id: 'antislop',
    name: 'Anti-Slop Agent',
    shortName: 'Anti-Slop',
    colorTag: 'Hitam Massive',
    roleTitle: 'Quality & Anti-Generic Guard',
    functionText: 'Menyaring elemen klise, template generik, dan dekorasi tanpa fungsi sebelum rilis.',
    activityLabel: 'patroli audit antislop',
    summaryBubble: 'Klik dua kali untuk memutar catatan audit kebersihan portofolio.',
    activity: 'siaga',
    room: 'guard',
    floor: 1,
    deskX: 6.75,
    deskZ: 1.55,
    massive: true,
    idlePhase: 3.9,
    colors: {
      outline: '#09090D',
      armorDeep: '#18181F',
      armorShadow: '#272730',
      armorMid: '#3F3F4A',
      armorLight: '#71717E',
      armorGlint: '#E4E4EC',
      jointDark: '#121218',
      jointMid: '#2D2D38',
      jointLight: '#525260',
      chestBg: '#1C0B0F',
      chestRim: '#EF4444',
      chestFg: '#FFFFFF',
      eyeColor: '#EF4444',
      auraColor: '#DC2626',
      particleInk: '#DC2626',
      nightParticleInk: '#FCA5A5',
    },
  },

  // ================= LANTAI 2 MEZZANINE (5 Agen Spesialis Baru) =================
  {
    id: 'design-dna',
    name: 'Design DNA Agent',
    shortName: 'Design DNA',
    colorTag: 'Teal',
    roleTitle: 'Token & Identity Genome',
    functionText: 'Mengunci identitas visual, token warna semantik, dan karakter tipografi lintas halaman.',
    activityLabel: 'petakan token identitas',
    summaryBubble: 'Menyelaraskan token warna dan proporsi skala font sebagai DNA studio.',
    activity: 'kerja',
    room: 'craft',
    floor: 2,
    deskX: -6.4,
    deskZ: -2.5,
    idlePhase: 4.5,
    colors: {
      outline: '#042F2E',
      armorDeep: '#115E59',
      armorShadow: '#0F766E',
      armorMid: '#0D9488',
      armorLight: '#5EEAD4',
      armorGlint: '#CCFBF1',
      jointDark: '#063B37',
      jointMid: '#134E4A',
      jointLight: '#2DD4BF',
      chestBg: '#072E2C',
      chestRim: '#2DD4BF',
      chestFg: '#FFFFFF',
      eyeColor: '#2DD4BF',
      auraColor: '#14B8A6',
      particleInk: '#0F766E',
      nightParticleInk: '#99F6E4',
    },
  },
  {
    id: 'motion',
    name: 'Motion Design Agent',
    shortName: 'Motion',
    colorTag: 'Koral',
    roleTitle: 'Kinetic Curve & Micro-Physics',
    functionText: 'Menyetel kurva akselerasi, fisika spring, dan ritme animasi mikro di seluruh interaksi.',
    activityLabel: 'kalibrasi kurva spring',
    summaryBubble: 'Menjaga gerak responsif pada GPU tanpa tersendat maupun berlebih.',
    activity: 'kerja',
    room: 'craft',
    floor: 2,
    deskX: -3.2,
    deskZ: -2.5,
    idlePhase: 5.2,
    colors: {
      outline: '#2D1004',
      armorDeep: '#7C2D12',
      armorShadow: '#C2410C',
      armorMid: '#F97316',
      armorLight: '#FDBA74',
      armorGlint: '#FFF7ED',
      jointDark: '#431407',
      jointMid: '#9A3412',
      jointLight: '#FB923C',
      chestBg: '#4A1806',
      chestRim: '#FB923C',
      chestFg: '#FFFFFF',
      eyeColor: '#FED7AA',
      auraColor: '#FB923C',
      particleInk: '#C2410C',
      nightParticleInk: '#FDBA74',
    },
  },
  {
    id: 'genjutsu',
    name: 'Genjutsu Agent',
    shortName: 'Genjutsu',
    colorTag: 'Karmisi',
    roleTitle: 'Tells & Visual Critique Auditor',
    functionText: 'Mengaudit gejala desain artifisial, pola visual klise, dan konsistensi sebelum peluncuran.',
    activityLabel: 'audit tells visual & cast',
    summaryBubble: 'Memindai ilusi visual dan menyaring pola generik hingga tersisa esensi.',
    activity: 'laporan',
    room: 'engineering',
    floor: 2,
    deskX: 0.0,
    deskZ: -2.5,
    idlePhase: 5.9,
    colors: {
      outline: '#2A0510',
      armorDeep: '#881337',
      armorShadow: '#BE123C',
      armorMid: '#E11D48',
      armorLight: '#FDA4AF',
      armorGlint: '#FFF1F2',
      jointDark: '#4C0519',
      jointMid: '#9F1239',
      jointLight: '#FB7185',
      chestBg: '#3D0716',
      chestRim: '#FB7185',
      chestFg: '#FFFFFF',
      eyeColor: '#FB7185',
      auraColor: '#F43F5E',
      particleInk: '#BE123C',
      nightParticleInk: '#FDA4AF',
    },
  },
  {
    id: 'threejs',
    name: 'Three.js 3D Agent',
    shortName: 'Three.js',
    colorTag: 'Kobalt',
    roleTitle: 'Spatial Geometry & PBR Shaders',
    functionText: 'Merakit komposisi 3D prosedural, pencahayaan PBR, bayangan, dan proyeksi isometrik.',
    activityLabel: 'rakit geometri & PBR',
    summaryBubble: 'Mengatur pencahayaan isometrik, tekstur prosedural, dan draw call ringan.',
    activity: 'belajar',
    room: 'guard',
    floor: 2,
    deskX: 3.2,
    deskZ: -2.5,
    idlePhase: 6.6,
    colors: {
      outline: '#081838',
      armorDeep: '#1E3A8A',
      armorShadow: '#1D4ED8',
      armorMid: '#2563EB',
      armorLight: '#93C5FD',
      armorGlint: '#EFF6FF',
      jointDark: '#0F172A',
      jointMid: '#1E40AF',
      jointLight: '#60A5FA',
      chestBg: '#0E245C',
      chestRim: '#60A5FA',
      chestFg: '#FFFFFF',
      eyeColor: '#93C5FD',
      auraColor: '#3B82F6',
      particleInk: '#1D4ED8',
      nightParticleInk: '#BFDBFE',
    },
  },
  {
    id: 'gsap',
    name: 'GSAP Choreo Agent',
    shortName: 'GSAP',
    colorTag: 'Zamrud',
    roleTitle: 'Timeline & Camera Choreography',
    functionText: 'Mengatur sekuens masuk HUD, pergerakan kamera isometrik, dan sinkronisasi kru.',
    activityLabel: 'orkestrasi timeline kru',
    summaryBubble: 'Menjaga tempo stagger masuk dan fokus kamera bergerak mulus saat diklik.',
    activity: 'siaga',
    room: 'guard',
    floor: 2,
    deskX: 6.4,
    deskZ: -2.5,
    idlePhase: 7.3,
    colors: {
      outline: '#162605',
      armorDeep: '#365314',
      armorShadow: '#4D7C0F',
      armorMid: '#65A30D',
      armorLight: '#BEF264',
      armorGlint: '#F7FEE7',
      jointDark: '#1A2E05',
      jointMid: '#3F6212',
      jointLight: '#84CC16',
      chestBg: '#223A09',
      chestRim: '#A3E635',
      chestFg: '#FFFFFF',
      eyeColor: '#BEF264',
      auraColor: '#84CC16',
      particleInk: '#4D7C0F',
      nightParticleInk: '#D9F99D',
    },
  },
];
