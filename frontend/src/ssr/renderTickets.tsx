import createEmotionServer from '@emotion/server/create-instance';
import { QueryClient } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { createEmotionCache } from '@/ssr/createEmotionCache';
import { PublicTicketsShell } from '@/ssr/PublicTicketsShell';
import {
  PRELOADED_TICKETS_STATE_ID,
  REACT_SSR_HOME_ATTR,
  REACT_SSR_TICKET_ATTR,
  reactSsrKindFromPath,
  ticketSlugFromPath,
  type ReactSsrKind,
} from '@/ssr/reactSsrTickets';

export type TicketsSsrInput = {
  url: string;
  kind: ReactSsrKind;
  /** Seeded RQ payloads */
  querySeed?: {
    resolveSlug?: { slug: string; data: unknown };
    repertoirePage?: { repertoireId: string; data: unknown };
    home?: { cityId: string; data: unknown };
    vitrine?: unknown;
  };
  baseUrl?: string;
};

export type TicketsSsrResult = {
  html: string;
  css: string;
  stateScript: string;
  rootAttr: string;
};

function buildQueryClient(input: TicketsSsrInput): QueryClient {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: false },
    },
  });
  const seed = input.querySeed;
  if (seed?.resolveSlug?.slug) {
    qc.setQueryData(['bilet-resolve-slug', seed.resolveSlug.slug], seed.resolveSlug.data);
  }
  if (seed?.repertoirePage?.repertoireId) {
    qc.setQueryData(
      ['bilet-repertoire-page', seed.repertoirePage.repertoireId, 'markup-v2'],
      seed.repertoirePage.data,
    );
  }
  if (seed?.home) {
    qc.setQueryData(['bilet-home-public', seed.home.cityId], seed.home.data);
  }
  if (seed?.vitrine != null) {
    qc.setQueryData(['tickets-vitrine'], seed.vitrine);
  }
  return qc;
}

/**
 * Node entry: React+MUI money pages → HTML + critical Emotion CSS.
 */
export function renderTicketsPage(input: TicketsSsrInput): TicketsSsrResult {
  const cache = createEmotionCache();
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  const queryClient = buildQueryClient(input);
  const location = input.url.startsWith('/') ? input.url : `/${input.url}`;
  const kind = input.kind || reactSsrKindFromPath(location) || 'home';

  const html = renderToString(
    <StaticRouter location={location}>
      <PublicTicketsShell emotionCache={cache} queryClient={queryClient} />
    </StaticRouter>,
  );

  const emotionChunks = extractCriticalToChunks(html);
  const css = constructStyleTagsFromChunks(emotionChunks);

  const preloaded = {
    kind,
    url: `${(input.baseUrl || 'https://biletvsem.com').replace(/\/$/, '')}${location}`,
    querySeed: input.querySeed || null,
    slug: kind === 'ticket' ? ticketSlugFromPath(location) : null,
  };

  const stateScript = `<script type="application/json" id="${PRELOADED_TICKETS_STATE_ID}">${JSON.stringify(
    preloaded,
  ).replace(/</g, '\\u003c')}</script>`;

  const rootAttr =
    kind === 'ticket'
      ? `${REACT_SSR_TICKET_ATTR}="${ticketSlugFromPath(location) || '1'}"`
      : `${REACT_SSR_HOME_ATTR}="1"`;

  return {
    html,
    css,
    stateScript,
    rootAttr,
  };
}
