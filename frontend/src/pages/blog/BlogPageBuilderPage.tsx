import { PageBuilderWrapper } from '@/components/page-builder/PageBuilderWrapper';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { getBlogPost, upsertBlogPost } from '@/services/cmsApi';
import { PageBlock, PageSection } from '@/types/pageBuilder';

export function BlogPageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', id],
    queryFn: () => getBlogPost(id!),
    enabled: !isNew && !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { blocks?: PageBlock[]; sections?: PageSection[]; settings?: any }) => {
      if (!post && !isNew) {
        throw new Error('Post not found');
      }

      const contentJson = {
        blocks: data.blocks || [],
        sections: data.sections || [],
      };

      const updatedPost = {
        ...post,
        id: post?.id || '',
        slug: post?.slug || id || '',
        title: data.settings?.title || post?.title || '',
        contentHtml: post?.contentHtml || '',
        seo: {
          ...post?.seo,
          metaTitle: data.settings?.title || post?.seo?.metaTitle || '',
          metaDescription: data.settings?.description || post?.seo?.metaDescription || '',
        },
        contentJson, // Добавляем contentJson
      };

      return await upsertBlogPost(updatedPost as any);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      queryClient.invalidateQueries({ queryKey: ['blog', saved.slug] });
      if (isNew) {
        navigate(`/admin/blog/${saved.slug}/builder`, { replace: true });
      }
      showToast('Статья сохранена', 'success');
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

  if (!post && !isNew) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Статья не найдена</Typography>
      </Box>
    );
  }

  const contentJson = (post as any)?.contentJson || {};
  const initialBlocks = contentJson.blocks || [];
  const initialSections = contentJson.sections || [];

  return (
    <PageBuilderWrapper
      initialBlocks={initialBlocks}
      initialSections={initialSections}
      initialSettings={{
        id: post?.id || '',
        title: post?.title || '',
        slug: post?.slug || id || '',
        description: post?.seo?.metaDescription || '',
        keywords: '',
      }}
      pageId={post?.id || id}
      pageSlug={post?.slug || id}
      onSave={async (data) => {
        await saveMutation.mutateAsync(data);
      }}
    />
  );
}
