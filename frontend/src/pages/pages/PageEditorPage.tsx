import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteSitePage, getSitePage, movePage, publishPage, updateSitePage, getPartials } from '@/services/cmsApi';
import { Box, Button, Grid, Paper, Switch, TextField, Typography, FormControlLabel, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { PagePreviewPage } from './PagePreviewPage';

export function PageEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: page } = useQuery({ queryKey: ['page', id], queryFn: () => getSitePage(id), enabled: !!id });
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [html, setHtml] = useState('');
  const [published, setPublished] = useState(false);
  const [carouselSlug, setCarouselSlug] = useState('');
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlRaw, setHtmlRaw] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useMemo(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.path);
      setHtml(page.html);
      setPublished(Boolean(page.isPublished));
    }
  }, [page]);

  useEffect(() => {
    const loadStructure = async () => {
      try {
        const parts = await getPartials();
        const head = parts.head || '';
        const header = parts.header || '';
        const footer = parts.footer || '';
        const doc = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n${head}\n</head>\n<body class="page">\n${header}\n<!--CONTENT_START-->\n${html}\n<!--CONTENT_END-->\n${footer}\n</body>\n</html>`;
        setHtmlRaw(doc);
      } catch {
        const fallback = `<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\"/>\n<title>${title || ''}</title>\n</head>\n<body>\n<!--CONTENT_START-->\n${html}\n<!--CONTENT_END-->\n</body>\n</html>`;
        setHtmlRaw(fallback);
      }
    };
    if (htmlMode) {
      loadStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlMode]);

  const mutation = useMutation({
    mutationFn: (payload: { title?: string; html?: string }) => updateSitePage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', id] });
      showToast('Страница сохранена', 'success');
    }
  });
  const publishMut = useMutation({
    mutationFn: (next: boolean) => publishPage(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', id] });
      showToast('Статус публикации обновлён', 'success');
    }
  });
  const moveMut = useMutation({
    mutationFn: (newSlug: string) => movePage(id, newSlug),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        queryClient.invalidateQueries({ queryKey: ['page', id] });
        showToast('Slug изменён', 'success');
      }
    }
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteSitePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      showToast('Страница удалена', 'success');
    }
  });

  if (!page) return <Typography>Страница не найдена</Typography>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Редактирование: {page.title}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Контент</Typography>
              <FormControlLabel control={<Switch checked={htmlMode} onChange={(e)=>setHtmlMode(e.target.checked)} />} label="HTML" />
            </Box>
            {htmlMode ? (
              <TextField fullWidth multiline minRows={18} value={htmlRaw} onChange={(e)=>setHtmlRaw(e.target.value)} sx={{ fontFamily: 'monospace' }} />
            ) : (
              <ReactQuill
                theme="snow"
                value={html}
                onChange={(value) => setHtml(value)}
                style={{ height: 400 }}
              />
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField size="small" label="Slug карусели" value={carouselSlug} onChange={(e) => setCarouselSlug(e.target.value)} />
              <Button size="small" onClick={() => {
                if (!carouselSlug.trim()) return;
                setHtml((prev) => `${prev}\n[carousel slug="${carouselSlug.trim()}"]`);
                showToast('Карусель вставлена', 'success');
              }}>Вставить карусель</Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Основное</Typography>
            <TextField
              fullWidth
              label="Заголовок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              fullWidth
              label="Slug (путь)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              sx={{ mt: 2 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Switch
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <Typography>Опубликована</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    if (slug !== id) await moveMut.mutateAsync(slug);
                    const contentToSave = htmlMode ? (() => {
                      const m = htmlRaw.match(/<!--CONTENT_START-->([\s\S]*?)<!--CONTENT_END-->/);
                      return m ? m[1].trim() : htmlRaw;
                    })() : html;
                    await mutation.mutateAsync({ title, html: contentToSave });
                    await publishMut.mutateAsync(published);
                  } catch (err: any) {
                    showToast(err?.message || 'Ошибка сохранения', 'error');
                  }
                }}
              >Сохранить</Button>
              <Button color="error" sx={{ ml: 1 }} onClick={() => deleteMut.mutate()}>Удалить</Button>
              <Button sx={{ ml: 1 }} onClick={() => setPreviewOpen(true)}>Предпросмотр</Button>
              <Button sx={{ ml: 1 }} onClick={async () => {
                const { movePageToBlog } = await import('@/services/cmsApi');
                await movePageToBlog(id);
                navigate('/blog');
              }}>Перенести в блог</Button>
              <Button sx={{ ml: 1 }} disabled={!id || id === 'new'} onClick={async () => {
                if (!id || id === 'new') { showToast('Сохраните страницу перед переносом', 'warning'); return; }
                try {
                  const { movePageToCase } = await import('@/services/cmsApi');
                  await movePageToCase(id);
                  navigate('/cases');
                } catch (err: any) {
                  showToast(err?.message || 'Ошибка переноса', 'error');
                }
              }}>Перенести в кейсы</Button>
              <Button sx={{ ml: 1 }} disabled={!id || id === 'new'} onClick={async () => {
                if (!id || id === 'new') { showToast('Сохраните страницу перед переносом', 'warning'); return; }
                try {
                  const { movePageToProduct } = await import('@/services/cmsApi');
                  const price = window.prompt('Цена (в рублях):', '0');
                  const period = window.prompt('Период (one_time|monthly|yearly):', 'one_time') as any;
                  const cents = Math.round(Number(price || 0) * 100);
                  await movePageToProduct(id, { price_cents: cents, currency: 'RUB', price_period: period });
                  navigate('/products');
                } catch (err: any) {
                  showToast(err?.message || 'Ошибка переноса', 'error');
                }
              }}>Перенести в продукт</Button>
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>SEO</Typography>
            <TextField
              fullWidth
              label="Meta Title"
              value={page.seo.metaTitle || ''}
              onChange={(e) => mutation.mutate({ html: page.html, title: page.title, })}
              placeholder="Заполните на вкладке SEO"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Подробное редактирование в разделе SEO
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          style: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Предпросмотр: {page?.title || 'Страница'}</Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
          {previewOpen && <PagePreviewPage pageId={id} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}


