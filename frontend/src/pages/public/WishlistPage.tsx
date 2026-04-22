import { SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, removeFromWishlist } from '@/services/ecommerceApi';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketsUserPageLayout, ticketsUser } from '@/components/tickets/TicketsUserPageLayout';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

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
      <>
        <SeoMetaTags title="Избранное" description="Войдите, чтобы сохранять интересные события и товары" url={currentUrl} noindex />
        <TicketsUserPageLayout overline="Подборки" title="Избранное" subtitle="Авторизуйтесь, чтобы список синхронизировался между устройствами.">
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
            <Typography className={ticketsUser.muted} sx={{ mb: 2 }}>
              Сохраняйте мероприятия и билетные предложения — вернитесь к ним перед покупкой.
            </Typography>
            <button type="button" className={ticketsUser.btnPrimary} onClick={() => navigate('/admin/login')}>
              Войти
            </button>
          </Box>
        </TicketsUserPageLayout>
      </>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, background: '#fafafa' }}>
        <CircularProgress sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
      </Box>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <>
        <SeoMetaTags title="Избранное" description="Сохранённые позиции" url={currentUrl} noindex />
        <TicketsUserPageLayout
          overline="Подборки"
          title="Список пуст"
          subtitle="Добавляйте события в избранное из карточки — удобно сравнивать даты и цены перед покупкой."
        >
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto', py: 3 }}>
            <FavoriteBorderIcon sx={{ fontSize: 56, color: 'rgba(0,0,0,0.12)', mb: 2 }} />
            <Typography className={ticketsUser.muted} sx={{ mb: 2.5 }}>
              Откройте афишу или каталог и нажмите «в избранное» у понравившегося мероприятия.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              <Link className={ticketsUser.btnPrimary} to="/events">
                Мероприятия
              </Link>
              <Link className={ticketsUser.btnGhost} to="/catalog">
                Каталог
              </Link>
            </Box>
          </Box>
        </TicketsUserPageLayout>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags title="Избранное" description="Сохранённые товары и события" url={currentUrl} noindex />
      <TicketsUserPageLayout
        overline="Подборки"
        title="Избранное"
        subtitle="Переходите к карточке товара или события, чтобы оформить заказ или билеты."
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {items.map((item) => (
            <Box
              key={item.id}
              className={ticketsUser.card}
              sx={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                '&:hover': { boxShadow: '0 12px 36px rgba(0,0,0,0.08)', borderColor: 'rgba(255,78,24,0.35)' },
              }}
              onClick={() => navigate(`/products/${item.productSlug}`)}
            >
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={resolveImageUrl(item.product?.imageUrl)}
                  alt={item.product?.title || ''}
                  loading="lazy"
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).src = fallbackImageUrl();
                  }}
                  sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', bgcolor: '#f0f0f0' }}
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(item.productSlug);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(255,255,255,0.92)',
                    color: 'rgba(0,0,0,0.45)',
                    '&:hover': { bgcolor: '#fff', color: '#c62828' },
                  }}
                  size="small"
                  aria-label="Удалить из избранного"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '0.95rem', mb: 0.75, lineHeight: 1.3 }}>{item.product?.title}</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(0,0,0,0.5)',
                    mb: 1.5,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                    fontSize: '0.84rem',
                  }}
                >
                  {item.product?.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 120)}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: 'var(--neg-orange, #ff4e18)', fontSize: '1rem', mt: 'auto' }}>
                  {item.product?.priceCents ? `${Math.round(item.product.priceCents / 100).toLocaleString('ru-RU')} ₽` : 'Цена по запросу'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </TicketsUserPageLayout>
    </>
  );
}
