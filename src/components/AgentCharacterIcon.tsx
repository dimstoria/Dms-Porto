import type {AgentId} from '../data/theAgents';

export interface AgentCharacterIconProps {
  agentId: AgentId;
  color: string;
  accent?: string;
  size?: number;
  className?: string;
}

/**
 * Custom vector character icon for each of the 11 studio agents.
 * Combines the character's distinct robot-helmet silhouette with its craft emblem
 * so anchor pills, hover tooltips, and inspection cards remain scannable at small sizes.
 */
export function AgentCharacterIcon({
  agentId,
  color,
  accent = '#FFFFFF',
  size = 18,
  className = '',
}: AgentCharacterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* Signature Head Silhouette per Agent */}
      {agentId === 'antislop' ? (
        <>
          <path d="M4.5 5L7.5 8V10H4.5V5Z" fill={color} />
          <path d="M19.5 5L16.5 8V10H19.5V5Z" fill={color} />
          <rect x="5" y="7.5" width="14" height="11.5" rx="3" fill={color} />
          <rect x="7" y="10.5" width="10" height="4.5" rx="1.2" fill="#0B0B10" />
          <path d="M8.5 11.8L10.8 13.2L8.5 13.8V11.8Z" fill={accent} />
          <path d="M15.5 11.8L13.2 13.2L15.5 13.8V11.8Z" fill={accent} />
          <path d="M9.5 16.5H14.5" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : agentId === 'apple' ? (
        <>
          <path d="M13 3.2C14.8 3.2 15.8 4.4 15.6 5.9C14 6.1 12.8 5 13 3.2Z" fill={accent} />
          <rect x="6" y="7" width="12" height="12" rx="4.5" fill={color} />
          <rect x="8" y="10.5" width="8" height="4.2" rx="2.1" fill="#1B1206" />
          <circle cx="10.2" cy="12.6" r="1.05" fill={accent} />
          <circle cx="13.8" cy="12.6" r="1.05" fill={accent} />
        </>
      ) : agentId === 'genjutsu' ? (
        <>
          <path d="M9 5.5L12 3.2L15 5.5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="5.5" y="6.8" width="13" height="12.2" rx="4" fill={color} />
          <circle cx="12" cy="12.9" r="3.6" fill="#180810" stroke={accent} strokeWidth="1.3" />
          <circle cx="12" cy="12.9" r="1.3" fill={accent} />
          <circle cx="9.8" cy="11.2" r="0.65" fill={accent} />
          <circle cx="14.2" cy="11.2" r="0.65" fill={accent} />
          <circle cx="12" cy="15.3" r="0.65" fill={accent} />
        </>
      ) : agentId === 'threejs' ? (
        <>
          <polygon points="12,2.8 15.2,6 8.8,6" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="3.4" fill={color} />
          <polygon
            points="12,9.2 15.5,11.2 15.5,14.8 12,16.8 8.5,14.8 8.5,11.2"
            fill="#0A1836"
            stroke={accent}
            strokeWidth="1.3"
          />
          <path d="M12 13V16.8M12 13L15.5 11.2M12 13L8.5 11.2" stroke={accent} strokeWidth="1.1" />
        </>
      ) : agentId === 'design-dna' ? (
        <>
          <circle cx="9" cy="4.8" r="1.3" fill={accent} />
          <circle cx="15" cy="4.8" r="1.3" fill={accent} />
          <path d="M9 6V7.5M15 6V7.5" stroke={color} strokeWidth="1.5" />
          <rect x="5.5" y="7.2" width="13" height="11.8" rx="3.8" fill={color} />
          <rect x="7.6" y="10.2" width="8.8" height="5.6" rx="1.8" fill="#062624" />
          <path d="M9.2 11.4C10.5 13 13.5 13 14.8 11.4M9.2 14.6C10.5 13 13.5 13 14.8 14.6" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : agentId === 'motion' ? (
        <>
          <path d="M7.5 6.8C9 4 14.5 3.6 17 5.6L15 7.2H7.5Z" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="4" fill={color} />
          <rect x="7.6" y="10.3" width="8.8" height="5.2" rx="2.2" fill="#2A1205" />
          <path d="M9 14.1C10.2 10.9 13.8 14.9 15 11.7" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : agentId === 'gsap' ? (
        <>
          <rect x="8.5" y="4.2" width="7" height="2" rx="1" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="3.5" fill={color} />
          <rect x="7.5" y="10.2" width="9" height="5.6" rx="1.6" fill="#132206" />
          <path d="M9 11.7H14.5M9 13.2H12.5M9 14.7H15" stroke={accent} strokeWidth="1.35" strokeLinecap="round" />
        </>
      ) : agentId === 'frontend' ? (
        <>
          <rect x="9.5" y="4.5" width="5" height="2" rx="1" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="3.8" fill={color} />
          <rect x="7.5" y="10.3" width="9" height="5.4" rx="1.8" fill="#081C3A" />
          <path d="M10.2 11.6L8.8 13L10.2 14.4M13.8 11.6L15.2 13L13.8 14.4" stroke={accent} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : agentId === 'tastes' ? (
        <>
          <path d="M12 3.5C13.6 5.2 14.4 6.2 14.4 7H9.6C9.6 6.2 10.4 5.2 12 3.5Z" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="4.2" fill={color} />
          <rect x="7.8" y="10.4" width="8.4" height="5" rx="2" fill="#3B0B24" />
          <circle cx="10.3" cy="12.9" r="1.05" fill={accent} />
          <circle cx="13.7" cy="12.9" r="1.05" fill={accent} />
        </>
      ) : agentId === 'uiux' ? (
        <>
          <rect x="4" y="10.5" width="2" height="4.5" rx="1" fill={accent} />
          <rect x="18" y="10.5" width="2" height="4.5" rx="1" fill={accent} />
          <rect x="6" y="7" width="12" height="12" rx="3.8" fill={color} />
          <rect x="7.8" y="10.2" width="8.4" height="5.2" rx="1.8" fill="#04241E" />
          <path d="M12 11V14.6M10.2 12.8H13.8" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        /* impeccable */
        <>
          <path d="M8.5 6.5L10 4L12 5.6L14 4L15.5 6.5H8.5Z" fill={accent} />
          <rect x="5.5" y="7" width="13" height="12" rx="3.8" fill={color} />
          <rect x="7.6" y="10.4" width="8.8" height="5" rx="1.8" fill="#1F0B3A" />
          <polygon points="12,11 13.7,12.9 12,14.8 10.3,12.9" fill={accent} />
        </>
      )}
    </svg>
  );
}
