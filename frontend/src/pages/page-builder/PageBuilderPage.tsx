import { PageBuilder } from '@/components/page-builder/PageBuilder';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { PageTemplate } from '@/types/pageBuilder';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
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

export function PageBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';
  const template = location.state?.template as PageTemplate | undefined;

  const { data: page, isLoading } = useQuery({
    queryKey: ['page-builder-page', id],
    queryFn: () => apiFetch(`/api/page-builder/pages/${id}`),
    enabled: !isNew && !!id,
  });

  // Если есть шаблон, используем его данные
  const initialPageData = template ? {
    blocks: template.blocks,
    settings: {
      id: '',
      title: template.name,
      slug: '',
      description: template.description,
      keywords: '',
      robotsIndex: true,
      robotsFollow: true,
    },
    theme: template.theme,
  } : page;

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isNew) {
        return apiFetch('/api/page-builder/pages', {
          method: 'POST',
          body: JSON.stringify({
            title: data.title || 'Новая страница',
            slug: data.slug || `page-${Date.now()}`,
            blocks: data.blocks || [],
            settings: data.settings || {},
            theme: data.theme || {},
          }),
        });
      } else {
        return apiFetch(`/api/page-builder/pages/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: data.title || page?.title,
            slug: data.slug || page?.slug,
            blocks: data.blocks || [],
            settings: data.settings || {},
            theme: data.theme || {},
            published: data.published || false,
          }),
        });
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['page-builder-pages'] });
      if (isNew) {
        navigate(`/admin/page-builder/${saved.id}`, { replace: true });
      }
      showToast('Страница сохранена', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка сохранения', 'error');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (data: any) => {
      return apiFetch(`/api/page-builder/pages/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: data.title || page?.title,
          slug: data.slug || page?.slug,
          blocks: data.blocks || [],
          settings: data.settings || {},
          theme: data.theme || {},
          published: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-builder-pages'] });
      queryClient.invalidateQueries({ queryKey: ['page-builder-page', id] });
      showToast('Страница опубликована', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка публикации', 'error');
    },
  });

  const handleSave = (pageData: any) => {
    saveMutation.mutate(pageData);
  };

  const handlePublish = (pageData: any) => {
    if (isNew) {
      showToast('Сначала сохраните страницу', 'warning');
      return;
    }
    publishMutation.mutate(pageData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <PageBuilder
      pageId={id}
      initialPage={initialPageData}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}
