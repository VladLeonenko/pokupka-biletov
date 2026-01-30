import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteBlogPost, listBlogPosts, setBlogPublished, getSemanticKeywords, generateArticleFromKeyword, createBlogCategory, deleteBlogCategory, listBlogCategories, getSemanticTopics, addSemanticTopic, deleteSemanticTopic } from '@/services/cmsApi';
import { Avatar, Box, Button, Card, CardActionArea, CardContent, CardMedia, Chip, CircularProgress, Grid, IconButton, List, ListItem, ListItemButton, ListItemText, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

// Компонент управления категориями
function BlogCategoriesSection() {
  const { data: categories = [] } = useQuery({ queryKey: ['blog-categories'], queryFn: listBlogCategories });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: () => createBlogCategory(slug.trim(), name.trim() || slug.trim()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] }); 
      setSlug(''); 
      setName(''); 
      showToast('Категория создана', 'success'); 
    },
    onError: (e: any) => showToast(e?.message || 'Ошибка создания категории', 'error')
  });
  
  const del = useMutation({
    mutationFn: (s: string) => deleteBlogCategory(s),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] }); 
      showToast('Категория удалена', 'success'); 
    },
    onError: (e: any) => showToast(e?.message || 'Ошибка удаления', 'error')
  });

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Категории блога</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField 
              label="Slug" 
              fullWidth 
              size="small" 
              value={slug} 
              onChange={(e) => setSlug(e.target.value)}
              placeholder="category-slug"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              label="Название" 
              fullWidth 
              size="small" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Название категории"
            />
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              variant="contained" 
              onClick={() => {
                if (!slug.trim()) {
                  showToast('Введите slug категории', 'warning');
                  return;
                }
                if (categories.some(c => c.slug === slug.trim())) {
                  showToast('Категория с таким slug уже существует', 'warning');
                  return;
                }
                create.mutate();
              }}
              disabled={create.isPending || !slug.trim()}
            >
              {create.isPending ? 'Создание...' : 'Добавить категорию'}
            </Button>
          </Grid>
        </Grid>
        {categories.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Slug</strong></TableCell>
                <TableCell><strong>Название</strong></TableCell>
                <TableCell align="right"><strong>Действия</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.slug} hover>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell>{c.name || c.slug}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="error" 
                      size="small"
                      onClick={() => {
                        if (window.confirm(`Удалить категорию "${c.name || c.slug}"?`)) {
                          del.mutate(c.slug);
                        }
                      }}
                      disabled={del.isPending}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography color="text.secondary">Категорий пока нет</Typography>
        )}
      </Box>
    </Paper>
  );
}

export function BlogListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['blog'], queryFn: listBlogPosts });
  const { showToast } = useToast();
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('blog.viewMode') as 'list' | 'grid') || 'grid');
  const [seed, setSeed] = useState<string>('маркетинг');
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywords, setKeywords] = useState<{ high: Array<{ q: string; ya: number; ga: number }>; medium: Array<{ q: string; ya: number; ga: number }>; low: Array<{ q: string; ya: number; ga: number }>}>({ high: [], medium: [], low: [] });
  const [generating, setGenerating] = useState<string | null>(null);
  const [customSeed, setCustomSeed] = useState('');
  
  // Загружаем темы из API (сохраняются в БД навсегда)
  const { data: topicsData = [], refetch: refetchTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['semantic-topics'],
    queryFn: getSemanticTopics,
    retry: 2,
    staleTime: 30000,
  });
  
  const topics = Array.isArray(topicsData) ? topicsData : [];
  
  // Мутация для добавления темы
  const addTopicMutation = useMutation({
    mutationFn: addSemanticTopic,
    onSuccess: () => {
      refetchTopics();
      showToast('Тема добавлена', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка добавления темы', 'error');
    },
  });
  
  // Мутация для удаления темы
  const deleteTopicMutation = useMutation({
    mutationFn: deleteSemanticTopic,
    onSuccess: () => {
      refetchTopics();
      showToast('Тема удалена', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка удаления темы', 'error');
    },
  });

  // частоты убраны из UI

  async function loadKeywords(s: string) {
    setSeed(s);
    setLoadingKeywords(true);
    try {
      const ks = await getSemanticKeywords(s);
      setKeywords(ks);
    } catch (e: any) {
      showToast(e?.message || 'Не удалось получить семантику', 'error');
    } finally {
      setLoadingKeywords(false);
    }
  }

  const getCoverUrl = (post: any) => {
    const raw =
      post?.coverImageUrl ||
      post?.cover_image_url ||
      post?.seo?.ogImageUrl ||
      post?.seo?.og_image_url ||
      post?.ogImageUrl ||
      post?.og_image_url ||
      '';
    return resolveImageUrl(raw, '');
  };

  useEffect(() => { loadKeywords(seed); // initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Блог</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => { if (v) { setView(v); localStorage.setItem('blog.viewMode', v); } }}>
            <ToggleButton value="list">Список</ToggleButton>
            <ToggleButton value="grid">Плитка</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={() => navigate('/admin/blog/new')}>Новая статья</Button>
        </Box>
      </Box>
      
      {/* Управление категориями */}
      <BlogCategoriesSection />
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1">Семантическое ядро</Typography>
          {topicsLoading && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Загрузка тем...</Typography>}
          {!topicsLoading && topics.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Темы не найдены. Добавьте свою тему ниже.
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {topics.map((s) => (
              <Chip 
                key={s} 
                label={s} 
                color={seed === s ? 'primary' : 'default'} 
                onClick={() => loadKeywords(s)}
                onDelete={(e) => {
                  e.stopPropagation();
                  if (confirm(`Удалить тему "${s}"?`)) {
                    deleteTopicMutation.mutate(s);
                  }
                }}
                deleteIcon={<DeleteIcon />}
              />
            ))}
            <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
              <input 
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc' }} 
                placeholder="Своя тема" 
                value={customSeed} 
                onChange={(e) => setCustomSeed(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && customSeed.trim()) {
                    const newTopic = customSeed.trim();
                    if (!topics.includes(newTopic)) {
                      addTopicMutation.mutate(newTopic);
                      setCustomSeed('');
                      loadKeywords(newTopic);
                    }
                  }
                }}
              />
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => { 
                  if (customSeed.trim()) {
                    const newTopic = customSeed.trim();
                    if (!topics.includes(newTopic)) {
                      addTopicMutation.mutate(newTopic);
                      setCustomSeed('');
                      loadKeywords(newTopic);
                    } else {
                      showToast('Такая тема уже есть', 'warning');
                      loadKeywords(newTopic);
                    }
                  }
                }}
              >
                Добавить
              </Button>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            {loadingKeywords ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><CircularProgress size={20} /><Typography>Загружаем ключевые запросы…</Typography></Box>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Высокочастотные (ВЧ)</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {(keywords.high || []).filter(k => k && k.q).map((k, idx) => (
                    <Chip 
                      key={`high:${k.q}:${idx}`} 
                      label={`ВЧ · ${k.q}`} 
                      sx={{
                        bgcolor: '#f44336 !important',
                        color: '#ffffff !important',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#d32f2f !important',
                        },
                        '&.MuiChip-filled': {
                          bgcolor: '#f44336 !important',
                          color: '#ffffff !important',
                        },
                      }}
                      onClick={async () => {
                        setGenerating(k.q);
                      try {
                        const r = await generateArticleFromKeyword(k.q);
                        await queryClient.invalidateQueries({ queryKey: ['blog'] });
                        showToast(`Черновик создан: ${r.title}`, 'success');
                      } catch (e: any) {
                        showToast(e?.message || 'Не удалось сгенерировать статью', 'error');
                      } finally {
                        setGenerating(null);
                      }
                    }} disabled={!!generating} />
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Среднечастотные (СЧ)</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {(keywords.medium || []).filter(k => k && k.q).map((k, idx) => (
                    <Chip 
                      key={`medium:${k.q}:${idx}`} 
                      label={`СЧ · ${k.q}`} 
                      sx={{
                        bgcolor: '#2196f3 !important',
                        color: '#ffffff !important',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#1976d2 !important',
                        },
                        '&.MuiChip-filled': {
                          bgcolor: '#2196f3 !important',
                          color: '#ffffff !important',
                        },
                      }}
                      onClick={async () => {
                        setGenerating(k.q);
                      try {
                        const r = await generateArticleFromKeyword(k.q);
                        await queryClient.invalidateQueries({ queryKey: ['blog'] });
                        showToast(`Черновик создан: ${r.title}`, 'success');
                      } catch (e: any) {
                        showToast(e?.message || 'Не удалось сгенерировать статью', 'error');
                      } finally {
                        setGenerating(null);
                      }
                    }} disabled={!!generating} />
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Низкочастотные (НЧ)</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(keywords.low || []).filter(k => k && k.q).map((k, idx) => (
                    <Chip 
                      key={`low:${k.q}:${idx}`} 
                      label={`НЧ · ${k.q}`} 
                      sx={{
                        bgcolor: '#4caf50 !important',
                        color: '#ffffff !important',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#388e3c !important',
                        },
                        '&.MuiChip-filled': {
                          bgcolor: '#4caf50 !important',
                          color: '#ffffff !important',
                        },
                      }}
                      onClick={async () => {
                        setGenerating(k.q);
                      try {
                        const r = await generateArticleFromKeyword(k.q);
                        await queryClient.invalidateQueries({ queryKey: ['blog'] });
                        showToast(`Черновик создан: ${r.title}`, 'success');
                      } catch (e: any) {
                        showToast(e?.message || 'Не удалось сгенерировать статью', 'error');
                      } finally {
                        setGenerating(null);
                      }
                    }} disabled={!!generating} />
                  ))}
                </Box>
                {generating && <Typography color="text.secondary" sx={{ mt: 1 }}>Генерируем статью: {generating}…</Typography>}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1">Хайлайты</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {data.filter(d => d.isFeatured).map((p) => (
              <Chip key={p.id} label={p.title || p.slug} onClick={() => navigate(`/admin/blog/${p.id}`)} />
            ))}
            {data.filter(d => d.isFeatured).length === 0 && (
              <Typography color="text.secondary">Нет выбранных хайлайтов</Typography>
            )}
          </Box>
        </Box>
      </Paper>
      {view === 'list' ? (
        <Paper variant="outlined">
          <List>
            {data.map((post) => {
              const published = Boolean(post.isPublished);
              const moderation = !published || (post.tags || []).includes('ai-draft');
              const coverUrl = getCoverUrl(post);
              return (
                <ListItem key={post.id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={published ? 'Скрыть' : 'Опубликовать'}>
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await setBlogPublished(post.slug, !published);
                            queryClient.invalidateQueries({ queryKey: ['blog'] });
                            showToast(published ? 'Статья скрыта' : 'Статья опубликована', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка публикации', 'error');
                          }
                        }}>
                          {published ? <PublishedWithChangesIcon color="success" /> : <UnpublishedIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); navigate(`/admin/blog/${post.id}`); }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton edge="end" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteBlogPost(post.id);
                            queryClient.invalidateQueries({ queryKey: ['blog'] });
                            showToast('Статья удалена', 'success');
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
                  <ListItemButton
                    onClick={() => navigate(`/admin/blog/${post.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Avatar
                      variant="rounded"
                      src={coverUrl || undefined}
                      alt={post.title || post.slug || 'Обложка'}
                      sx={{
                        width: 72,
                        height: 72,
                        flexShrink: 0,
                        bgcolor: coverUrl ? 'transparent' : 'primary.main',
                        color: coverUrl ? 'inherit' : '#fff',
                        fontWeight: 600,
                      }}
                    >
                      {!coverUrl ? (post.title?.[0] || post.slug?.[0] || '?') : null}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <ListItemText
                        primaryTypographyProps={{ fontWeight: 600 }}
                        primary={post.title || '(без названия)'}
                        secondary={`${post.slug}${post.categorySlug ? ` · ${post.categorySlug}` : ''}`}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {moderation && (<Chip size="small" color="warning" label="На модерации" />)}
                        {(post.tags || []).map(t => (<Chip key={t} size="small" label={t} />))}
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {data.map((post) => {
            const published = Boolean(post.isPublished);
            const moderation = !published || (post.tags || []).includes('ai-draft');
            const coverUrl = getCoverUrl(post);
            return (
              <Grid item xs={12} sm={6} md={4} key={post.id}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => navigate(`/admin/blog/${post.id}`)}>
                    {coverUrl && (
                      <CardMedia
                        component="img"
                        height="160"
                        image={coverUrl}
                        alt={post.title || post.slug || 'Обложка'}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{post.title || '(без названия)'}</Typography>
                      <Typography variant="body2" color="text.secondary">{post.slug}{post.categorySlug ? ` · ${post.categorySlug}` : ''}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                        {moderation && (<Chip size="small" color="warning" label="На модерации" />)}
                        {(post.tags || []).map(t => (<Chip key={t} size="small" label={t} />))}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ display: 'flex', gap: 0.5, p: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title={published ? 'Скрыть' : 'Опубликовать'}>
                      <IconButton size="small" onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await setBlogPublished(post.slug, !published);
                          queryClient.invalidateQueries({ queryKey: ['blog'] });
                          showToast(published ? 'Статья скрыта' : 'Статья опубликована', 'success');
                        } catch (err: any) {
                          showToast(err?.message || 'Ошибка публикации', 'error');
                        }
                      }}>
                        {published ? <PublishedWithChangesIcon fontSize="small" color="success" /> : <UnpublishedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/blog/${post.id}`); }}><EditIcon fontSize="small" /></IconButton>
                    <Tooltip title="Удалить">
                      <IconButton size="small" onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteBlogPost(post.id);
                          queryClient.invalidateQueries({ queryKey: ['blog'] });
                          showToast('Статья удалена', 'success');
                        } catch (err: any) {
                          showToast(err?.message || 'Ошибка удаления', 'error');
                        }
                      }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}


