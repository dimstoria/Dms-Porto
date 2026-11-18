import {MEDIA_ASSETS} from './mediaAssets';

export type FilmCategory = 'All' | 'Commercial' | 'Music Video' | 'Documentary' | 'Color & Edit';

export interface FilmProject {
  id: string;
  title: string;
  client: string;
  category: Exclude<FilmCategory, 'All'>;
  year: string;
  duration: string;
  durationSeconds: number;
  fps: string;
  aspect: string;
  role: string;
  cameraSpec: string;
  colorSuite: string;
  image: string;
  imageKind?: 'image' | 'video';
  videoUrl?: string;
  youtubeId?: string;
  youtubeStartSeconds?: number;
  summary: string;
  editNotes: string;
  chapters: Array<{label: string; timecode: string; ratio: number}>;
  featured?: boolean;
}

export const SHOWREEL_PROJECT: FilmProject = {
  id: 'showreel-2026',
  title: '2026 Director & Editor Showreel',
  client: 'Selected Anthology',
  category: 'Color & Edit',
  year: '2026',
  duration: 'From 03:30',
  durationSeconds: 108,
  fps: '24fps',
  aspect: '16:9',
  role: 'Director of Photography & Lead Editor',
  cameraSpec: 'ARRI Alexa Mini LF · Cooke Anamorphic /i',
  colorSuite: 'DaVinci Resolve Studio · Kodak 2383 Print Emulation',
  image: MEDIA_ASSETS.showreelHero,
  youtubeId: 'SGBmea0F-7M',
  youtubeStartSeconds: 210,
  summary:
    'A rhythm-driven montage spanning architectural commercials, minimalist music videos, and tactile brand documentaries, cued directly to the 03:30 showreel sequence.',
  editNotes:
    'Cut strictly on percussive breathing cues and spatial camera momentum, bridging natural daylight exteriors with crisp studio cyclorama sequences.',
  chapters: [
    {label: 'Cue Start', timecode: '03:30', ratio: 0},
    {label: 'Architectural Light', timecode: '03:58', ratio: 0.26},
    {label: 'Motion & Velocity', timecode: '04:24', ratio: 0.5},
    {label: 'Acoustic & Portrait', timecode: '04:51', ratio: 0.75},
  ],
};

export const PORTFOLIO_FILMS: FilmProject[] = [
  {
    id: 'solis-pavilion',
    title: 'Morning Geometry at Solis Pavilion',
    client: 'Kengo Architectural Press',
    category: 'Commercial',
    year: '2026',
    duration: '01:32',
    durationSeconds: 92,
    fps: '24fps',
    aspect: '2.39:1',
    role: 'Cinematographer & Offline Editor',
    cameraSpec: 'RED V-Raptor 8K · Atlas Orion Anamorphic',
    colorSuite: 'DaVinci Resolve · Clean Daylight Contrast',
    image: MEDIA_ASSETS.architecturalFilm,
    summary:
      'Architectural launch film capturing how morning sunlight traverses travertine columns and floor-to-ceiling glazing over a single quiet morning.',
    editNotes:
      'Built around long, uninterrupted dolly reveals paired with subtle room-tone Foley and crisp match-cuts on shadow angles.',
    chapters: [
      {label: 'Approach Path', timecode: '00:00', ratio: 0},
      {label: 'East Glazing', timecode: '00:31', ratio: 0.34},
      {label: 'Interior Stillness', timecode: '01:02', ratio: 0.67},
    ],
    featured: true,
  },
  {
    id: 'polestar-horizon',
    title: 'Zero Noise: Salt Flat Dynamics',
    client: 'Nordic Mobility Lab',
    category: 'Commercial',
    year: '2025',
    duration: '01:15',
    durationSeconds: 75,
    fps: '60fps',
    aspect: '16:9',
    role: 'Lead Video Editor & Colorist',
    cameraSpec: 'ARRI Alexa 35 · Zeiss Supreme Prime',
    colorSuite: 'ACEScct · Neutral Silver & Cool Slate',
    image: MEDIA_ASSETS.automotiveMotion,
    summary:
      'High-key automotive campaign highlighting aerodynamic silence and crisp surface reflections across expansive salt flats.',
    editNotes:
      'Variable speed ramps from 60fps tracking shots down to 24fps cabin stillness without breaking visual continuity.',
    chapters: [
      {label: 'Horizon Wide', timecode: '00:00', ratio: 0},
      {label: 'Wheel Velocity', timecode: '00:24', ratio: 0.32},
      {label: 'Quiet Cabin', timecode: '00:51', ratio: 0.68},
    ],
  },
  {
    id: 'white-cyclorama',
    title: 'Monolith Sessions: Live in White',
    client: 'Nadia Tan & Verve Records',
    category: 'Music Video',
    year: '2026',
    duration: '03:42',
    durationSeconds: 222,
    fps: '24fps',
    aspect: '4:3',
    role: 'Director, DP & Rhythm Editor',
    cameraSpec: 'Sony Venice 2 · Leica Summilux-C',
    colorSuite: 'High-Key Monochrome Curve + Subtle Halation',
    image: MEDIA_ASSETS.musicPerformance,
    summary:
      'One-take inspired performance video staged inside an infinity white cyclorama, stripping away props to let vocal phrasing dictate every cut.',
    editNotes:
      'Multi-pass motion-control takes seamlessly stitched on piano sustain pedals and silhouette turns.',
    chapters: [
      {label: 'Piano Intro', timecode: '00:00', ratio: 0},
      {label: 'First Chorus', timecode: '01:08', ratio: 0.31},
      {label: 'Bridge Silhouette', timecode: '02:24', ratio: 0.65},
    ],
  },
  {
    id: 'stoneware-hands',
    title: 'Kiln & Patience: Studio Monograph',
    client: 'Sora Craft Collective',
    category: 'Documentary',
    year: '2025',
    duration: '04:18',
    durationSeconds: 258,
    fps: '24fps',
    aspect: '4:3',
    role: 'Videographer & Narrative Editor',
    cameraSpec: 'Sony FX6 · Voigtländer 35mm f/1.4',
    colorSuite: 'Natural Window LUT · Warm Stone Balance',
    image: MEDIA_ASSETS.artisanDoc,
    summary:
      'Intimate short documentary observing a ceramicist throwing raw stoneware from wet clay to final morning firing.',
    editNotes:
      'J-cut dialogue pacing over tactile wheel audio; restrained camera footprint using available north-facing window light.',
    chapters: [
      {label: 'Raw Clay', timecode: '00:00', ratio: 0},
      {label: 'Wheel Rhythm', timecode: '01:36', ratio: 0.37},
      {label: 'Morning Glaze', timecode: '03:04', ratio: 0.71},
    ],
  },
  {
    id: 'atelier-daylight',
    title: 'The Studio Behind the Lens',
    client: 'Dimstoria House Study',
    category: 'Color & Edit',
    year: '2026',
    duration: '01:10',
    durationSeconds: 70,
    fps: '24fps',
    aspect: '16:9',
    role: 'Director & Finishing Colorist',
    cameraSpec: 'ARRI Alexa Mini · Canon FD Vintage',
    colorSuite: 'DaVinci Resolve · Clean Daylight Look',
    image: MEDIA_ASSETS.studioBehindLens,
    summary:
      'Behind-the-scenes study demonstrating linear slider choreography, natural softbox shaping, and clean skin-tone preservation.',
    editNotes:
      'Split-screen timeline breakdown matching raw LogC3 captures to final graded broadcast masters.',
    chapters: [
      {label: 'Slider Setup', timecode: '00:00', ratio: 0},
      {label: 'Log to Rec.709', timecode: '00:26', ratio: 0.37},
      {label: 'Final Master', timecode: '00:49', ratio: 0.7},
    ],
  },
];

export const STUDIO_EMAIL = 'dimstoria2@gmail.com';

export const CAPABILITIES = [
  {
    index: '01',
    title: 'Direction & Cinematography',
    description:
      'Minimal-footprint camera packages built for natural daylight, kinetic gimbal or slider movement, and clean frame composition.',
    deliverables: 'Commercials · Music Videos · Brand Monographs · 4K/8K RAW Capture',
  },
  {
    index: '02',
    title: 'Narrative & Rhythm Editing',
    description:
      'Precision offline and online editing shaped around musical cadence, match-cut continuity, and intentional pacing that holds attention.',
    deliverables: 'Premiere Pro · DaVinci Resolve · Multi-Ratio Social Cutdowns',
  },
  {
    index: '03',
    title: 'Color Grading & Sound Finish',
    description:
      'Consistent daylight palettes, film-emulation contrast curves, and subtle Foley layering so visuals and audio feel unified.',
    deliverables: 'ACES Color Pipeline · LUT Craft · Mastering & Broadcast Delivery',
  },
];

export interface StudioSpec {
  label: string;
  value: string;
}

export const STUDIO_TECHNICAL_SPECS: StudioSpec[] = [
  {label: 'Camera Systems', value: 'ARRI Alexa Mini LF · RED V-Raptor 8K'},
  {label: 'Color Pipeline', value: 'DaVinci Resolve · ACEScct'},
  {label: 'Master Delivery', value: '24fps & 60fps · 4K/8K Master'},
  {label: 'Location', value: 'Jakarta · Available Worldwide'},
];

export interface ClientTestimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  projectRef: string;
}

export const CLIENT_TESTIMONIALS: ClientTestimonial[] = [
  {
    id: 'kengo-press',
    quote:
      'Dimas arrived with a lean two-person footprint and delivered an architectural film whose pacing matched the stillness of the building. First offline assembly landed 48 hours after wrap.',
    author: 'Kenji Watanabe',
    role: 'Editorial Producer',
    organization: 'Kengo Architectural Press',
    projectRef: 'Morning Geometry at Solis Pavilion',
  },
  {
    id: 'nordic-mobility',
    quote:
      'Cutting between 60fps salt-flat tracking passes and quiet cabin interiors usually exposes every camera seam. His speed-ramps and ACES silver grade held complete continuity across nine deliverables.',
    author: 'Astrid Lindholm',
    role: 'Brand Film Lead',
    organization: 'Nordic Mobility Lab',
    projectRef: 'Zero Noise: Salt Flat Dynamics',
  },
  {
    id: 'verve-sessions',
    quote:
      'Having the same creative eye on set lighting and the DaVinci suite saved days of back-and-forth. Skin tones stayed true under high-key cyclorama lighting without ever feeling sterile.',
    author: 'Nadia Tan',
    role: 'Recording Artist',
    organization: 'Verve Records',
    projectRef: 'Monolith Sessions: Live in White',
  },
];

export interface StudioFaqItem {
  id: string;
  question: string;
  answer: string;
  detail: string;
}

export const STUDIO_FAQ: StudioFaqItem[] = [
  {
    id: 'turnaround',
    question: 'What is the typical turnaround for editing & color grading?',
    answer:
      'Commercial cutdowns and music videos typically deliver an initial rhythm assembly within 3–5 business days after footage ingest, followed by fine cut, sound polish, and DaVinci Resolve mastering inside 2 weeks.',
    detail: 'Rush 48h offline assembly available on request',
  },
  {
    id: 'remote-review',
    question: 'Can we collaborate remotely outside Jakarta?',
    answer:
      'Yes. Remote editing and color grading run through timecode-stamped review links and calibrated Rec.709 / HDR reference stills, with proxy or RAW ingest via Frame.io, MASV, or direct cloud transfer.',
    detail: 'GMT+7 · Async review & live color sessions',
  },
  {
    id: 'scope-split',
    question: 'Do you accept post-production only without on-set shooting?',
    answer:
      'Yes. You can book full production (direction + cinematography + post) or post-only packages covering narrative editing, multi-ratio social cutdowns (16:9, 4:5, 9:16), and ACES color finishing.',
    detail: 'Premiere Pro · DaVinci Resolve Studio',
  },
  {
    id: 'revisions',
    question: 'How are revisions and deliverables structured?',
    answer:
      'Every project includes two structured revision rounds at offline picture lock and one dedicated color pass before final ProRes 422 HQ, H.264/H.265 web masters, and clean textless archival exports.',
    detail: '2 Offline Rounds · 1 Color Pass Included',
  },
];

export const PROJECT_SCOPES = [
  'Commercial / Brand Film',
  'Music Video Production',
  'Documentary / Monograph',
  'Offline & Online Video Editing',
  'Color Grading Only',
] as const;

export const STUDIO_SOCIALS = [
  {label: 'Instagram', handle: '@dimstoria', href: 'https://instagram.com/dimstoria'},
  {label: 'Vimeo', handle: 'vimeo.com/dimstoria', href: 'https://vimeo.com/dimstoria'},
  {label: 'YouTube', handle: 'Dimstoria Reels', href: 'https://youtube.com/@dimstoria'},
] as const;

export interface TimelineClip {
  id: string;
  track: 'V2' | 'V1' | 'A1' | 'A2';
  label: string;
  startPercent: number;
  widthPercent: number;
}

export interface TimelineMarker {
  id: string;
  timecode: string;
  percent: number;
  title: string;
  technique: string;
  rationale: string;
  previewImage: string;
}

export interface TimelineStudy {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  fps: string;
  rulerMarks: string[];
  clips: TimelineClip[];
  markers: TimelineMarker[];
}

export const TIMELINE_STUDIES: TimelineStudy[] = [
  {
    id: 'solis-cut',
    title: 'Morning Geometry: Commercial Sequence',
    subtitle: 'DaVinci Resolve · 24fps · 5-point rhythm breakdown',
    duration: '01:32',
    fps: '24fps',
    rulerMarks: ['00:00', '00:22', '00:45', '01:08', '01:32'],
    clips: [
      {id: 'v2-1', track: 'V2', label: 'Shadow B-Roll', startPercent: 18, widthPercent: 16},
      {id: 'v2-2', track: 'V2', label: 'Glass Reflection', startPercent: 52, widthPercent: 20},
      {id: 'v1-1', track: 'V1', label: 'Wide Approach', startPercent: 0, widthPercent: 22},
      {id: 'v1-2', track: 'V1', label: 'Slider Column Pass', startPercent: 22, widthPercent: 28},
      {id: 'v1-3', track: 'V1', label: 'Interior Stillness', startPercent: 50, widthPercent: 26},
      {id: 'v1-4', track: 'V1', label: 'Closing Wide', startPercent: 76, widthPercent: 24},
      {id: 'a1-1', track: 'A1', label: 'Footsteps & Wind', startPercent: 0, widthPercent: 48},
      {id: 'a1-2', track: 'A1', label: 'Room Tone L-Cut', startPercent: 44, widthPercent: 56},
      {id: 'a2-1', track: 'A2', label: 'Minimal Piano Pulse (72 BPM)', startPercent: 6, widthPercent: 94},
    ],
    markers: [
      {
        id: 'm1',
        timecode: '00:05',
        percent: 6,
        title: 'Breath-In Pre-Roll',
        technique: 'J-Cut Audio Lead',
        rationale:
          'Natural olive-grove ambience enters 1.5 seconds before the first piano note so the opening concrete frame feels grounded rather than abrupt.',
        previewImage: MEDIA_ASSETS.architecturalFilm,
      },
      {
        id: 'm2',
        timecode: '00:21',
        percent: 22,
        title: 'Column Wipe Match-Cut',
        technique: 'Motion-Matched Cut',
        rationale:
          'Cut on the exact frame the camera slider crosses a dark travertine pillar, hiding the transition into the studio interior.',
        previewImage: MEDIA_ASSETS.showreelHero,
      },
      {
        id: 'm3',
        timecode: '00:46',
        percent: 50,
        title: 'Room Tone Drop',
        technique: 'L-Cut Silence',
        rationale:
          'Pulled exterior wind down 14dB over 12 frames as the glass door closes, isolating tactile indoor acoustics.',
        previewImage: MEDIA_ASSETS.artisanDoc,
      },
      {
        id: 'm4',
        timecode: '01:10',
        percent: 76,
        title: 'Final Daylight Hold',
        technique: 'Extended Cadence',
        rationale:
          'Let the closing wide shot breathe for 6 full seconds without cuts so the brand wordmark lands naturally.',
        previewImage: MEDIA_ASSETS.architecturalFilm,
      },
    ],
  },
  {
    id: 'monolith-cut',
    title: 'Monolith Sessions: Performance Edit',
    subtitle: 'Premiere Pro · Multi-Cam Sync · Beat-locked pacing',
    duration: '03:42',
    fps: '24fps',
    rulerMarks: ['00:00', '00:55', '01:50', '02:45', '03:42'],
    clips: [
      {id: 'mv2-1', track: 'V2', label: 'Hands / Keys CU', startPercent: 28, widthPercent: 18},
      {id: 'mv2-2', track: 'V2', label: 'Silhouette Profile', startPercent: 62, widthPercent: 18},
      {id: 'mv1-1', track: 'V1', label: 'Cyclorama Master', startPercent: 0, widthPercent: 32},
      {id: 'mv1-2', track: 'V1', label: '360° Dolly Orbit', startPercent: 32, widthPercent: 34},
      {id: 'mv1-3', track: 'V1', label: 'High-Key Finale', startPercent: 66, widthPercent: 34},
      {id: 'ma1-1', track: 'A1', label: 'Pedal & Breath Stem', startPercent: 0, widthPercent: 68},
      {id: 'ma1-2', track: 'A1', label: 'Hall Reverb Tail', startPercent: 68, widthPercent: 32},
      {id: 'ma2-1', track: 'A2', label: 'Master Vocal + Grand Piano', startPercent: 0, widthPercent: 100},
    ],
    markers: [
      {
        id: 'mm1',
        timecode: '00:14',
        percent: 8,
        title: 'Sustain Pedal Cue',
        technique: 'Acoustic Anchor',
        rationale:
          'Held the opening wide frame until the first damper pedal release, letting negative white space build anticipation.',
        previewImage: MEDIA_ASSETS.musicPerformance,
      },
      {
        id: 'mm2',
        timecode: '01:12',
        percent: 32,
        title: 'Chorus Dolly Push',
        technique: 'Seamless Stitch',
        rationale:
          'Blended two motion-control camera passes behind a 4-frame lens flare whip as the chorus lifts.',
        previewImage: MEDIA_ASSETS.showreelHero,
      },
      {
        id: 'mm3',
        timecode: '02:26',
        percent: 66,
        title: 'Silhouette Key Shift',
        technique: 'Hard Contrast Cut',
        rationale:
          'Switched to strict monochrome backlight silhouette on the bridge modulation for dramatic visual reset.',
        previewImage: MEDIA_ASSETS.musicPerformance,
      },
    ],
  },
];
