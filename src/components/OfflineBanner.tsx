import {useEffect, useState} from 'react';
import {WifiOff} from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 left-1/2 -translate-x-1/2 md:left-5 md:translate-x-0 z-40 rounded-full bg-[#FFE600] border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] inline-flex items-center gap-2 text-[#09090B] px-4 py-2 text-xs font-mono font-bold whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#09090B] shrink-0" strokeWidth={2} />
      <span>Offline Mode: Showing cached portfolio</span>
    </div>
  );
}
