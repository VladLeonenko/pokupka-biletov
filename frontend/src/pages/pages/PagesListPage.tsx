import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteSitePage, listSitePages, movePageToBlog, publishPage } from '@/services/cmsApi';
import { Box, CircularProgress, Grid, IconButton, List, ListItem, ListItemButton, ListItemText, Paper, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Card, CardActionArea, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import DeleteIcon from '@mui/icons-material/Delete';
import WorkIcon from '@mui/icons-material/Work';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import { movePageToCase, movePageToProduct, uploadImage, undoLastPageMove } from '@/services/cmsApi';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

export function PagesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { token } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ 
    queryKey: ['pages'], 
    queryFn: listSitePages,
    enabled: !!token, // Запрос только при наличии токена
    retry: false, // Не повторять при ошибке 401
    onError: (error: any) => {
      // Тихая обработка ошибок авторизации
      if (error?.message?.includes('Authentication required') || error?.message?.includes('401')) {
        return;
      }
    },
  });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('pages.viewMode') as 'list' | 'grid') || 'grid');
  const [caseOpen, setCaseOpen] = useState<{ open: boolean; id?: string; slug?: string; summary?: string; hero?: string; tools?: string; gallery?: string; metrics?: string }>({ open: false });
  const [productOpen, setProductOpen] = useState<{ open: boolean; id?: string; slug?: string; price?: string; period?: 'one_time' | 'monthly' | 'yearly'; currency?: string; features?: string; sort?: string }>({ open: false });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data || []).filter((p) => {
      const title = (p?.title || '').toLowerCase();
      const path = (p?.path || '').toLowerCase();
      return title.includes(q) || path.includes(q);
    });
  }, [data, search]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Страницы сайта</Typography>
        <Button size="small" variant="outlined" onClick={async () => {
          try {
            const r = await undoLastPageMove();
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['pages'] }),
              queryClient.invalidateQueries({ queryKey: ['cases'] }),
              queryClient.invalidateQueries({ queryKey: ['products'] }),
              queryClient.invalidateQueries({ queryKey: ['blog'] }),
            ]);
            showToast(`Вернули страницу: ${r.restored_slug}`, 'success');
          } catch (err: any) {
            showToast(err?.message || 'Не удалось отменить перенос', 'error');
          }
        }}>Отменить перенос</Button>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => { if (v) { setView(v); localStorage.setItem('pages.viewMode', v); } }}>
          <ToggleButton value="list" aria-label="Список">Список</ToggleButton>
          <ToggleButton value="grid" aria-label="Плитка">Плитка</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию или пути"
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : isError ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="error">Не удалось загрузить список страниц</Typography>
          <Typography variant="body2" color="text.secondary">{(error as any)?.message || String(error)}</Typography>
        </Paper>
      ) : view === 'list' ? (
        <Paper variant="outlined">
          <List>
            {filtered.map((p) => {
              const published = Boolean(p.isPublished);
              return (
                <ListItem key={p.id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Редактировать">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); navigate(`/admin/pages/${encodeURIComponent(p.id)}`); }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Предпросмотр">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); window.open(`/admin/pages/${encodeURIComponent(p.id)}/preview`, '_blank'); }}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={published ? 'Скрыть' : 'Опубликовать'}>
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await publishPage(p.id, !published);
                            queryClient.invalidateQueries({ queryKey: ['pages'] });
                            showToast(published ? 'Страница скрыта' : 'Страница опубликована', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка публикации', 'error');
                          }
                        }}>
                          {published ? <PublishedWithChangesIcon color="success" /> : <UnpublishedIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Перенести в блог">
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await movePageToBlog(p.id);
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['pages'] }),
                              queryClient.invalidateQueries({ queryKey: ['blog'] }),
                            ]);
                            showToast('Перенесено в блог', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка переноса', 'error');
                          }
                        }}>
                          <DriveFileMoveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Перенести в кейсы">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); setCaseOpen({ open: true, id: p.id, slug: p.id }); }}>
                          <WorkIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Перенести в продукты">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); setProductOpen({ open: true, id: p.id, slug: p.id, period: 'one_time', currency: 'RUB' }); }}>
                          <PriceChangeIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteSitePage(p.id);
                            queryClient.invalidateQueries({ queryKey: ['pages'] });
                            showToast('Страница удалена', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка удаления', 'error');
                          }
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => navigate(`/admin/pages/${encodeURIComponent(p.id)}`)}>
                    <ListItemText primary={p.title || '(без названия)'} secondary={p.path} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate(`/admin/pages/${encodeURIComponent(p.id)}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>{p.title || '(без названия)'}</Typography>
                      {p.isPublished && <Chip label="Опубликовано" size="small" color="success" />}
                      {!p.isPublished && <Chip label="Скрыто" size="small" color="default" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">{p.path}</Typography>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ display: 'flex', gap: 0.5, p: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title="Редактировать">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/pages/${encodeURIComponent(p.id)}`); }}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Предпросмотр">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(`/admin/pages/${encodeURIComponent(p.id)}/preview`, '_blank'); }}><VisibilityIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={p.isPublished ? 'Скрыть' : 'Опубликовать'}>
                    <IconButton size="small" onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await publishPage(p.id, !p.isPublished);
                        queryClient.invalidateQueries({ queryKey: ['pages'] });
                        showToast(p.isPublished ? 'Страница скрыта' : 'Страница опубликована', 'success');
                      } catch (err: any) {
                        showToast(err?.message || 'Ошибка публикации', 'error');
                      }
                    }}>
                      {p.isPublished ? <PublishedWithChangesIcon fontSize="small" color="success" /> : <UnpublishedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={caseOpen.open} onClose={() => setCaseOpen({ open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Перенести в кейсы</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Slug кейса" sx={{ mt: 1 }} value={caseOpen.slug || ''} onChange={(e) => setCaseOpen({ ...caseOpen, slug: e.target.value })} />
          <TextField fullWidth label="Краткое описание" sx={{ mt: 2 }} value={caseOpen.summary || ''} onChange={(e) => setCaseOpen({ ...caseOpen, summary: e.target.value })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField fullWidth label="Hero изображение URL" value={caseOpen.hero || ''} onChange={(e) => setCaseOpen({ ...caseOpen, hero: e.target.value })} />
            <Button component="label" variant="outlined">Загрузить
              <input hidden type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                try { const r = await uploadImage(file); setCaseOpen({ ...caseOpen, hero: r.url }); showToast('Изображение загружено', 'success'); }
                catch (err: any) { showToast(err?.message || 'Ошибка загрузки', 'error'); }
              }} />
            </Button>
          </Box>
          <TextField fullWidth label="Инструменты (через запятую)" sx={{ mt: 2 }} value={caseOpen.tools || ''} onChange={(e) => setCaseOpen({ ...caseOpen, tools: e.target.value })} />
          <TextField fullWidth label="Галерея (URL через запятую)" sx={{ mt: 2 }} value={caseOpen.gallery || ''} onChange={(e) => setCaseOpen({ ...caseOpen, gallery: e.target.value })} />
          <TextField fullWidth label="KPI (JSON объект)" sx={{ mt: 2 }} value={caseOpen.metrics || ''} onChange={(e) => setCaseOpen({ ...caseOpen, metrics: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaseOpen({ open: false })}>Отмена</Button>
          <Button variant="contained" onClick={async () => {
            if (!caseOpen.id) return;
            try {
              const extras: any = {
                summary: caseOpen.summary || undefined,
                hero_image_url: caseOpen.hero || undefined,
              };
              if (caseOpen.tools) extras.tools = caseOpen.tools.split(',').map(s => s.trim()).filter(Boolean);
              if (caseOpen.gallery) extras.gallery = caseOpen.gallery.split(',').map(s => s.trim()).filter(Boolean);
              if (caseOpen.metrics) { try { extras.metrics = JSON.parse(caseOpen.metrics); } catch { /* ignore */ } }
              await movePageToCase(caseOpen.id, caseOpen.slug, extras);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['pages'] }),
                queryClient.invalidateQueries({ queryKey: ['cases'] }),
              ]);
              setCaseOpen({ open: false });
              showToast('Перенесено в кейсы', 'success');
            } catch (err: any) {
              showToast(err?.message || 'Ошибка переноса', 'error');
            }
          }}>Перенести</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={productOpen.open} onClose={() => setProductOpen({ open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Перенести в продукты</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Slug продукта" sx={{ mt: 1 }} value={productOpen.slug || ''} onChange={(e) => setProductOpen({ ...productOpen, slug: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField fullWidth label="Цена (руб)" value={productOpen.price || '0'} onChange={(e) => setProductOpen({ ...productOpen, price: e.target.value })} />
            <TextField fullWidth label="Валюта" value={productOpen.currency || 'RUB'} onChange={(e) => setProductOpen({ ...productOpen, currency: e.target.value })} />
          </Box>
          <TextField fullWidth label="Период (one_time|monthly|yearly)" sx={{ mt: 2 }} value={productOpen.period || 'one_time'} onChange={(e) => setProductOpen({ ...productOpen, period: e.target.value as any })} />
          <TextField fullWidth label="Особенности (через запятую)" sx={{ mt: 2 }} value={productOpen.features || ''} onChange={(e) => setProductOpen({ ...productOpen, features: e.target.value })} />
          <TextField fullWidth type="number" label="Порядок" sx={{ mt: 2 }} value={productOpen.sort || '0'} onChange={(e) => setProductOpen({ ...productOpen, sort: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductOpen({ open: false })}>Отмена</Button>
          <Button variant="contained" onClick={async () => {
            if (!productOpen.id) return;
            try {
              const cents = Math.round(Number(productOpen.price || 0) * 100);
              await movePageToProduct(productOpen.id, {
                slug: productOpen.slug,
                price_cents: cents,
                currency: productOpen.currency || 'RUB',
                price_period: productOpen.period || 'one_time',
                features: productOpen.features ? productOpen.features.split(',').map(s => s.trim()).filter(Boolean) : [],
                sort_order: Number(productOpen.sort || 0),
              });
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['pages'] }),
                queryClient.invalidateQueries({ queryKey: ['products'] }),
              ]);
              setProductOpen({ open: false });
              showToast('Перенесено в продукты', 'success');
            } catch (err: any) {
              showToast(err?.message || 'Ошибка переноса', 'error');
            }
          }}>Перенести</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


