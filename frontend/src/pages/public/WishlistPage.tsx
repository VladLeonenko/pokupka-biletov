import { SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, removeFromWishlist } from '@/services/ecommerceApi';
import { Box, Typography, IconButton, CircularProgress, Button, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

const cardSx = {
  p: 0, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)',
  bgcolor: 'rgba(20,20,20,0.6)', overflow: 'hidden', cursor: 'pointer',
  transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
  '&:hover': { borderColor: 'rgba(255,187,0,0.25)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', transform: 'translateY(-4px)' },
};

export function WishlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['wishlist'], queryFn: getWishlist, enabled: !!user });

  const removeMutation = useMutation({
    mutationFn: (productSlug: string) => removeFromWishlist(productSlug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!user) {
    return (
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', mb: 2 }}>Войдите, чтобы просмотреть избранное</Typography>
          <Button onClick={() => navigate('/admin/login')} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
            Войти
          </Button>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Избранное" title="Список желаний" decoText="WISHLIST" />
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FavoriteIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.15)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', mb: 3 }}>Вы ещё не добавили ничего в избранное</Typography>
            <Button onClick={() => navigate('/catalog')} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
              Перейти в каталог
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <SeoMetaTags title="Избранное — Primecoder" description="Ваш список избранных товаров" url={currentUrl} noindex />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Избранное" title="Список желаний" decoText="WISHLIST" />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 3 }} data-anim="stagger">
            {items.map((item) => (
              <Box key={item.id} sx={cardSx} data-anim-child onClick={() => navigate(`/products/${item.productSlug}`)}>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={resolveImageUrl(item.product?.imageUrl)}
                    alt={item.product?.title || 'Товар'}
                    loading="lazy"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                    sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <IconButton
                    onClick={(e) => { e.stopPropagation(); removeMutation.mutate(item.productSlug); }}
                    sx={{
                      position: 'absolute', top: 8, right: 8,
                      bgcolor: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)',
                      '&:hover': { bgcolor: 'rgba(220,50,50,0.7)', color: '#fff' },
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem', mb: 0.75, lineHeight: 1.3 }}>{item.product?.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55 }}>
                    {item.product?.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100)}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#ffbb00', fontSize: '1.05rem' }}>
                    {item.product?.priceCents ? `${Math.round(item.product.priceCents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
    </>
  );
}
