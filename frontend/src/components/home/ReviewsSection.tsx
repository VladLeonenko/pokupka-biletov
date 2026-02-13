import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Rating, Avatar, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPublicReviews, type Review } from '@/services/reviewsApi';

const SERVICE_LABELS: Record<string, string> = {
  'web-development': 'Разработка сайтов',
  'seo': 'SEO',
  'design': 'Дизайн',
  'support': 'Поддержка',
  'other': 'Другое',
};

/** Извлекает упоминания цифр/метрик из текста для акцента */
function extractMetrics(text: string): string[] {
  const matches = text.match(/(\+\d+%|\d+[,.]?\d*%|\d+\s*(?:заказов|звонков|посетителей|месяц|месяцев|раз)|ROI\s*\d+%?|ТОП[\s-]?\d+|за\s*\d+\s*(?:недель|месяц|месяцев))/gi) || [];
  return [...new Set(matches)].slice(0, 3);
}

export function ReviewsSection() {
  const { data } = useQuery({
    queryKey: ['home-reviews'],
    queryFn: () => getPublicReviews({ limit: 6, sort: 'recent' }),
    staleTime: 60000,
  });

  const reviews: Review[] = data?.reviews || [];

  if (!reviews.length) return null;

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(5rem, 14vw, 14rem)',
          fontWeight: 900,
          color: '#fff',
          opacity: 0.02,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.04em',
        }}
      >
        REVIEWS
      </Typography>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
        >
          Отзывы
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            mb: 5,
          }}
        >
          Что говорят клиенты
        </Typography>

        {/* Bento grid: разный размер и стиль карточек */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gridAutoRows: 'minmax(140px, auto)',
            gap: 2,
            mb: 5,
          }}
        >
          {reviews.map((r, i) => (
            <ReviewCard key={r.id} review={r} index={i} />
          ))}
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            component={Link}
            to="/reviews"
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              letterSpacing: '0.05em',
              '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
            }}
          >
            Все отзывы
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const metrics = extractMetrics(review.text);
  const sub = [review.author_position, review.author_company].filter(Boolean).join(', ');

  // Варианты раскладки по индексу (циклически)
  const variant = index % 5;
  const sizeMap: Record<number, { gridColumn?: string | object; gridRow?: string | object }> = {
    0: { gridColumn: { sm: 'span 2', md: 'span 2' }, gridRow: { sm: 'span 2', md: 'span 2' } },
    1: { gridRow: { sm: 'span 2', md: 'span 2' } },
    2: {},
    3: { gridColumn: { md: 'span 2' } },
    4: {},
  };
  const size = sizeMap[index % 5] || {};

  const clampLines = variant === 0 ? 6 : variant === 1 ? 4 : variant === 3 ? 3 : 3;

  return (
    <Box
      data-scroll-child
      sx={{
        ...size,
        p: variant === 0 ? 4 : 2.5,
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.06)',
        bgcolor: 'rgba(20,20,20,0.5)',
        display: 'flex',
        flexDirection: variant === 2 ? 'row' : 'column',
        gap: variant === 2 ? 2 : 1.5,
        alignItems: variant === 2 ? 'flex-start' : undefined,
        transition: 'all 0.3s',
        '&:hover': { borderColor: 'rgba(255,187,0,0.2)', bgcolor: 'rgba(255,187,0,0.02)' },
      }}
    >
      {/* Вариант: цитата первая (крупные карточки) */}
      {variant === 0 && (
        <>
          <Typography
            component="blockquote"
            sx={{
              flex: 1,
              fontSize: { xs: '1rem', md: '1.1rem' },
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.7,
              m: 0,
              fontStyle: 'italic',
              borderLeft: '3px solid #ffbb00',
              pl: 2,
              display: '-webkit-box',
              WebkitLineClamp: clampLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            «{review.text}»
          </Typography>
          {metrics.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
              {metrics.map((m) => (
                <Chip key={m} label={m} size="small" sx={{ bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', fontWeight: 600 }} />
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto', pt: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{ bgcolor: 'rgba(255,187,0,0.2)', color: '#ffbb00', width: 48, height: 48, fontWeight: 700 }}>
              {review.author.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600, color: '#fff' }}>{review.author}</Typography>
                {review.service_type && (
                  <Chip label={SERVICE_LABELS[review.service_type] || review.service_type} size="small" sx={{ bgcolor: 'rgba(255,187,0,0.1)', color: '#ffbb00', fontSize: '0.7rem' }} />
                )}
              </Box>
              {sub && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</Typography>}
            </Box>
            <Rating value={review.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#ffbb00' } }} />
          </Box>
        </>
      )}

      {/* Вариант: горизонтальный (аватар слева) */}
      {variant === 2 && (
        <>
          <Avatar sx={{ bgcolor: 'rgba(255,187,0,0.2)', color: '#ffbb00', width: 56, height: 56, flexShrink: 0, fontWeight: 700 }}>
            {review.author.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, color: '#fff' }}>{review.author}</Typography>
              {review.service_type && (
                <Chip label={SERVICE_LABELS[review.service_type] || review.service_type} size="small" sx={{ bgcolor: 'rgba(255,187,0,0.1)', color: '#ffbb00', fontSize: '0.7rem' }} />
              )}
            </Box>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {review.text}
            </Typography>
          </Box>
        </>
      )}

      {/* Вариант: акцент на метриках */}
      {variant === 3 && (
        <>
          {metrics.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {metrics.map((m) => (
                <Chip key={m} label={m} size="small" sx={{ bgcolor: 'rgba(255,187,0,0.2)', color: '#ffbb00', fontWeight: 700 }} />
              ))}
            </Box>
          )}
          <Typography
            sx={{
              flex: 1,
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.95rem',
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitLineClamp: clampLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {review.text}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
            <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{review.author}</Typography>
            <Rating value={review.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#ffbb00' } }} />
          </Box>
        </>
      )}

      {/* Стандартный / компактный */}
      {(variant === 1 || variant === 4) && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0, flex: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,187,0,0.2)', color: '#ffbb00', width: 40, height: 40, fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>
                {review.author.charAt(0)}
              </Avatar>
              <Box minWidth={0}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{review.author}</Typography>
                  {review.service_type && (
                    <Chip label={SERVICE_LABELS[review.service_type] || review.service_type} size="small" sx={{ bgcolor: 'rgba(255,187,0,0.1)', color: '#ffbb00', fontSize: '0.65rem', height: 20 }} />
                  )}
                </Box>
                {sub && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>{sub}</Typography>}
              </Box>
            </Box>
            <Rating value={review.rating} readOnly size="small" sx={{ flexShrink: 0, '& .MuiRating-iconFilled': { color: '#ffbb00' } }} />
          </Box>
          <Typography
            sx={{
              flex: 1,
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: variant === 1 ? 4 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {review.text}
          </Typography>
        </>
      )}
    </Box>
  );
}
