import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Paper, Rating, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { getApiBase } from '@/utils/apiBase';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  source: string;
  date: string;
  brand: string;
}

interface Mention {
  id: string;
  text: string;
  source: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export function ReputationMonitorPage() {
  const [brandName, setBrandName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [newReview, setNewReview] = useState({ author: '', rating: 5, text: '', source: '' });
  const [brandStats, setBrandStats] = useState<{
    totalReviews: number;
    avgRating: number;
    positiveReviews: number;
    negativeReviews: number;
  } | null>(null);

  const searchMentions = async () => {
    if (!brandName.trim()) {
      setError('Введите название бренда');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/public/seo/search-mentions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brandName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.mentions && Array.isArray(data.mentions)) {
          setMentions(data.mentions);
        } else {
          setMentions([]);
          setError('Неверный формат ответа от сервера');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
        setError(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
        setMentions([]);
      }
    } catch (err) {
      setError('Ошибка при поиске упоминаний. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    if (!brandName.trim()) {
      setError('Введите название бренда');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase();
      
      // Загружаем отзывы
      const reviewsResponse = await fetch(`${apiBase}/api/public/seo/reviews?brand=${encodeURIComponent(brandName.trim())}`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
      } else {
        setReviews([]);
      }
      
      // Загружаем статистику
      const statsResponse = await fetch(`${apiBase}/api/public/seo/brand-stats?brand=${encodeURIComponent(brandName.trim())}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setBrandStats(statsData);
      } else {
        setBrandStats(null);
      }
    } catch (err) {
      setError('Ошибка при загрузке данных.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!newReview.text.trim() || !newReview.author.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (!brandName.trim()) {
      setError('Введите название бренда');
      return;
    }

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/public/seo/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReview,
          brand: brandName.trim()
        })
      });

      if (response.ok) {
        setAddReviewOpen(false);
        setNewReview({ author: '', rating: 5, text: '', source: '' });
        setError(null);
        // Обновляем отзывы и статистику
        await loadReviews();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
        setError(errorData.error || 'Ошибка при добавлении отзыва');
      }
    } catch (err) {
      setError('Ошибка при добавлении отзыва: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'default';
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Мониторинг отзывов и репутации бренда в сети"
        description="Отслеживайте отзывы и упоминания компании. Агрегация из отзовиков, соцсетей, форумов. Управляйте репутацией онлайн."
        keywords="мониторинг отзывов, репутация в интернете, отзывы о компании, отслеживание бренда"
        url={currentUrl}
      />
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', pt: { xs: 6.25, md: 6.25 } }}>
        <Typography variant="overline" sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>Репутация</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>Мониторинг репутации</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Управление отзывами и отслеживание упоминаний бренда
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Название бренда или компании"
                  placeholder="Название компании"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SearchIcon />}
                  onClick={() => {
                    searchMentions();
                    loadReviews();
                  }}
                  disabled={loading}
                  fullWidth
                  sx={{ height: '100%' }}
                >
                  {loading ? 'Поиск...' : 'Найти упоминания'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Статистика бренда */}
        {brandStats && brandStats.totalReviews > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Статистика по бренду "{brandName}"</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{brandStats.totalReviews}</Typography>
                    <Typography variant="body2">Всего отзывов</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4">{brandStats.avgRating.toFixed(1)}</Typography>
                    <Typography variant="body2">Средний рейтинг</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h4">{brandStats.positiveReviews}</Typography>
                    <Typography variant="body2">Положительных</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4">{brandStats.negativeReviews}</Typography>
                    <Typography variant="body2">Отрицательных</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {/* Отзывы */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Отзывы {brandStats && `(${brandStats.totalReviews})`}</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddReviewOpen(true)}
                  >
                    Добавить
                  </Button>
                </Box>
                {reviews.length === 0 ? (
                  <Typography color="text.secondary">Отзывов пока нет</Typography>
                ) : (
                  <Box>
                    {reviews.map((review) => (
                      <Paper key={review.id} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">{review.author}</Typography>
                          <Rating value={review.rating} readOnly size="small" />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>{review.text}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip label={review.source} size="small" />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(review.date).toLocaleDateString('ru-RU')}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Упоминания */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Упоминания бренда</Typography>
                {mentions.length === 0 ? (
                  <Typography color="text.secondary">Упоминаний не найдено</Typography>
                ) : (
                  <Box>
                    {mentions.map((mention) => (
                      <Paper key={mention.id} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip
                            label={mention.sentiment === 'positive' ? 'Положительное' : mention.sentiment === 'negative' ? 'Отрицательное' : 'Нейтральное'}
                            color={getSentimentColor(mention.sentiment) as any}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(mention.date).toLocaleDateString('ru-RU')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>{mention.text}</Typography>
                        <Chip label={mention.source} size="small" variant="outlined" />
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Диалог добавления отзыва */}
        <Dialog open={addReviewOpen} onClose={() => setAddReviewOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Добавить отзыв</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Автор"
                  value={newReview.author}
                  onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography>Оценка:</Typography>
                  <Rating
                    value={newReview.rating}
                    onChange={(_, value) => setNewReview({ ...newReview, rating: value || 5 })}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Текст отзыва"
                  value={newReview.text}
                  onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Источник"
                  placeholder="Например: Яндекс.Карты, Google, сайт"
                  value={newReview.source}
                  onChange={(e) => setNewReview({ ...newReview, source: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddReviewOpen(false)}>Отмена</Button>
            <Button variant="contained" onClick={handleAddReview}>Добавить</Button>
          </DialogActions>
        </Dialog>
      </Box>
      <style>{`
        /* Стили для меню - скрыто по умолчанию */
        .menu {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          opacity: 0 !important;
          visibility: hidden !important;
          z-index: 50 !important;
          pointer-events: none !important;
          transition: opacity 0.3s ease, visibility 0.3s ease !important;
        }

        #burger-toggle:checked ~ .menu {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          z-index: 52 !important;
        }

        body {
          position: relative !important;
        }
      `}</style>
    </>
  );
}

