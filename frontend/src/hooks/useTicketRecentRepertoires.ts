import { useEffect, useMemo, useState } from 'react';

const KEY = 'tickets:recentRepertoireIds';

/** Хранит последние просмотренные repertoire id (sessionStorage). */
export function useTicketRecentRepertoires(activeRepertoireId: string | undefined) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setIds([]);
    }
  }, []);

  useEffect(() => {
    const id = activeRepertoireId?.trim();
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(KEY);
      const prev = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(prev) ? prev.filter((x): x is string => typeof x === 'string') : [];
      const next = [id, ...list.filter((x) => x !== id)].slice(0, 14);
      sessionStorage.setItem(KEY, JSON.stringify(next));
      setIds(next);
    } catch {
      /* noop */
    }
  }, [activeRepertoireId]);

  const others = useMemo(
    () => ids.filter((x) => x && x !== activeRepertoireId?.trim()),
    [ids, activeRepertoireId],
  );

  return others;
}
