import { Box, Typography } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketsUserPageLayout, ticketsUser } from '@/components/tickets/TicketsUserPageLayout';
import { useTicketFavorites } from '@/hooks/useTicketFavorites';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import type { SyntheticEvent } from 'react';

export function WishlistPage() {
  const { items, removeFavorite } = useTicketFavorites();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (items.length === 0) {
    return (
      <>
        <SeoMetaTags
          title="Избранное"
          description="Сохраняйте события без входа — список хранится в браузере"
          url={currentUrl}
          noindex
        />
        <TicketsUserPageLayout
          overline="Подборки"
          title="Избранное пусто"
          subtitle="Нажмите сердечко на карточке события — список сохранится в этом браузере без регистрации."
        >
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto', py: 3 }}>
            <FavoriteBorderIcon sx={{ fontSize: 56, color: 'rgba(0,0,0,0.12)', mb: 2 }} />
            <Typography className={ticketsUser.muted} sx={{ mb: 2.5 }}>
              Удобно сравнивать даты и площадки перед покупкой.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              <Link className={ticketsUser.btnPrimary} to="/events">
                Мероприятия
              </Link>
              <Link className={ticketsUser.btnGhost} to="/">
                Афиша
              </Link>
            </Box>
          </Box>
        </TicketsUserPageLayout>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags title="Избранное" description="Сохранённые события" url={currentUrl} noindex />
      <TicketsUserPageLayout
        overline="Подборки"
        title="Избранное"
        subtitle="Список хранится локально в браузере. Откройте карточку, чтобы выбрать места."
      >
        {items.map((item) => (
          <Box
            key={item.id}
            className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 2,
            }}
          >
            <Box
              component="img"
              src={resolveImageUrl(item.imageUrl || undefined)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              sx={{ width: 88, height: 118, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
              onError={(e: SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).src = fallbackImageUrl();
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '1rem', mb: 0.5 }}>
                {item.title}
              </Typography>
              {item.venue ? (
                <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.45)', mb: 1.25 }}>
                  {item.venue}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Link className={ticketsUser.btnPrimary} to={item.href}>
                  К билетам
                </Link>
                <button
                  type="button"
                  className={ticketsUser.btnGhost}
                  onClick={() => removeFavorite(item.id)}
                  aria-label="Удалить из избранного"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18, verticalAlign: 'middle' }} />
                </button>
              </Box>
            </Box>
          </Box>
        ))}
      </TicketsUserPageLayout>
    </>
  );
}
