const RELOAD_FLAG = 'bv-chunk-reload';

/** Safari: «Importing a module script failed». Chrome: «Failed to fetch dynamically imported module». */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk [\w-]+ failed|Unable to preload CSS|dynamically imported module/i.test(
    message,
  );
}

/** Один раз за сессию подменяем адрес, чтобы не взять закэшированный index.html со старыми чанками. */
export function reloadOnceForChunkError(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    return false;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_bv', String(Date.now()));
  window.location.replace(url.pathname + url.search + url.hash);
  return true;
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

/** vite:preloadError и отменённые import() не должны ронять весь экран. */
export function installChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForChunkError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    reloadOnceForChunkError();
  });

  window.setTimeout(clearChunkReloadFlag, 8000);
}
