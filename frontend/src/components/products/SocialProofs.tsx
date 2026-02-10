import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, Card, CardContent, Avatar, Rating } from '@mui/material';
import { TrendingUp, People, Star } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getApiBase } from '@/utils/apiBase';

const MotionCard = motion.create(Card);

interface SocialProof {
  id: number;
  type: 'review' | 'case' | 'metric' | 'testimonial';
  title: string;
  description?: string;
  imageUrl?: string;
  value?: string;
  label?: string;
  authorName?: string;
  authorPosition?: string;
  authorCompany?: string;
  rating?: number;
  linkUrl?: string;
}

async function fetchSocialProofs(): Promise<SocialProof[]> {
  const base = getApiBase();
  const response = await fetch(`${base}/api/social-proofs/public`);
  if (!response.ok) throw new Error('Failed to fetch social proofs');
  return response.json();
}

export function SocialProofs() {
  const { data: proofs, isLoading } = useQuery({
    queryKey: ['social-proofs'],
    queryFn: fetchSocialProofs,
  });

  if (isLoading || !proofs || proofs.length === 0) return null;

  const metrics = proofs.filter((p) => p.type === 'metric');
  const reviews = proofs.filter((p) => p.type === 'review' || p.type === 'testimonial');

  return (
    <Box sx={{ my: 6 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
        Результаты наших клиентов
      </Typography>

      {metrics.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={metric.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <TrendingUp sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  {metric.value}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {metric.label}
                </Typography>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}

      {reviews.length > 0 && (
        <Grid container spacing={3}>
          {reviews.map((review, index) => (
            <Grid item xs={12} md={6} key={review.id}>
              <MotionCard
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                sx={{ p: 3, height: '100%' }}
              >
                {review.rating && (
                  <Rating value={review.rating} readOnly sx={{ mb: 2 }} />
                )}
                <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
                  "{review.description}"
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {review.imageUrl && (
                    <Avatar src={review.imageUrl} alt={review.authorName} />
                  )}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {review.authorName}
                    </Typography>
                    {review.authorPosition && (
                      <Typography variant="caption" color="text.secondary">
                        {review.authorPosition}
                        {review.authorCompany && `, ${review.authorCompany}`}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
