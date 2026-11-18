import {useEffect, useRef} from 'react';
import type {AgentId, TheAgentSpec} from '../data/theAgents';

export type StoryboardState = 'idle' | 'hover' | 'pulse';

interface AgentStoryboardSpriteProps {
  agent: TheAgentSpec;
  state: StoryboardState;
  clockSec: number;
  pulseProgress: number;
  lookX?: number;
  lookY?: number;
  isSelected?: boolean;
  neighborGlow?: string | null;
  neighborTiltDeg?: number;
  darkSurface?: boolean;
}

type PaletteMap = Record<string, string | undefined>;

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  ox: number,
  oy: number,
  palette: PaletteMap,
) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(ox + x), Math.round(oy + y), 1, 1);
    }
  }
}

const HEAD_DEFAULT: string[] = [
  '.........OOOO.........',
  '....OOO..OHLO..OOO....',
  '...OHLO..OMLO..OLHO...',
  '...ODMO.OOMMOO.OMDO...',
  '..OOMMMLLLLLLLLMMMOO..',
  '.OHLMMMMMMMMMMMMMMLHO.',
  '.OMMLLMMMMMMMMMMLLMDO.',
  '..OOMMMMEEMMMMEEMMOO..',
  '...OMMMMEEMMMMEEMMO...',
  '...ODMMMMMMMMMMMMDO...',
  '...OSSSSMMMMMMSSSSO...',
  '....OOOOOOOOOOOOOO....',
];

const HEAD_APPLE: string[] = [
  '..........OOOO........',
  '.........OHLHO........',
  '....OOO..OMLO..OOO....',
  '...OHLO..OODO..OLHO...',
  '...ODMMOOMMMMOOOMDO...',
  '..OOHLLLLLLLLLLLLHOO..',
  '.OHLMMMMMMMMMMMMMMLHO.',
  '..OOMMMMEEMMMMEEMMOO..',
  '...OMMMMEEMMMMEEMMO...',
  '...ODMMMMMMMMMMMMDO...',
  '...OSSSSMMMMMMSSSSO...',
  '....OOOOOOOOOOOOOO....',
];

const HEAD_UIUX: string[] = [
  '.........OOOO.........',
  '....OOO..OHLO..OOO....',
  '...OHLO..OMLO..OLHO...',
  '...ODMO.OOMMOO.OMDO...',
  '..OOMMMLLLLLLLLMMMOO..',
  '.OHLMMOOMMMMMMOOMMLHO.',
  '.OMMOEEEMMMMMMEEEMO...',
  '..OOMMEEMMMMMMEEMMOO..',
  '...OMMOOOOOOOOOOMMO...',
  '...ODMOFOOOFOOOFOOD...',
  '...OSSSSMMMMMMSSSSO...',
  '....OOOOOOOOOOOOOO....',
];

const HEAD_GENJUTSU: string[] = [
  '........OOOOOO........',
  '....OOO.OHRRHO.OOO....',
  '...OHLO.OMRRLO.OLHO...',
  '...ODMO.OOMMOO.OMDO...',
  '..OOMMMLLLLLLLLMMMOO..',
  '.OHLMMOOOOOOOOOOMMLHO.',
  '.OMMOEEEMMEEMMEEEMMDO.',
  '..OOMMEEMMEEMMEEMMOO..',
  '...OMMOOOOOOOOOOMMO...',
  '...ODMMMMMMMMMMMMDO...',
  '...OSSSSMMMMMMSSSSO...',
  '....OOOOOOOOOOOOOO....',
];

const TORSO_MATRIX: string[] = [
  '......OOOOOOOOOO......',
  '....OOHLLLLLLLLHOO....',
  '..OODLLLLMMMMMMLLDOO..',
  '.ODHLMMMMMMMMMMMMHLDO.',
  '.ODMORRRRRRRRRRRROMDO.',
  '.OSMORBBBBBBBBBBROMDO.',
  '.OSMORBBBBBBBBBBROMDO.',
  '.OSMORBBBBBBBBBBROMDO.',
  '.OSMORBBBBBBBBBBROMDO.',
  '.OSMORBBBBBBBBBBROMDO.',
  '.ODMORBBBBBBBBBBROMDO.',
  '.ODMORRRRRRRRRRRROMDO.',
  '..ODSOOOOOOOOOOOOSDO..',
  '...OOKKUUUUUUUUKKOO...',
  '....OJJKKKKKKKKJJO....',
  '...OODDDDDDDDDDDDOO...',
  '...OMMLLLLLLLLLLMMO...',
  '....OSSSSJJJJSSSSO....',
  '.....OOOO....OOOO.....',
];

const LEGS_IDLE: string[] = [
  '....OOOOO....OOOOO....',
  '...OKUUUJO..OJUUKKO...',
  '...OKKKKJO..OJKKKKO...',
  '..OOKMMMKO..OKMMMKO0..',
  '..ODLLMMMO..OMMMLLDO..',
  '..ODMMHMLO..OLMHMMDO..',
  '..OSSSSSSO..OSSSSSSO..',
  '..OOMMMKOO..OOKMMMOO..',
  '..ODHMMMSO..OSMMMHDO..',
  '..ODLMMMDO..ODMMMLDO..',
  '..OSMMMMDO..ODMMMMSO..',
  '..ODSSSSDO..ODSSSSDO..',
  '.OODDDDDDO..ODDDDDDOO.',
  '.OMMMMMMLO..OLMMMMMMO.',
  '.OHLLLLSMO..OMSLLLLHO.',
  '.ODDDDDDDO..ODDDDDDDO.',
  '.OJJJJJJJO..OJJJJJJJO.',
  '..OOOOOOO....OOOOOOO..',
];

const LEGS_HOVER: string[] = [
  '....OOOOO....OOOOO....',
  '...OKUUUJO..OJUUKKO...',
  '...OKKKKJO..OJKKKKO...',
  '..OOKMMMKO..OKMMMKO...',
  '..ODLLMMMO..OMMMLLDO..',
  '..ODMMHMLO..OLMHMMDO..',
  '..OSSSSSSO...OSSSSSSO.',
  '..OOMMMKOO...OOKMMMOO.',
  '...ODHMMMSO...ODMMMHDO',
  '...ODLMMMDO...ODSSSDO.',
  '...OSMMMMDO..OOMMMMMLO',
  '...ODSSSSDO..OHLLLLSMO',
  '..OODDDDDDO..ODDDDDDDO',
  '..OMMMMMMLO..OJJJJJJJO',
  '..OHLLLLSMO...OOOOOOO.',
  '..ODDDDDDDO...........',
  '..OJJJJJJJO...........',
  '...OOOOOOO............',
];

const ARM_LEFT_IDLE: string[] = [
  '.OOOOOO...',
  'OHLLLLMO..',
  'OLMMMMMSO.',
  'OMMMMMMMO.',
  'ODSSSSSDO.',
  '.OOKUUOO..',
  '.OJJKKJO..',
  '.OOMMMOO..',
  'OHLMMMDO..',
  'OLMMMMDO..',
  'OMMMMMDO..',
  'OSSSSSDO..',
  '.OODDOO...',
  '.OLOOHO...',
  '.OLOOHO...',
  '.OOOOOO...',
];

const ARM_RIGHT_IDLE: string[] = [
  '...OOOOOO.',
  '..OMLLLLHO',
  '.OSMMMMMLO',
  '.OMMMMMMMO',
  '.ODSSSSSDO',
  '..OOKUUOO.',
  '..OJKKJJO.',
  '..OOMMMOO.',
  '..ODMMMLHO',
  '..ODMMMMLO',
  '..ODMMMMMO',
  '..ODSSSSSO',
  '...OODDOO.',
  '...OHOOLO.',
  '...OHOOLO.',
  '...OOOOOO.',
];

const ARM_RIGHT_WAVE: string[] = [
  '..OOOO....',
  '.OHOOLO...',
  '.OHOOLO...',
  '..OODDOO..',
  '.OMMMMMDO.',
  '.OLMMMMDO.',
  'OHLMMMMDO.',
  'OSSSSSSDO.',
  '.OOKUUOO..',
  '..OJKJJO..',
  '..OMMMMLO.',
  '..OMMMMMO.',
  '..ODSSSSO.',
  '...OOOOO..',
];

const CHEST_SYMBOLS: Record<Exclude<AgentId, 'antislop'>, string[]> = {
  impeccable: [
    '....FF....',
    '....FFF...',
    '.RR.FFF...',
    '.RRFFFFFF.',
    '.RRFFFFFF.',
    '.RRFFFFFF.',
    '.RR.FFFF..',
  ],
  frontend: [
    '..F....F..',
    '.FF.F..FF.',
    'FF..F...FF',
    '.FF.F..FF.',
    '..F.F..F..',
    '....F.....',
    '..........',
  ],
  tastes: [
    '.FFFF..FF.',
    '.FFFF..FF.',
    '.FFFFF.FF.',
    '.FFFFF.FF.',
    '..FFF..FF.',
    '.......F..',
    '.......F..',
  ],
  uiux: [
    '....FF....',
    '..FFFFFF..',
    '....FF....',
    '..RRRRRR..',
    '....RR....',
    '..FFFFFF..',
    '....FF....',
  ],
  apple: [
    '.....FF...',
    '....FF....',
    '..FFFFFF..',
    '.FFFFFFF..',
    '.FFFFFF...',
    '.FFFFFFFF.',
    '..FF..FF..',
  ],
  'design-dna': [
    '.FF....FF.',
    '..FF..FF..',
    '...FFFF...',
    '..RR..RR..',
    '...FFFF...',
    '..FF..FF..',
    '.FF....FF.',
  ],
  motion: [
    '.......FF.',
    '.....FFFF.',
    '...FF..FF.',
    '..FF......',
    '.FFFF.....',
    '.FF.......',
    '..........',
  ],
  genjutsu: [
    '...FFFF...',
    '..F.RR.F..',
    '.FRRFFRRF.',
    '.FF.FF.FF.',
    '.FRRFFRRF.',
    '..F.RR.F..',
    '...FFFF...',
  ],
  threejs: [
    '....FF....',
    '..FFFFFF..',
    '.FF.FF.FF.',
    '.FFFFFF.F.',
    '.FF.FF.FF.',
    '..FFFFFF..',
    '....FF....',
  ],
  gsap: [
    '.FFFFFF...',
    '..........',
    '..FFFFFFF.',
    '..........',
    '.FFFFF....',
    '..........',
    '...FFFFFF.',
  ],
};

const MASSIVE_HEAD: string[] = [
  '..OO..................OO..',
  '..OHLO..............OLHO..',
  '...OMMO...OOOOOO...OMMO...',
  '...ODMMOOHLLLLLLHOOMMDO...',
  '....OOMMMMMMMMMMMMMMOO....',
  '....OHLMMMMMMMMMMMMLHO....',
  '....OMMOOOOOOOOOOOOMMO....',
  '....OMMOEEEMMMMEEEMOMO....',
  '....ODMMOEEEMMEEEOMMDO....',
  '.....ODMMOOOOOOOOOMDO.....',
  '.....OSSSSMMMMMMSSSSO.....',
  '......OOOOOOOOOOOOOO......',
];

const MASSIVE_TORSO: string[] = [
  '.......OOOOOOOOOOOO.......',
  '....OOOHLLLLLLLLLLHOOO....',
  '..OODLLLLMMMMMMMMMMLLDOO..',
  '.ODHLMMMMMMMMMMMMMMMMHLDO.',
  '.ODMOORRRRRRRRRRRRRROOMDO.',
  '.OSMORRBBBBBBBBBBBBRROMDO.',
  '.OSMORRBFFFFFFFFFBBRROMDO.',
  '.OSMORRBFEEBBBBEEFBRROMDO.',
  '.OSMORRBFBFEEEEFBFBRROMDO.',
  '.OSMORRBFBFFWWFFBFBRROMDO.',
  '.OSMORRBFBFEEEEFBFBRROMDO.',
  '.ODMORRBFEEBBBBEEFBRROMDO.',
  '.ODMORRBBFFFFFFFFBBRROMDO.',
  '.ODMOORRRRRRRRRRRRRROOMDO.',
  '..ODSOOOOOOOOOOOOOOOOOOSDO..',
  '...OODSSSMMMMMMMMMMSSSD0O...',
  '....OJJJJKKKKKKKKKKJJJJO....',
  '...OODDDDDDDDDDDDDDDDDDOO...',
  '...OMMLLLLLLRRRRLLLLLLMMO...',
  '....OSSSSJJJRRRRJJJSSSSO....',
  '.....OOOOO..OOOO..OOOOO.....',
];

const MASSIVE_LEGS_IDLE: string[] = [
  '...OOOOOO......OOOOOO...',
  '..OKKKKKJO....OJKKKKKO..',
  '..ODMMMMLO....OLMMMMDO..',
  '.OOSMMMMMLOOOOLMMMMMSOO.',
  '.ODLLMMMMO....OMMMMLLDO.',
  '.ODMMHMMDO....ODMMHMMDO.',
  '.OSSSSSSSO....OSSSSSSSO.',
  '.OOKKKKKOO....OOKKKKKOO.',
  '.ODHMMMMDO....ODMMMMHDO.',
  '.ODLMMMMDO....ODMMMMLDO.',
  '.OSMMMMMDO....ODMMMMMSO.',
  '.ODSSSSSDO....ODSSSSSDO.',
  'OODDDDDDDO....ODDDDDDDOO',
  'OMMMMMMMLO....OLMMMMMMMO',
  'OHLLLLLSMO....OMSLLLLLHO',
  'ODDDDDDDDO....ODDDDDDDDO',
  'OJJJJJJJJO....OJJJJJJJJO',
  '.OOOOOOOO......OOOOOOOO.',
];

const MASSIVE_LEGS_HOVER: string[] = [
  '...OOOOOO......OOOOOO...',
  '..OKKKKKJO....OJKKKKKO..',
  '..ODMMMMLO....OLMMMMDO..',
  '.OOSMMMMMLOOOOLMMMMMSOO.',
  '.ODLLMMMMO....OMMMMLLDO.',
  '.ODMMHMMDO....ODMMHMMDO.',
  '.OSSSSSSSO.....OSSSSSSSO',
  '.OOKKKKKOO.....OOKKKKKOO',
  '..ODHMMMMDO....ODMMMMHDO',
  '..ODLMMMMDO....ODSSSSDO.',
  '..OSMMMMMDO...OOMMMMMMLO',
  '..ODSSSSSDO...OHLLLLLSMO',
  '.OODDDDDDDO...ODDDDDDDDO',
  '.OMMMMMMMLO...OJJJJJJJJO',
  '.OHLLLLLSMO....OOOOOOOO.',
  '.ODDDDDDDDO.............',
  '.OJJJJJJJJO.............',
  '..OOOOOOOO..............',
];

const MASSIVE_ARM_LEFT: string[] = [
  '.OOOOOOO....',
  'OOHLLLHOO...',
  'OHMMMMMMMO..',
  'OMMMMMMMMHO.',
  'ODSSSSSSDO..',
  '.OOKKKKOO...',
  '.OJJJJJJO...',
  '.OOMMMMOO...',
  'OHLMMMMDO...',
  'OLMMMMMDO...',
  'OMMMMMMDO...',
  'OSSSSSSDO...',
  '.OODDDDOO...',
  '.OLOOOHO....',
  '.OLOOOHO....',
  '.OOOOOOO....',
];

const MASSIVE_ARM_RIGHT: string[] = [
  '....OOOOOOO.',
  '...OOHLLLHOO',
  '..OMMMMMMMHO',
  '.OHMMMMMMMMO',
  '..ODSSSSSSDO',
  '...OOKKKKOO.',
  '...OJJJJJJO.',
  '...OOMMMMOO.',
  '...ODMMMMLHO',
  '...ODMMMMMLO',
  '...ODMMMMMMO',
  '...ODSSSSSSO',
  '...OODDDDOO.',
  '....OHOOOLO.',
  '....OHOOOLO.',
  '....OOOOOOO.',
];

const MASSIVE_ARM_RIGHT_WAVE: string[] = [
  '..OOOOO.....',
  '.OHOOOLO....',
  '.OHOOOLO....',
  '..OODDDDOO..',
  '.OMMMMMMDO..',
  'OHLMMMMMDO..',
  'OMMMMMMMDO..',
  'OSSSSSSSDO..',
  '..OOKKKKOO..',
  '...OJJJJJO..',
  '..OOMMMMMMO.',
  '..OMMMMMMMO.',
  '..ODSSSSSSO.',
  '...OOOOOOO..',
];

function drawStoryboardOverlayParticles(
  ctx: CanvasRenderingContext2D,
  agent: TheAgentSpec,
  width: number,
  state: StoryboardState,
  clockSec: number,
  pulseProgress: number,
  darkSurface: boolean,
) {
  const {id, colors} = agent;
  const ink = darkSurface ? colors.nightParticleInk : colors.particleInk;
  const glow = colors.auraColor;
  const isHover = state === 'hover';
  const isPulse = state === 'pulse';
  const drift1 = Math.round(Math.sin(clockSec * 2.5 + agent.idlePhase) * 1.4);
  const drift2 = Math.round(Math.cos(clockSec * 2.1 + agent.idlePhase) * 1.4);

  if (isHover) {
    ctx.fillStyle = ink;
    ctx.fillRect(3, 14 + drift1, 1, 3);
    ctx.fillRect(5, 13 + drift1, 1, 3);
  }

  const drawPlus = (cx: number, cy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx, cy - 1, 1, 3);
    ctx.fillRect(cx - 1, cy, 3, 1);
  };

  if (id === 'impeccable' || id === 'apple' || id === 'design-dna') {
    drawPlus(6, 15 + drift1, ink);
    drawPlus(width - 7, 19 + drift2, glow);
    if (isPulse || isHover) {
      drawPlus(7, 39 + drift2, ink);
      drawPlus(width - 8, 42 + drift1, ink);
    }
    if (isPulse) {
      const burst = Math.round(Math.sin(pulseProgress * Math.PI) * 3);
      drawPlus(4, 28 - burst, '#FFFFFF');
      drawPlus(width - 5, 28 - burst, '#FFFFFF');
      drawPlus(Math.floor(width / 2), 2, ink);
    }
    return;
  }

  if (id === 'tastes' || id === 'motion') {
    ctx.fillStyle = ink;
    const steamY = 12 + drift1;
    ctx.fillRect(7, steamY, 1, 2);
    ctx.fillRect(6, steamY + 2, 1, 2);
    ctx.fillRect(7, steamY + 4, 1, 2);
    ctx.fillRect(width - 8, steamY + 1, 1, 2);
    ctx.fillRect(width - 7, steamY + 3, 1, 2);
    ctx.fillRect(width - 8, steamY + 5, 1, 2);
    drawPlus(5, 36 + drift2, glow);
    drawPlus(width - 6, 38 + drift1, ink);
    if (isPulse) {
      drawPlus(10, 6, '#FFFFFF');
      drawPlus(width - 11, 6, '#FFFFFF');
    }
    return;
  }

  if (id === 'frontend' || id === 'uiux' || id === 'threejs' || id === 'gsap') {
    ctx.fillStyle = ink;
    ctx.fillRect(6, 16 + drift1, 1, 4);
    ctx.fillRect(5, 17 + drift1, 1, 1);
    ctx.fillRect(width - 8, 18 + drift2, 3, 4);
    ctx.clearRect(width - 7, 19 + drift2, 1, 2);
    ctx.fillRect(width - 7, 38 + drift1, 1, 4);
    if (isPulse || isHover) {
      drawPlus(6, 40 + drift2, glow);
      drawPlus(width - 6, 9 + drift1, ink);
    }
    return;
  }

  if (id === 'antislop' || id === 'genjutsu') {
    const drawMiniX = (cx: number, cy: number) => {
      ctx.fillStyle = ink;
      ctx.fillRect(cx - 2, cy - 2, 5, 5);
      ctx.fillStyle = '#FFF5F5';
      ctx.fillRect(cx - 1, cy - 1, 1, 1);
      ctx.fillRect(cx + 1, cy - 1, 1, 1);
      ctx.fillRect(cx, cy, 1, 1);
      ctx.fillRect(cx - 1, cy + 1, 1, 1);
      ctx.fillRect(cx + 1, cy + 1, 1, 1);
    };
    drawMiniX(7, 16 + drift1);
    drawMiniX(width - 8, 15 + drift2);
    drawPlus(6, 44 + drift2, ink);
    drawPlus(width - 7, 46 + drift1, ink);
    if (isPulse) {
      drawMiniX(10, 32);
      drawMiniX(width - 11, 32);
    }
  }
}

export function AgentStoryboardSprite({
  agent,
  state,
  clockSec,
  pulseProgress,
  lookX = 0,
  lookY = 0,
  isSelected = false,
  neighborGlow = null,
  neighborTiltDeg = 0,
  darkSurface = true,
}: AgentStoryboardSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMassive = Boolean(agent.massive);
  const canvasW = isMassive ? 64 : 56;
  const canvasH = isMassive ? 74 : 68;

  const idleWave = Math.sin(clockSec * 2.1 + agent.idlePhase);
  const hoverWave = Math.sin(clockSec * 7.5);
  const pulseSwayDeg =
    state === 'pulse' ? Math.sin(pulseProgress * Math.PI * 3) * 3.8 : 0;
  const totalRotateDeg = pulseSwayDeg + (state === 'idle' ? neighborTiltDeg : 0);

  const floatOffsetPx =
    state === 'hover'
      ? -7 + hoverWave * 1.4
      : state === 'pulse'
        ? -4 - Math.sin(pulseProgress * Math.PI) * 5
        : idleWave * 4.5;

  const shadowScale =
    state === 'hover' ? 0.84 : state === 'pulse' ? 0.86 : 0.94 - idleWave * 0.06;

  const isBlinking =
    state !== 'pulse' && ((clockSec + agent.idlePhase * 1.37) % 4.6) > 4.46;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const {colors, id} = agent;
    const isPulseFlash =
      state === 'pulse' && Math.sin(pulseProgress * Math.PI * 2.5) > 0.05;
    const isBright = state === 'hover' || state === 'pulse';

    const closedEyeShade =
      id === 'antislop' || id === 'uiux' || id === 'genjutsu'
        ? colors.armorDeep
        : colors.armorShadow;

    const palette: PaletteMap = {
      O: colors.outline,
      D: colors.armorDeep,
      S: colors.armorShadow,
      M: isPulseFlash ? colors.armorLight : colors.armorMid,
      L: isPulseFlash ? colors.armorGlint : colors.armorLight,
      H: isPulseFlash ? '#FFFFFF' : colors.armorGlint,
      J: colors.jointDark,
      K: colors.jointMid,
      U: colors.jointLight,
      B: colors.chestBg,
      R: isBright ? colors.chestFg : colors.chestRim,
      F: isPulseFlash ? '#FFFFFF' : colors.chestFg,
      E: isBlinking
        ? closedEyeShade
        : isPulseFlash && id === 'antislop'
          ? '#FFFFFF'
          : colors.eyeColor,
      W: '#FFFFFF',
      '0': colors.outline,
    };

    const armWaveStep = state === 'hover' && Math.sin(clockSec * 12) > 0 ? -1 : 0;

    if (isMassive) {
      const bodyX = 19;
      drawMatrix(
        ctx,
        state === 'hover' ? MASSIVE_LEGS_HOVER : MASSIVE_LEGS_IDLE,
        bodyX + 1,
        52,
        palette,
      );
      drawMatrix(ctx, MASSIVE_TORSO, bodyX, 31, palette);
      drawMatrix(ctx, MASSIVE_ARM_LEFT, 45, 33, palette);
      if (state === 'hover') {
        drawMatrix(ctx, MASSIVE_ARM_RIGHT_WAVE, 8, 25 + armWaveStep, palette);
      } else {
        drawMatrix(ctx, MASSIVE_ARM_RIGHT, 8, 33, palette);
      }
      drawMatrix(ctx, MASSIVE_HEAD, bodyX, 19, palette);

      if (!isBlinking && (lookX !== 0 || lookY !== 0)) {
        ctx.fillStyle = '#FECACA';
        const px = lookX > 0 ? 1 : lookX < 0 ? -1 : 0;
        const py = lookY > 0 ? 1 : 0;
        ctx.fillRect(bodyX + 9 + px, 26 + py, 1, 1);
        ctx.fillRect(bodyX + 16 + px, 26 + py, 1, 1);
      }

      drawStoryboardOverlayParticles(
        ctx,
        agent,
        canvasW,
        state,
        clockSec,
        pulseProgress,
        darkSurface,
      );
      return;
    }

    const bodyX = 17;
    drawMatrix(
      ctx,
      state === 'hover' ? LEGS_HOVER : LEGS_IDLE,
      bodyX,
      46,
      palette,
    );
    drawMatrix(ctx, TORSO_MATRIX, bodyX, 27, palette);

    const chestKey = id as Exclude<AgentId, 'antislop'>;
    drawMatrix(ctx, CHEST_SYMBOLS[chestKey], bodyX + 6, 33, palette);

    drawMatrix(ctx, ARM_LEFT_IDLE, 39, 29, palette);
    if (state === 'hover') {
      drawMatrix(ctx, ARM_RIGHT_WAVE, 7, 21 + armWaveStep, palette);
    } else {
      drawMatrix(ctx, ARM_RIGHT_IDLE, 7, 29, palette);
    }

    const headMatrix =
      id === 'apple'
        ? HEAD_APPLE
        : id === 'uiux'
          ? HEAD_UIUX
          : id === 'genjutsu'
            ? HEAD_GENJUTSU
            : HEAD_DEFAULT;
    drawMatrix(ctx, headMatrix, bodyX, 15, palette);

    if (!isBlinking && (lookX !== 0 || lookY !== 0)) {
      const gx = lookX > 0 ? 1 : 0;
      const gy = lookY > 0 ? 1 : 0;
      ctx.fillStyle = id === 'uiux' || id === 'genjutsu' ? '#FFFFFF' : colors.armorGlint;
      if (id === 'uiux' || id === 'genjutsu') {
        ctx.fillRect(bodyX + 6 + gx, 21 + gy, 1, 1);
        ctx.fillRect(bodyX + 15 + gx, 21 + gy, 1, 1);
      } else {
        ctx.fillRect(bodyX + 8 + gx, 22 + gy, 1, 1);
        ctx.fillRect(bodyX + 14 + gx, 22 + gy, 1, 1);
      }
    }

    drawStoryboardOverlayParticles(
      ctx,
      agent,
      canvasW,
      state,
      clockSec,
      pulseProgress,
      darkSurface,
    );
  }, [
    agent,
    state,
    clockSec,
    pulseProgress,
    lookX,
    lookY,
    isBlinking,
    darkSurface,
    canvasW,
    canvasH,
    isMassive,
  ]);

  const showFloorHighlight = isSelected || state !== 'idle';

  return (
    <div
      className={`relative flex flex-col items-center justify-end select-none ${
        isMassive
          ? 'w-[144px] h-[176px] sm:w-[164px] sm:h-[200px]'
          : 'w-[110px] h-[132px] sm:w-[126px] sm:h-[152px]'
      }`}
    >
      <div
        className="relative flex items-center justify-center will-change-transform"
        style={{
          transform: `translate3d(0, ${floatOffsetPx.toFixed(1)}px, 0) rotate(${totalRotateDeg.toFixed(2)}deg)`,
          transition: state === 'hover' ? 'transform 160ms ease-out' : undefined,
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          aria-hidden="true"
          className={`${
            isMassive
              ? 'w-[138px] h-[162px] sm:w-[158px] sm:h-[186px]'
              : 'w-[104px] h-[126px] sm:w-[120px] sm:h-[144px]'
          }`}
          style={{
            imageRendering: 'pixelated',
            filter:
              state === 'pulse'
                ? `drop-shadow(0 0 15px ${agent.colors.auraColor}90)`
                : state === 'hover'
                  ? `drop-shadow(0 6px 13px ${agent.colors.auraColor}52)`
                  : neighborGlow
                    ? `drop-shadow(0 4px 10px ${neighborGlow}40)`
                    : darkSurface
                      ? `drop-shadow(0 6px 14px ${agent.colors.auraColor}3A)`
                      : `drop-shadow(0 4px 8px ${agent.colors.auraColor}24)`,
          }}
        />
      </div>

      <div className="relative flex items-center justify-center -mt-2">
        <div
          aria-hidden="true"
          className={`${
            isMassive ? 'w-24 sm:w-28 h-3' : 'w-16 sm:w-20 h-2.5'
          } rounded-full blur-[2px] will-change-transform transition-colors duration-200 ${
            darkSurface ? 'bg-black/65' : 'bg-black/14'
          }`}
          style={{
            transform: `scaleX(${shadowScale.toFixed(3)}) scaleY(${(shadowScale * 0.95).toFixed(3)})`,
            backgroundColor: showFloorHighlight
              ? `${agent.colors.auraColor}${darkSurface ? '66' : '48'}`
              : neighborGlow
                ? `${neighborGlow}28`
                : undefined,
            boxShadow: showFloorHighlight
              ? `0 0 16px ${agent.colors.auraColor}${darkSurface ? '85' : '45'}`
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
