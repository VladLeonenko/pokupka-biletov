/**
 * Парс 14MB gray-cloud JSON вне event loop.
 * workerData: { filePath }
 */
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';

const filePath = String(workerData?.filePath || '');
try {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const bundleMode = String(raw?.mode ?? '').trim() || null;
  let seats = Array.isArray(raw?.seats) ? raw.seats : Array.isArray(raw) ? raw : [];
  if (bundleMode === 'editor-svg-extract') {
    seats = seats.filter((s) => String(s?.geodesySource ?? '').includes('manual'));
  }
  const filtered = [];
  for (const s of seats) {
    if (!s?.sector || s.row == null || s.seat == null) continue;
    const xPct = Number(s.xPct);
    const yPct = Number(s.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    filtered.push({
      sector: String(s.sector),
      row: String(s.row),
      seat: String(s.seat),
      xPct,
      yPct,
    });
  }
  parentPort.postMessage({ ok: true, bundleMode, seats: filtered });
} catch (err) {
  parentPort.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
}
