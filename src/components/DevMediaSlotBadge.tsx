import {ImagePlus} from 'lucide-react';
import type {MouseEvent} from 'react';
import {useDevMedia} from '../context/DevMediaContext';

interface DevMediaSlotBadgeProps {
  slotKey: string;
  label?: string;
  position?: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export function DevMediaSlotBadge({
  slotKey,
  label = 'Ganti Media',
  position = 'top-left',
  compact = false,
}: DevMediaSlotBadgeProps) {
  const {devMode, overrides, openSlotEditor} = useDevMedia();

  if (!devMode) return null;

  const isModified = Boolean(
    overrides.slots[slotKey] ||
      overrides.slots[`${slotKey}:before`] ||
      overrides.slots[`${slotKey}:after`],
  );
  const posClasses: Record<typeof position, string> = {
    'top-left': 'top-2.5 left-2.5',
    'top-right': 'top-2.5 right-2.5',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-2.5 left-2.5',
    'bottom-right': 'bottom-2.5 right-2.5',
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    openSlotEditor(slotKey);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={`Dev Mode: ${label}`}
      className={`absolute z-30 ${posClasses[position]} inline-flex items-center gap-1.5 rounded-xl border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
        isModified
          ? 'bg-[#B8FF3B] text-[#09090B]'
          : 'bg-[#FFE600] text-[#09090B]'
      } ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]'} font-mono font-bold`}
    >
      <ImagePlus
        className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#09090B] shrink-0`}
        strokeWidth={2}
      />
      <span>{isModified ? `${label} · Edited` : label}</span>
    </button>
  );
}
