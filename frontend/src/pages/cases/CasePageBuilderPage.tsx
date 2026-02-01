import { PageBuilderWrapper } from '@/components/page-builder/PageBuilderWrapper';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { getCase, upsertCase } from '@/services/cmsApi';
import { PageBlock, PageSection } from '@/types/pageBuilder';

export function CasePageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => getCase(id!),
    enabled: !isNew && !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { blocks?: PageBlock[]; sections?: PageSection[]; settings?: any }) => {
      if (!caseData && !isNew) {
        throw new Error('Case not found');
      }

      const contentJson = {
        blocks: data.blocks || [],
        sections: data.sections || [],
        ...(caseData?.contentJson || {}), // Сохраняем другие данные из contentJson
      };

      const updatedCase = {
        slug: caseData?.slug || id || '',
        title: data.settings?.title || caseData?.title || '',
        summary: caseData?.summary || '',
        heroImageUrl: caseData?.heroImageUrl || '',
        contentHtml: caseData?.contentHtml || '',
        contentJson,
        isPublished: caseData?.isPublished || false,
      };

      await upsertCase(updatedCase as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      if (isNew && caseData?.slug) {
        navigate(`/admin/cases/${caseData.slug}/builder`, { replace: true });
      }
      showToast('Кейс сохранен', 'success');
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

  if (!caseData && !isNew) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Кейс не найден</Typography>
      </Box>
    );
  }

  const contentJson = caseData?.contentJson || {};
  const initialBlocks = contentJson.blocks || [];
  const initialSections = contentJson.sections || [];

  return (
    <PageBuilderWrapper
      initialBlocks={initialBlocks}
      initialSections={initialSections}
      initialSettings={{
        id: caseData?.slug || id || '',
        title: caseData?.title || '',
        slug: caseData?.slug || id || '',
        description: caseData?.summary || '',
        keywords: '',
      }}
      pageId={caseData?.slug || id}
      pageSlug={caseData?.slug || id}
      onSave={async (data) => {
        await saveMutation.mutateAsync(data);
      }}
    />
  );
}
