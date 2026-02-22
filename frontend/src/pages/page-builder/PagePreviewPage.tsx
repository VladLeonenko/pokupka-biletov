import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { BlockRenderer } from '@/components/page-builder/canvas/BlockRenderer';
import { PageBlock, DeviceType } from '@/types/pageBuilder';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

import { getAuthToken } from '@/utils/authStorage';

function getToken(): string | null {
  try {
    return getAuthToken();
  } catch {
    return null;
  }
}

async function apiFetch(endpoint: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка запроса');
  }
  return res.json();
}

export function PagePreviewPage() {
  const { id } = useParams();

  const { data: page, isLoading, error } = useQuery({
    queryKey: isPublic ? ['page-builder-public', slug] : ['page-builder-page', id],
    queryFn: () => {
      if (isPublic) {
        return apiFetch(`/api/public/page-builder/${slug}`, undefined, true);
      }
      return apiFetch(`/api/page-builder/pages/${id}`);
    },
    enabled: !!id || !!slug,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !page) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography color="error">Страница не найдена</Typography>
      </Box>
    );
  }

  const blocks: PageBlock[] = Array.isArray(page.blocks) ? page.blocks : [];
  const settings = page.settings || {};

  return (
    <>
      <SeoMetaTags
        title={settings.title || page.title || 'Страница'}
        description={settings.description || ''}
        keywords={settings.keywords || ''}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        ogImage={settings.ogImage}
      />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fff' }}>
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            deviceType="desktop"
            isPreview={true}
            onUpdate={() => {}}
            onDelete={() => {}}
          />
        ))}
        {blocks.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <Typography color="text.secondary">Страница пуста</Typography>
          </Box>
        )}
      </Box>
    </>
  );
}
