import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCases, deleteCase, setCasePublished, setHomeCasesOrder } from '@/services/cmsApi';
import { listHomeCases } from '@/services/publicApi';
import { Box, Button, Card, CardActionArea, CardContent, Grid, Typography, Chip, Select, MenuItem, FormControl, InputLabel, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, List, ListItem, ListItemButton, ListItemText, Paper, TextField } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import ArticleIcon from '@mui/icons-material/Article';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import DeleteIcon from '@mui/icons-material/Delete';
import { useToast } from '@/components/common/ToastProvider';
import { fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

export function CasesListPage() {
  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: listCases });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('cases.viewMode') as 'list' | 'grid') || 'grid');

  const PORTFOLIO_SLUGS = ['alaska-case', 'litclinic-case', 'leta-case', 'ursus-case', 'winwin-case', 'greendent-case', 'polygon-case', 'straumann-mobile-case'];
  
  const templates = useMemo(() => {
    return cases.filter(c => c.isTemplate);
  }, [cases]);
  
  const regularCases = useMemo(() => {
    const list = cases.filter(c => !c.isTemplate);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.slug || '').toLowerCase().includes(q) ||
      (c.summary || '').toLowerCase().includes(q)
    );
  }, [cases, search]);
  
  const handleCreateFromTemplate = (templateSlug: string) => {
    navigate(`/admin/cases/new?template=${templateSlug}`);
  };

  const publishMut = useMutation({
    mutationFn: ({ slug, isPublished }: { slug: string; isPublished: boolean }) => setCasePublished(slug, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка публикации', 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      showToast('Кейс удален', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка удаления', 'error');
    },
  });

  const { data: homeCases = [] } = useQuery({ queryKey: ['homeCases'], queryFn: listHomeCases });
  const [homeOrderSlugs, setHomeOrderSlugs] = useState<string[]>([]);
  const [homeOrderDirty, setHomeOrderDirty] = useState(false);

  useEffect(() => {
    if (homeCases.length > 0 && !homeOrderDirty) {
      const slugs = homeCases.map((c: any) => c.slug || (c.link || '').replace('/cases/', ''));
      setHomeOrderSlugs(slugs.filter(Boolean));
    }
  }, [homeCases, homeOrderDirty]);

  const homeOrderSaveMut = useMutation({
    mutationFn: (slugs: string[]) => setHomeCasesOrder(slugs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCases'] });
      setHomeOrderDirty(false);
      showToast('Порядок сохранён', 'success');
    },
    onError: (err: any) => showToast(err?.message || 'Ошибка сохранения', 'error'),
  });

  const moveHome = (index: number, delta: number) => {
    const next = [...homeOrderSlugs];
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setHomeOrderSlugs(next);
    setHomeOrderDirty(true);
  };

  const addToHome = (slug: string) => {
    if (homeOrderSlugs.includes(slug)) return;
    setHomeOrderSlugs([...homeOrderSlugs, slug]);
    setHomeOrderDirty(true);
  };

  const removeFromHome = (slug: string) => {
    setHomeOrderSlugs(homeOrderSlugs.filter((s) => s !== slug));
    setHomeOrderDirty(true);
  };

  const publishedSlugs = new Set(regularCases.filter((c) => c.isPublished).map((c) => c.slug));
  const availableToAdd = [...publishedSlugs].filter((s) => !homeOrderSlugs.includes(s));
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Кейсы</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {templates.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Создать из шаблона</InputLabel>
              <Select
                value={selectedTemplate}
                label="Создать из шаблона"
                onChange={(e) => {
                  const template = e.target.value;
                  setSelectedTemplate('');
                  if (template) {
                    handleCreateFromTemplate(template);
                  }
                }}
              >
                {templates.map((t) => (
                  <MenuItem key={t.slug} value={t.slug}>
                    {t.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => { if (v) { setView(v); localStorage.setItem('cases.viewMode', v); } }}>
            <ToggleButton value="list" aria-label="Список">Список</ToggleButton>
            <ToggleButton value="grid" aria-label="Плитка">Плитка</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={() => navigate('/admin/cases/new')}>Добавить кейс</Button>
        </Box>
      </Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, overflow: 'visible' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Порядок на главной</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          {availableToAdd.length > 0 ? (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Добавить кейс</InputLabel>
              <Select
                label="Добавить кейс"
                value=""
                onChange={(e) => { const v = e.target.value; if (v) addToHome(v); }}
                MenuProps={{ disablePortal: false }}
              >
                <MenuItem value="">— выбрать —</MenuItem>
                {availableToAdd.map((slug) => {
                  const c = cases.find((x) => x.slug === slug);
                  return <MenuItem key={slug} value={slug}>{c?.title || slug}</MenuItem>;
                })}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary">Опубликуйте кейсы (кнопка «Опубликовать»), чтобы добавить их на главную.</Typography>
          )}
          {homeOrderDirty && (
            <Button
              variant="contained"
              size="small"
              onClick={() => homeOrderSaveMut.mutate(homeOrderSlugs)}
              disabled={homeOrderSaveMut.isPending}
            >
              {homeOrderSaveMut.isPending ? 'Сохранение…' : 'Сохранить порядок'}
            </Button>
          )}
        </Box>
        {homeOrderSlugs.length === 0 ? (
          <Typography color="text.secondary">Пока нет кейсов на главной. Добавьте из выпадающего списка выше.</Typography>
        ) : (
          <List dense disablePadding>
            {homeOrderSlugs.map((slug, idx) => {
              const c = cases.find((x) => x.slug === slug);
              return (
                <ListItem
                  key={slug}
                  disablePadding
                  sx={{ py: 0.5 }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0 }} onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => moveHome(idx, -1)} disabled={idx === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => moveHome(idx, 1)} disabled={idx === homeOrderSlugs.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => removeFromHome(slug)}><RemoveIcon fontSize="small" /></IconButton>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => navigate(`/admin/cases/${encodeURIComponent(slug)}`)}>
                    <ListItemText primary={`${idx + 1}. ${c?.title || slug}`} secondary={slug} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или slug"
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
        />
        {PORTFOLIO_SLUGS.map((slug) => (
          <Chip
            key={slug}
            label={slug}
            size="small"
            variant="outlined"
            onClick={() => navigate(`/admin/cases/${encodeURIComponent(slug)}`)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
      {templates.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Шаблоны</Typography>
          <Grid container spacing={2}>
            {templates.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.slug}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => navigate(`/admin/cases/${encodeURIComponent(c.slug)}`)}>
                    <Box sx={{ width: '100%', height: 140, overflow: 'hidden', bgcolor: 'grey.200' }}>
                      <SafeImage
                        src={(() => {
                          const heroUrl = c.heroImageUrl?.trim();
                          const donorUrl = c.donorImageUrl?.trim();
                          const slug = c.slug?.trim();
                          if (heroUrl) return heroUrl;
                          if (donorUrl) return donorUrl;
                          if (slug) return `/legacy/img/cases/${slug}/cover.png`;
                          return fallbackImageUrl();
                        })()}
                        fallback={fallbackImageUrl()}
                        alt={c.title || 'Кейс'}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        hideOnError={false}
                        lazy={true}
                      />
                    </Box>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ArticleIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle1">{c.title}</Typography>
                        <Chip label="Шаблон" size="small" color="primary" />
                      </Box>
                      {c.summary && <Typography color="text.secondary" variant="body2">{c.summary}</Typography>}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      <Typography variant="h6" sx={{ mb: 2 }}>Кейсы</Typography>
      {view === 'list' ? (
        <Paper variant="outlined">
          <List>
            {regularCases.map((c) => {
              const published = Boolean(c.isPublished);
              return (
                <ListItem key={c.slug}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Редактировать">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); navigate(`/admin/cases/${encodeURIComponent(c.slug)}`); }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Предпросмотр">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); window.open(`/admin/cases/${encodeURIComponent(c.slug)}/preview`, '_blank'); }}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={published ? 'Скрыть' : 'Опубликовать'}>
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await publishMut.mutateAsync({ slug: c.slug, isPublished: !published });
                            showToast(published ? 'Кейс скрыт' : 'Кейс опубликован', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка публикации', 'error');
                          }
                        }}>
                          {published ? <PublishedWithChangesIcon color="success" /> : <UnpublishedIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('Удалить кейс?')) {
                            deleteMut.mutate(c.slug);
                          }
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => navigate(`/admin/cases/${encodeURIComponent(c.slug)}`)}>
                    <ListItemText primary={c.title || '(без названия)'} secondary={c.summary || c.slug} />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {regularCases.length === 0 && (
              <ListItem>
                <ListItemText primary="Нет кейсов" />
              </ListItem>
            )}
          </List>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {regularCases.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Нет кейсов</Typography>
              </Box>
            </Grid>
          ) : (
            regularCases.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.slug}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => navigate(`/admin/cases/${encodeURIComponent(c.slug)}`)}>
                    <Box sx={{ width: '100%', height: 140, overflow: 'hidden', bgcolor: 'grey.200' }}>
                      <SafeImage
                        src={(() => {
                          const heroUrl = c.heroImageUrl?.trim();
                          const donorUrl = c.donorImageUrl?.trim();
                          const slug = c.slug?.trim();
                          if (heroUrl) return heroUrl;
                          if (donorUrl) return donorUrl;
                          if (slug) return `/legacy/img/cases/${slug}/cover.png`;
                          return fallbackImageUrl();
                        })()}
                        fallback={fallbackImageUrl()}
                        alt={c.title || 'Кейс'}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        hideOnError={false}
                        lazy={true}
                      />
                    </Box>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                      {c.summary && <Typography color="text.secondary" variant="body2">{c.summary}</Typography>}
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ display: 'flex', gap: 0.5, p: 1, justifyContent: 'flex-end' }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/cases/${encodeURIComponent(c.slug)}`); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(`/admin/cases/${encodeURIComponent(c.slug)}/preview`, '_blank'); }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await publishMut.mutateAsync({ slug: c.slug, isPublished: !c.isPublished });
                        showToast(c.isPublished ? 'Кейс скрыт' : 'Кейс опубликован', 'success');
                      } catch (err: any) {
                        showToast(err?.message || 'Ошибка публикации', 'error');
                      }
                    }}>
                      {c.isPublished ? <PublishedWithChangesIcon fontSize="small" color="success" /> : <UnpublishedIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Удалить кейс?')) {
                        deleteMut.mutate(c.slug);
                      }
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  );
}


