import { useState, useEffect } from 'react';
import { slugify } from '@/utils/slugify';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBlogPost, listBlogCategories, upsertBlogPost, uploadImage } from '@/services/cmsApi';
import { Box, Button, Paper, TextField, Typography, CircularProgress, Switch, FormControlLabel, Alert } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CodeIcon from '@mui/icons-material/Code';
import { useNavigate, useParams } from 'react-router-dom';
import { BlogBlockEditor } from '@/components/blog-editor/BlogBlockEditor';
import { BlogBlock } from '@/types/blogBlocks';
import { useToast } from '@/components/common/ToastProvider';

export function BlogBlockEditorPage() {
  const { id = '' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', id],
    queryFn: () => getBlogPost(id),
    enabled: !isNew,
  });

  const { data: categories = [] } = useQuery({ queryKey: ['blog-categories'], queryFn: listBlogCategories });

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [seoDescription, setSeoDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (isNew && title && !slug) {
      const s = slugify(title);
      if (s) setSlug(s);
    }
  }, [title, isNew, slug]);

  useEffect(() => {
    if (post) {
      setSlug(post.slug);
      setTitle(post.title);
      setSeoDescription(post.seo?.metaDescription || '');
      setCoverImageUrl(post.coverImageUrl || '');
      setCategorySlug(post.categorySlug || '');
      setIsPublished(!!post.isPublished);
      const cj = (post as any).contentJson || {};
      const rawBlocks = Array.isArray(cj.blocks) ? cj.blocks : [];
      const body = (post as any).body || (post as any).contentHtml || '';
      if (rawBlocks.length > 0) {
        setBlocks(rawBlocks);
      } else if (body && typeof body === 'string') {
        setBlocks([{ id: `text-${Date.now()}`, type: 'text', content: { html: body } }]);
      } else {
        setBlocks([]);
      }
    } else if (isNew) {
      setSlug('');
      setTitle('');
      setBlocks([]);
      setSeoDescription('');
      setCoverImageUrl('');
      setCategorySlug('');
      setIsPublished(false);
    }
  }, [post, isNew]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew && !slug.trim()) {
        throw new Error('Введите slug статьи');
      }
      const payload: any = {
        slug: isNew ? '' : (id as string),
        title,
        contentHtml: blocks.length > 0 ? '' : undefined,
        contentJson: { blocks },
        seo: { metaDescription: seoDescription },
        coverImageUrl: coverImageUrl || undefined,
        categorySlug: categorySlug || undefined,
        isPublished,
      };
      if (isNew) payload.desiredSlug = slug.trim();
      return upsertBlogPost(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      queryClient.invalidateQueries({ queryKey: ['blog', saved.slug] });
      if (isNew) {
        navigate(`/admin/blog/${saved.slug}`, { replace: true });
      }
      showToast('Сохранено', 'success');
    },
    onError: (e: any) => {
      showToast(e.message || 'Ошибка', 'error');
    },
  });

  if (isLoading && !isNew) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!post && !isNew) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Статья не найдена</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h5">{isNew ? 'Новая статья' : 'Редактирование статьи'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => navigate(`/admin/blog/${isNew ? 'new' : id}/html`)}
          >
            HTML
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BuildIcon />}
            onClick={() => navigate(`/admin/blog/${isNew ? 'new' : id}/builder`)}
          >
            Page Builder
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Редактор блоков</strong> — добавляйте блоки (текст, intro, код, FAQ), перетаскивайте для смены порядка. Для визуального конструктора секций — Page Builder.
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField fullWidth label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!isNew} sx={{ mb: 2 }} />
        <TextField fullWidth label="Название" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth label="SEO описание" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} multiline sx={{ mb: 2 }} />
        <TextField fullWidth label="Обложка (URL)" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="/uploads/images/..." sx={{ mb: 2 }} />
        <FormControlLabel control={<Switch checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />} label="Опубликовано" />
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>Блоки контента</Typography>
      <BlogBlockEditor blocks={blocks} onChange={setBlocks} />

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button onClick={() => navigate('/admin/blog')}>Отмена</Button>
      </Box>

      {saveMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{(saveMutation.error as Error).message}</Alert>}
    </Box>
  );
}
