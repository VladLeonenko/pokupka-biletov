import type { TeamMember } from '@/types/cms';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

/** Детерминированный shuffle: один и тот же slug → одни и те же люди при неизменном пуле */
export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let state = hashString(seedStr);
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Пересечение skills сотрудника с инструментами кейса (релевантность) */
function relevanceScore(member: TeamMember, caseTools: string[]): number {
  const skills = (member.skills || []).map(norm).filter(Boolean);
  const tools = caseTools.map(norm).filter(Boolean);
  if (skills.length === 0 || tools.length === 0) return 0;
  let score = 0;
  for (const sk of skills) {
    for (const t of tools) {
      if (t === sk || t.includes(sk) || sk.includes(t)) {
        score += 2;
        continue;
      }
      const ta = t.split(/[,;/|]+/).map((x) => x.trim()).filter(Boolean);
      if (ta.some((part) => part === sk || part.includes(sk) || sk.includes(part))) score += 1;
    }
  }
  return score;
}

const DEFAULT_MAX = 5;

/**
 * Если в кейсе не заданы конкретные люди — берём до maxCount человек из пула:
 * сначала с ненулевой релевантностью (skills × tools), остальное — стабильный random по slug.
 */
export function pickTeamFromPool(
  pool: TeamMember[],
  slug: string,
  caseTools: string[],
  maxCount: number = DEFAULT_MAX,
): TeamMember[] {
  const active = pool.filter((m) => m.isActive !== false);
  if (active.length === 0) return [];

  const count = Math.max(1, Math.min(maxCount, 12));

  const scored = active.map((m) => ({ m, s: relevanceScore(m, caseTools) }));
  const relevant = scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.m.id - b.m.id)
    .map((x) => x.m);
  const rest = scored.filter((x) => x.s === 0).map((x) => x.m);

  const shRel = seededShuffle(relevant, `${slug}:rel`);
  const shRest = seededShuffle(rest, `${slug}:pool`);

  const out: TeamMember[] = [];
  const seen = new Set<number>();
  const push = (m: TeamMember) => {
    if (seen.has(m.id) || out.length >= count) return;
    seen.add(m.id);
    out.push(m);
  };

  for (const m of shRel) push(m);
  for (const m of shRest) push(m);

  return out.slice(0, count);
}
