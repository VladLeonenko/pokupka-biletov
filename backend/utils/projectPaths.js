import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Корень монорепы (родитель каталога `backend`). */
export const repoRoot = path.resolve(backendRoot, '..');

/** Абсолютный путь относительно корня репозитория или как есть, если уже абсолютный. */
export function resolveFromRepo(value) {
  if (!value || typeof value !== 'string') throw new Error('Путь не задан');
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Путь не задан');
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(repoRoot, trimmed);
}
