import { useState, useEffect, lazy, Suspense } from 'react';

const AITeamThreeScene = lazy(() =>
  import('./AITeamThreeScene').then((m) => ({ default: m.AITeamThreeScene }))
);

export function AITeamDeferredThree() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => { if (!cancelled) setReady(true); }, { timeout: 100 });
      } else {
        setTimeout(() => { if (!cancelled) setReady(true); }, 80);
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
      <AITeamThreeScene />
    </Suspense>
  );
}
