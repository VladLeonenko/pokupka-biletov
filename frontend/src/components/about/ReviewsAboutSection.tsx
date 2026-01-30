import { useQuery } from '@tanstack/react-query';
import { getPublicReviews } from '@/services/reviewsApi';
import { Box, CircularProgress, Typography, Rating, Card, CardContent, Avatar, Chip } from '@mui/material';
import { VerifiedUser as VerifiedIcon } from '@mui/icons-material';
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

/**
 * Секция "Отзывы" на странице /about
 * Использует тот же API и компоненты, что и страница /reviews
 */
export function ReviewsAboutSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'about'],
    queryFn: () => getPublicReviews({
      limit: 4, // Показываем только 4 отзыва на странице about
      sort: 'recent',
    }),
  });

  const reviews = data?.reviews || [];

  if (isLoading) {
    return (
      <section className="reviews">
        <div className="header-section pb-50">
          <div className="container">
            <h2>ОТЗЫВЫ</h2>
          </div>
        </div>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#ffbb00' }} />
        </Box>
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section className="reviews">
        <div className="header-section pb-50">
          <div className="container">
            <h2>ОТЗЫВЫ</h2>
          </div>
        </div>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Отзывов пока нет
          </Typography>
        </Box>
      </section>
    );
  }

  return (
    <section className="reviews">
      <div className="header-section pb-50">
        <div className="container">
          <h2>ОТЗЫВЫ</h2>
        </div>
      </div>
      <div className="container">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {reviews.map((review) => (
            <Card
              key={review.id}
              sx={{
                bgcolor: 'rgba(255,255,255,0.02)',
                backgroundImage: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'rgba(255,187,0,0.3)',
                  boxShadow: '0 8px 32px rgba(255,187,0,0.1)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                        {review.author}
                      </Typography>
                      {review.is_verified && (
                        <VerifiedIcon sx={{ fontSize: 20, color: '#4caf50' }} />
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {format(new Date(review.created_at), 'd MMMM yyyy', { locale: ru })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {review.text}
                </Typography>

                {review.photo_url && (
                  <Box
                    component="img"
                    src={review.photo_url}
                    alt="Фото к отзыву"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 300,
                      borderRadius: 2,
                      mt: 2,
                      objectFit: 'cover',
                    }}
                  />
                )}

                {review.response_text && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'rgba(255,187,0,0.05)',
                      borderLeft: '4px solid #ffbb00',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: '#ffbb00', fontWeight: 600, mb: 1 }}>
                      Ответ от {review.response_author}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      {review.response_text}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </div>
    </section>
  );
}
