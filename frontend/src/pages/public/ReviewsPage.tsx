import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Button,
  Rating,
  LinearProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  Tooltip,
  Fade,
  Slide,
  CircularProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbUp as ThumbUpIcon,
  VerifiedUser as VerifiedIcon,
  Reply as ReplyIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { getPublicReviews, createReview, markReviewHelpful, type Review, type CreateReviewData } from '@/services/reviewsApi';
import { ReviewForm } from './ReviewForm';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const serviceTypes = [
  { value: 'all', label: 'Все услуги' },
  { value: 'web-development', label: 'Разработка сайтов' },
  { value: 'mobile-development', label: 'Мобильные приложения' },
  { value: 'design', label: 'Дизайн' },
  { value: 'seo', label: 'SEO продвижение' },
  { value: 'support', label: 'Поддержка' },
  { value: 'other', label: 'Другое' },
];

const sortOptions = [
  { value: 'recent', label: 'Сначала новые', icon: <ScheduleIcon /> },
  { value: 'rating_desc', label: 'Высокий рейтинг', icon: <StarIcon /> },
  { value: 'helpful', label: 'Полезные', icon: <TrendingUpIcon /> },
];

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating_desc' | 'rating_asc' | 'helpful'>('recent');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Загружаем отзывы
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', ratingFilter, serviceFilter, sortBy],
    queryFn: () => getPublicReviews({
      rating: ratingFilter || undefined,
      service_type: serviceFilter,
      sort: sortBy,
      limit: 50,
    }),
  });

  const reviews = data?.reviews || [];
  const stats = data?.stats;

  // Mutation для лайков
  const helpfulMutation = useMutation({
    mutationFn: (reviewId: number) => markReviewHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const handleHelpful = (reviewId: number) => {
    helpfulMutation.mutate(reviewId);
  };

  // Рассчитываем процентное распределение рейтингов
  const ratingDistribution = useMemo(() => {
    if (!stats) return [];
    const total = stats.total || 1;
    return [
      { rating: 5, count: stats.five_star, percent: (stats.five_star / total) * 100 },
      { rating: 4, count: stats.four_star, percent: (stats.four_star / total) * 100 },
      { rating: 3, count: stats.three_star, percent: (stats.three_star / total) * 100 },
      { rating: 2, count: stats.two_star, percent: (stats.two_star / total) * 100 },
      { rating: 1, count: stats.one_star, percent: (stats.one_star / total) * 100 },
    ];
  }, [stats]);

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          color: '#fff',
          pt: { xs: '120px', md: '140px' },
          pb: { xs: '60px', md: '80px' },
        }}
      >
        <Container maxWidth="lg">
          {/* Hero Section */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 700,
                  mb: 2,
                  background: 'linear-gradient(135deg, #ffbb00 0%, #ff9500 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Отзывы наших клиентов
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
                Честные мнения о работе с PrimeCoder
              </Typography>

              {/* Статистика */}
              {stats && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 4,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      p: 3,
                      bgcolor: 'rgba(255,187,0,0.05)',
                      borderRadius: 3,
                      border: '1px solid rgba(255,187,0,0.1)',
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h2" sx={{ color: '#ffbb00', fontWeight: 700 }}>
                        {Number(stats.avg_rating).toFixed(1)}
                      </Typography>
                      <Rating value={Number(stats.avg_rating)} readOnly precision={0.1} size="large" />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
                        Средний рейтинг
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h2" sx={{ color: '#ffbb00', fontWeight: 700 }}>
                        {stats.total}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
                        Отзывов
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* Распределение рейтингов */}
          {stats && (
            <Box
              component={motion.div}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Box sx={{ mb: 6 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Распределение оценок
                </Typography>
                {ratingDistribution.map((item, index) => (
                  <Box
                    key={item.rating}
                    component={motion.div}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1.5,
                        cursor: 'pointer',
                        '&:hover': {
                          '& .MuiLinearProgress-root': {
                            transform: 'scaleX(1.02)',
                          },
                        },
                      }}
                      onClick={() => setRatingFilter(ratingFilter === item.rating ? null : item.rating)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 100 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {item.rating}
                        </Typography>
                        {[...Array(item.rating)].map((_, i) => (
                          <StarIcon key={i} sx={{ fontSize: 16, color: '#ffbb00' }} />
                        ))}
                        {[...Array(5 - item.rating)].map((_, i) => (
                          <StarBorderIcon key={i} sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }} />
                        ))}
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.percent}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          transition: 'transform 0.3s',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#ffbb00',
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                        {item.count}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Фильтры и кнопка добавления отзыва */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 4,
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Услуга</InputLabel>
                  <Select
                    value={serviceFilter}
                    label="Услуга"
                    onChange={(e) => setServiceFilter(e.target.value)}
                    sx={{
                      color: '#fff',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
                    }}
                  >
                    {serviceTypes.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Сортировка</InputLabel>
                  <Select
                    value={sortBy}
                    label="Сортировка"
                    onChange={(e) => setSortBy(e.target.value as any)}
                    sx={{
                      color: '#fff',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
                    }}
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {option.icon}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {ratingFilter && (
                  <Chip
                    label={`Рейтинг: ${ratingFilter} ★`}
                    onDelete={() => setRatingFilter(null)}
                    sx={{
                      bgcolor: 'rgba(255,187,0,0.15)',
                      color: '#ffbb00',
                      borderColor: '#ffbb00',
                      '& .MuiChip-deleteIcon': { color: '#ffbb00' },
                    }}
                  />
                )}
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsFormOpen(true)}
                sx={{
                  bgcolor: '#ffbb00',
                  color: '#000',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#e6a800',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(255,187,0,0.4)',
                  },
                  transition: 'all 0.3s',
                }}
              >
                Оставить отзыв
              </Button>
            </Box>
          </Box>

          {/* Список отзывов */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#ffbb00' }} />
            </Box>
          ) : reviews.length === 0 ? (
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                  Отзывов пока нет
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                  Станьте первым, кто оставит отзыв!
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              {reviews.map((review, index) => (
                <Box
                  key={review.id}
                  component={motion.div}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.4 }}
                >
                  <ReviewCard review={review} onHelpful={handleHelpful} />
                </Box>
              ))}
            </Box>
          )}
        </Container>
      </Box>

      {/* Форма добавления отзыва */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            backgroundImage: 'none',
            color: '#fff',
          },
        }}
      >
        <ReviewForm onClose={() => setIsFormOpen(false)}         />
      </Dialog>
    </>
  );
}

// Карточка отзыва
function ReviewCard({ review, onHelpful }: { review: Review; onHelpful: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = review.text.length > 300;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          mb: 3,
          bgcolor: 'rgba(255,255,255,0.02)',
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'rgba(255,187,0,0.3)',
            boxShadow: '0 8px 32px rgba(255,187,0,0.1)',
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Заголовок отзыва */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#ffbb00',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                }}
              >
                {review.author[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {review.author}
                  </Typography>
                  {review.is_verified && (
                    <Tooltip title="Проверенный клиент">
                      <VerifiedIcon sx={{ fontSize: 20, color: '#4caf50' }} />
                    </Tooltip>
                  )}
                  {review.service_type && (
                    <Chip
                      label={serviceTypes.find((s) => s.value === review.service_type)?.label || review.service_type}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,187,0,0.1)',
                        color: '#ffbb00',
                        fontSize: '0.75rem',
                        height: 24,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Rating value={review.rating} readOnly size="small" />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {format(new Date(review.created_at), 'd MMMM yyyy', { locale: ru })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Текст отзыва */}
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              mb: 2,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {isLongText && !expanded ? `${review.text.substring(0, 300)}...` : review.text}
          </Typography>

          {isLongText && (
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: '#ffbb00', mb: 2 }}
            >
              {expanded ? 'Свернуть' : 'Читать полностью'}
            </Button>
          )}

          {/* Фото */}
          {review.photo_url && (
            <Box
              component="img"
              src={review.photo_url}
              alt="Фото к отзыву"
              sx={{
                maxWidth: '100%',
                maxHeight: 300,
                borderRadius: 2,
                mb: 2,
                objectFit: 'cover',
              }}
            />
          )}

          {/* Ответ компании */}
          {review.response_text && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'rgba(255,187,0,0.05)',
                  borderLeft: '4px solid #ffbb00',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ReplyIcon sx={{ fontSize: 18, color: '#ffbb00' }} />
                  <Typography variant="subtitle2" sx={{ color: '#ffbb00', fontWeight: 600 }}>
                    Ответ от {review.response_author}
                  </Typography>
                  {review.response_date && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {format(new Date(review.response_date), 'd MMMM yyyy', { locale: ru })}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  {review.response_text}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Действия */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Tooltip title="Отметить как полезный">
              <IconButton
                size="small"
                onClick={() => onHelpful(review.id)}
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  '&:hover': {
                    color: '#ffbb00',
                    bgcolor: 'rgba(255,187,0,0.1)',
                  },
                }}
              >
                <ThumbUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {review.helpful_count > 0 && `${review.helpful_count} ${review.helpful_count === 1 ? 'человек' : 'людей'} нашли это полезным`}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

