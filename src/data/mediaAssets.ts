// Centralized image registry for production bundling (Vite).
// Replace any import or swap with your own URL string/image file whenever ready.

import architecturalFilmImg from '../assets/images/work_architectural_film_1794573514508.jpg';
import artisanDocImg from '../assets/images/work_artisan_doc_1794573516214.jpg';
import automotiveMotionImg from '../assets/images/work_automotive_motion_1794573513633.jpg';
import musicPerformanceImg from '../assets/images/work_music_performance_1794573514932.jpg';
import showreelHeroImg from '../assets/images/hero_cinema_director_1794573513565.jpg';
import studioBehindLensImg from '../assets/images/studio_behind_lens_1794980123568.jpg';

export const MEDIA_ASSETS = {
  portraitAvatar: '/assets/aistudio/1000340938_3a905db4.webp',
  showreelHero: showreelHeroImg,
  architecturalFilm: architecturalFilmImg,
  automotiveMotion: automotiveMotionImg,
  musicPerformance: musicPerformanceImg,
  artisanDoc: artisanDocImg,
  studioBehindLens: studioBehindLensImg,
} as const;
