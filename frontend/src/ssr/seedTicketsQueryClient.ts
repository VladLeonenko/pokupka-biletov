import type { QueryClient } from '@tanstack/react-query';
import { PRELOADED_TICKETS_STATE_ID } from '@/ssr/reactSsrTickets';

type Preloaded = {
  kind: 'home' | 'ticket';
  querySeed?: {
    resolveSlug?: { slug: string; data: unknown };
    repertoirePage?: { repertoireId: string; data: unknown };
    home?: { cityId: string; data: unknown };
    vitrine?: unknown;
  } | null;
};

export function seedQueryClientFromDom(qc: QueryClient) {
  const el = document.getElementById(PRELOADED_TICKETS_STATE_ID);
  if (!el?.textContent) return;
  let preloaded: Preloaded;
  try {
    preloaded = JSON.parse(el.textContent) as Preloaded;
  } catch {
    return;
  }
  const seed = preloaded.querySeed;
  if (!seed) return;
  if (seed.resolveSlug?.slug) {
    qc.setQueryData(['bilet-resolve-slug', seed.resolveSlug.slug], seed.resolveSlug.data);
  }
  if (seed.repertoirePage?.repertoireId) {
    qc.setQueryData(
      ['bilet-repertoire-page', seed.repertoirePage.repertoireId, 'markup-v2'],
      seed.repertoirePage.data,
    );
  }
  if (seed.home) {
    qc.setQueryData(['bilet-home-public', seed.home.cityId], seed.home.data);
  }
  if (seed.vitrine != null) {
    qc.setQueryData(['tickets-vitrine'], seed.vitrine);
  }
}
