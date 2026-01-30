import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCases, deleteCase, setCasePublished } from '@/services/cmsApi';
import { Box, Button, Card, CardActionArea, CardContent, CardMedia, Grid, Typography, Chip, Select, MenuItem, FormControl, InputLabel, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, List, ListItem, ListItemButton, ListItemText, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import ArticleIcon from '@mui/icons-material/Article';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import DeleteIcon from '@mui/icons-material/Delete';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

export function CasesListPage() {
  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: listCases });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('cases.viewMode') as 'list' | 'grid') || 'grid');
  
  const templates = useMemo(() => {
    return cases.filter(c => c.isTemplate);
  }, [cases]);
  
  const regularCases = useMemo(() => {
    return cases.filter(c => !c.isTemplate);
  }, [cases]);
  
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
      {templates.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Шаблоны</Typography>
          <Grid container spacing={2}>
            {templates.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.slug}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => navigate(`/admin/cases/${encodeURIComponent(c.slug)}`)}>
                    <CardMedia 
                      component={SafeImage}
                      height="140" 
                      image={(() => {
                        // Приоритет: heroImageUrl -> donorImageUrl -> cover.png -> fallback
                        const heroUrl = c.heroImageUrl?.trim();
                        const donorUrl = c.donorImageUrl?.trim();
                        const slug = c.slug?.trim();
                        
                        // 1. Используем heroImageUrl если есть
                        if (heroUrl && heroUrl.length > 0) {
                          return heroUrl;
                        }
                        
                        // 2. Используем donorImageUrl если есть
                        if (donorUrl && donorUrl.length > 0) {
                          return donorUrl;
                        }
                        
                        // 3. Пробуем cover.png для этого кейса
                        // Если файл не существует, SafeImage обработает ошибку и использует fallback
                        if (slug && slug.length > 0) {
                          return `/legacy/img/cases/${slug}/cover.png`;
                        }
                        
                        // 4. Fallback только в последнюю очередь
                        return fallbackImageUrl();
                      })()}
                      fallback={fallbackImageUrl()}
                      alt={c.title || 'Кейс'}
                      sx={{ 
                        objectFit: 'cover',
                        position: 'relative',
                        '& img': {
                          position: 'relative',
                          zIndex: 1,
                        }
                      }}
                      hideOnError={false}
                      lazy={true}
                    />
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
                    <CardMedia 
                      component={SafeImage}
                      height="140" 
                      image={(() => {
                        // Приоритет: heroImageUrl -> donorImageUrl -> cover.png -> fallback
                        const heroUrl = c.heroImageUrl?.trim();
                        const donorUrl = c.donorImageUrl?.trim();
                        const slug = c.slug?.trim();
                        
                        // 1. Используем heroImageUrl если есть
                        if (heroUrl && heroUrl.length > 0) {
                          return heroUrl;
                        }
                        
                        // 2. Используем donorImageUrl если есть
                        if (donorUrl && donorUrl.length > 0) {
                          return donorUrl;
                        }
                        
                        // 3. Пробуем cover.png для этого кейса
                        // Если файл не существует, SafeImage обработает ошибку и использует fallback
                        if (slug && slug.length > 0) {
                          return `/legacy/img/cases/${slug}/cover.png`;
                        }
                        
                        // 4. Fallback только в последнюю очередь
                        return fallbackImageUrl();
                      })()}
                      fallback={fallbackImageUrl()}
                      alt={c.title || 'Кейс'}
                      sx={{ 
                        objectFit: 'cover',
                        position: 'relative',
                        '& img': {
                          position: 'relative',
                          zIndex: 1,
                        }
                      }}
                      hideOnError={false}
                      lazy={true}
                    />
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


