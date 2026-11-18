import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) {
    // Self-heal browsers that previously cached a stale dev-sw.js / Workbox HTML shell
    const hadController = Boolean(navigator.serviceWorker?.controller);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .then((results) => {
          if (hadController && results.some(Boolean)) {
            try {
              const reloadKey = 'dms-dev-sw-cleaned';
              if (!window.sessionStorage.getItem(reloadKey)) {
                window.sessionStorage.setItem(reloadKey, '1');
                window.location.reload();
              }
            } catch {
              // Ignore sessionStorage restrictions in sandboxed iframes
            }
          }
        })
        .catch(() => undefined);
    }
    if ('caches' in window) {
      void caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('workbox-') || k.includes('precache'))
              .map((k) => caches.delete(k)),
          ),
        )
        .catch(() => undefined);
    }
  } else {
    try {
      registerSW({immediate: true});
    } catch {
      // Ignore SW registration failures in restricted browser/iframe contexts
    }
  }
}

// Sync canonical and social URLs dynamically to the active deployment origin
if (typeof window !== 'undefined') {
  const currentUrl = window.location.origin + window.location.pathname;
  const ogImageAbsolute = `${window.location.origin}/og-cover.jpg`;

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = currentUrl;

  const ensureMeta = (attr: 'property' | 'name', key: string, value: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = value;
  };

  ensureMeta('property', 'og:url', currentUrl);
  ensureMeta('property', 'og:image', ogImageAbsolute);
  ensureMeta('name', 'twitter:image', ogImageAbsolute);
}

createRoot(document.getElementById('root')!).render(<App />);
