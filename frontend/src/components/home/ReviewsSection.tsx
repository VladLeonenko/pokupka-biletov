import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Rating, Avatar, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getApiBase } from '@/utils/apiBase';

interface Review {
  id: number;
  author: string;
  author_position?: string;
  author_company?: string;
  rating: number;
  text: string;
}

export function ReviewsSection() {
  const { data } = useQuery({
    queryKey: ['home-reviews'],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/reviews/public?limit=6&sort=recent`);
      if (!res.ok) return { reviews: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const reviews: Review[] = data?.reviews || [];

  if (!reviews.length) return null;

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative */}
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 5,
          }}
        >
          {reviews.map((r) => (
            <Box
              key={r.id}
              data-scroll-child
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(20,20,20,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', width: 40, height: 40, fontSize: '1rem', fontWeight: 700 }}>
                  {r.author.charAt(0)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {r.author}
                  </Typography>
                  {(r.author_position || r.author_company) && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {r.author_position}{r.author_company ? `, ${r.author_company}` : ''}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Rating value={r.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#ffbb00' } }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {r.text}
              </Typography>
            </Box>
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
