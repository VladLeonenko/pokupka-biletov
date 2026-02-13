import { useState, useEffect } from 'react';
import { ParticleSphere } from './ParticleSphere';

/**
 * Рендерит ParticleSphere после первого paint — улучшает LCP на мобильных.
 * Three.js + GSAP не блокируют отрисовку Hero и контента.
 */
export function DeferredParticleSphere(props: React.ComponentProps<typeof ParticleSphere>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => { if (!cancelled) setReady(true); }, { timeout: 150 });
      } else {
        setTimeout(() => { if (!cancelled) setReady(true); }, 100);
      }
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule);
    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
    };
  }, []);

  if (!ready) return null;
  return <ParticleSphere {...props} />;
}
