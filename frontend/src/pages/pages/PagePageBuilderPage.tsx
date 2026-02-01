import { PageBuilderWrapper } from '@/components/page-builder/PageBuilderWrapper';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { getSitePage, updateSitePage } from '@/services/cmsApi';
import { PageBlock, PageSection } from '@/types/pageBuilder';

export function PagePageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', id],
    queryFn: () => getSitePage(id!),
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { blocks?: PageBlock[]; sections?: PageSection[]; settings?: any }) => {
      if (!page) {
        throw new Error('Page not found');
      }

      const contentJson = {
        blocks: data.blocks || [],
        sections: data.sections || [],
      };

      return await updateSitePage(id!, {
        title: data.settings?.title || page.title,
        html: page.html, // Сохраняем старый HTML для обратной совместимости
        contentJson, // Добавляем contentJson
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', id] });
      showToast('Страница сохранена', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка сохранения', 'error');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  if (!page) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Страница не найдена</Typography>
      </Box>
    );
  }

  const contentJson = (page as any)?.contentJson || {};
  const initialBlocks = contentJson.blocks || [];
  const initialSections = contentJson.sections || [];

  return (
    <PageBuilderWrapper
      initialBlocks={initialBlocks}
      initialSections={initialSections}
      initialSettings={{
        id: page.id || '',
        title: page.title || '',
        slug: page.path || id || '',
        description: '',
        keywords: '',
      }}
      pageId={page.id || id}
      pageSlug={page.path || id}
      onSave={async (data) => {
        await saveMutation.mutateAsync(data);
      }}
    />
  );
}
