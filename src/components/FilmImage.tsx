import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Film} from 'lucide-react';
import {motion, type MotionStyle} from 'motion/react';
import {inferMediaKindFromUrl, type MediaKind} from '../utils/devMediaStore';

interface FilmImageProps {
  src: string;
  alt: string;
  title?: string;
  kind?: MediaKind;
  compactFallback?: boolean;
  priority?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: MotionStyle | CSSProperties;
}

export function FilmImage({
  src,
  alt,
  title,
  kind,
  compactFallback = false,
  priority = false,
  width = 1600,
  height = 900,
  className = '',
  style,
}: FilmImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const resolvedKind: MediaKind = kind ?? inferMediaKindFromUrl(src);

  useEffect(() => {
    if (resolvedKind === 'video') {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        setStatus('loaded');
      } else {
        setStatus('loading');
      }
      return;
    }

    const img = imgRef.current;
    if (img && img.complete) {
      setStatus(img.naturalWidth > 0 ? 'loaded' : 'error');
    } else {
      setStatus('loading');
    }
  }, [src, resolvedKind]);

  if (!src || !src.trim() || status === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#09090B] text-[#E4E4E7] p-3 text-center">
        <Film
          className={compactFallback ? 'w-5 h-5 text-[#FFE600]' : 'w-7 h-7 text-[#FFE600]'}
          strokeWidth={2}
        />
        {!compactFallback && title && (
          <span className="text-xs font-mono font-bold text-white line-clamp-1">{title}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#09090B]">
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#18181B] animate-pulse"
        />
      )}

      <div
        className={`w-full h-full transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {resolvedKind === 'video' ? (
          <motion.video
            ref={videoRef}
            src={src}
            aria-label={alt}
            autoPlay
            loop
            muted
            playsInline
            preload={priority ? 'auto' : 'metadata'}
            onLoadedData={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            style={style as MotionStyle}
            className={`w-full h-full object-cover select-none ${className}`}
          />
        ) : (
          <motion.img
            ref={imgRef}
            src={src}
            alt={alt}
            width={width}
            height={height}
            fetchPriority={priority ? 'high' : 'auto'}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            style={style as MotionStyle}
            className={`w-full h-full object-cover select-none ${className}`}
          />
        )}
      </div>
    </div>
  );
}
