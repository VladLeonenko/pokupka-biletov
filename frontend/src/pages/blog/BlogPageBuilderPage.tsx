import { PageBuilderWrapper } from '@/components/page-builder/PageBuilderWrapper';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getBlogPost, upsertBlogPost } from '@/services/cmsApi';
import { PageBlock, PageSection } from '@/types/pageBuilder';
import { slugify } from '@/utils/slugify';

export function BlogPageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: post, isLoading } = useQuery({
    queryKey: ['admin-blog-post', id],
    queryFn: () => getBlogPost(id!),
    enabled: !isNew && !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { blocks?: PageBlock[]; sections?: PageSection[]; settings?: any }) => {
      if (!post && !isNew) {
        throw new Error('Post not found');
      }

      const title = (data.settings?.title || post?.title || '').trim();
      if (isNew && !title) {
        throw new Error('Заполните название статьи в панели настроек (⚙️) перед сохранением');
      }

      const contentJson = {
        ...(post?.contentJson || {}),
        blocks: data.blocks || [],
        sections: data.sections || [],
      };

      const slugForApi = isNew
        ? (title ? slugify(title) : '')
        : (post?.slug || id || '');
      if (isNew && !slugForApi) {
        throw new Error('Название не содержит допустимых символов для slug');
      }

      const updatedPost: any = {
        ...post,
        id: post?.id || '',
        slug: isNew ? '' : (post?.slug || id || ''),
        title: title || post?.title || '',
        contentHtml: post?.contentHtml || '',
        seo: {
          ...post?.seo,
          metaTitle: data.settings?.title || post?.seo?.metaTitle || '',
          metaDescription: data.settings?.description || post?.seo?.metaDescription || '',
        },
        contentJson,
      };
      if (isNew) {
        updatedPost.desiredSlug = slugForApi;
      }

      return await upsertBlogPost(updatedPost as any);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      queryClient.invalidateQueries({ queryKey: ['admin-blog-post'] });
      queryClient.invalidateQueries({ queryKey: ['public-blog-post'] });
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(`/admin/blog/${isNew ? 'new' : id}`)}>
          К редактору блоков
        </Button>
        {isNew && (
          <Typography variant="body2" color="text.secondary">
            Заполните название в панели ⚙️ перед сохранением
          </Typography>
        )}
      </Box>
    <Box sx={{ flex: 1, minHeight: 0 }}>
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
    </Box>
    </Box>
  );
}
