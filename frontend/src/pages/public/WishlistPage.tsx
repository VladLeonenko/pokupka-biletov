import { SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, removeFromWishlist } from '@/services/ecommerceApi';
import { Box, Typography, Grid, Card, CardContent, CardMedia, IconButton, CircularProgress, Button, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

export function WishlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: (productSlug: string) => removeFromWishlist(productSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Товар удален из избранного');
      }
    },
    onError: () => {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при удалении товара из избранного');
      }
    },
  });

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Войдите, чтобы просмотреть избранное</Typography>
          <Button variant="contained" onClick={() => navigate('/admin/login')}>
            Войти
          </Button>
        </Box>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <FavoriteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>Избранное пусто</Typography>
          <Button variant="contained" onClick={() => navigate('/catalog')}>
            Перейти в каталог
          </Button>
        </Box>
      </Container>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Избранное - Primecoder"
        description="Ваш список избранных товаров"
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Избранное</Typography>

      <Grid container spacing={3}>
        {items.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
              onClick={() => navigate(`/products/${item.productSlug}`)}
            >
              <CardMedia
                component="img"
                height="200"
                image={resolveImageUrl(item.product?.imageUrl)}
                alt={item.product?.title || 'Товар'}
                loading="lazy"
                sx={{ backgroundColor: 'grey.200' }}
                onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = fallbackImageUrl();
                }}
              />
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>{item.product?.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {item.product?.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </Typography>
                <Typography variant="h6" color="primary">
                  {item.product?.priceCents ? `${(item.product.priceCents / 100).toFixed(2)} ${item.product.currency}` : 'Цена по запросу'}
                </Typography>
              </CardContent>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'background.paper' }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeMutation.mutate(item.productSlug);
                }}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
    </>
  );
}

