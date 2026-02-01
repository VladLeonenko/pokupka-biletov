import { PageBuilder } from '@/components/page-builder/PageBuilder';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { PageTemplate } from '@/types/pageBuilder';
import { getSitePage, updateSitePage, createSitePage, getSite } from '@/services/sitesApi';

export function SitePageBuilderPage() {
  const { siteId, pageId } = useParams<{ siteId: string; pageId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = pageId === 'new';
  const template = location.state?.template as PageTemplate | undefined;

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(Number(siteId)),
    enabled: !!siteId,
  });

  const { data: page, isLoading } = useQuery({
    queryKey: ['sitePage', siteId, pageId],
    queryFn: () => getSitePage(Number(siteId), Number(pageId)),
    enabled: !isNew && !!siteId && !!pageId,
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
  } : (page ? {
    blocks: page.content?.blocks || [],
    settings: {
      id: String(page.id),
      title: page.title || '',
      slug: page.slug || '',
      description: page.seo_description || '',
      keywords: '',
      robotsIndex: true,
      robotsFollow: true,
    },
    theme: {},
  } : null);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isNew) {
        return createSitePage(Number(siteId), {
          title: data.title || 'Новая страница',
          slug: data.slug || `page-${Date.now()}`,
          content: {
            blocks: data.blocks || [],
            sections: data.sections || [],
          },
          seo_title: data.settings?.title || '',
          seo_description: data.settings?.description || '',
        });
      } else {
        return updateSitePage(Number(siteId), Number(pageId), {
          title: data.title || page?.title,
          slug: data.slug || page?.slug,
          content: {
            blocks: data.blocks || [],
            sections: data.sections || [],
          },
          seo_title: data.settings?.title || '',
          seo_description: data.settings?.description || '',
        });
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['sitePages', siteId] });
      if (isNew) {
        navigate(`/admin/sites/${siteId}/pages/${saved.id}/builder`, { replace: true });
      }
      showToast('Страница сохранена', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка сохранения', 'error');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (data: any) => {
      return updateSitePage(Number(siteId), Number(pageId), {
        title: data.title || page?.title,
        slug: data.slug || page?.slug,
        content: {
          blocks: data.blocks || [],
          sections: data.sections || [],
        },
        seo_title: data.settings?.title || '',
        seo_description: data.settings?.description || '',
        is_published: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePages', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sitePage', siteId, pageId] });
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

  if (!initialPageData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Ошибка загрузки страницы</Typography>
      </Box>
    );
  }

  return (
    <PageBuilder
      pageId={pageId}
      initialPage={initialPageData}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}
