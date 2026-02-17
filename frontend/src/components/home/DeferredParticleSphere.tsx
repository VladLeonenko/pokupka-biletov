import { useState, useEffect, lazy, Suspense } from 'react';

// Dynamic import — Three.js (~180KB) загружается только когда сфера нужна, не блокирует первый рендер
const ParticleSphere = lazy(() =>
  import('./ParticleSphere').then((m) => ({ default: m.ParticleSphere }))
);

interface ParticleSphereProps {
  labelsFromSelector?: string;
}

/**
 * Рендерит ParticleSphere после первого paint — улучшает LCP на мобильных.
 * Three.js загружается динамически, не входит в main bundle.
 */
export function DeferredParticleSphere(props: ParticleSphereProps) {
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
  return (
    <Suspense fallback={null}>
      <ParticleSphere {...props} />
    </Suspense>
  );
}
