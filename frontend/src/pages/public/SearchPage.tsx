import { useState, useEffect, SyntheticEvent, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/services/ecommerceApi';
import { Box, Typography, TextField, Button, CircularProgress, Chip, Container } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

const cardSx = {
  p: 0, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)',
  bgcolor: 'rgba(20,20,20,0.6)', overflow: 'hidden', cursor: 'pointer',
  transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
  '&:hover': { borderColor: 'rgba(255,187,0,0.25)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', transform: 'translateY(-4px)' },
};

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#ffbb00' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
};

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      const t = q.trim();
      setQuery(t);
      setSearchTerm(t);
    }
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['searchProducts', searchTerm],
    queryFn: () => searchProducts({ searchQuery: searchTerm, limit: 20 }),
    enabled: searchTerm.length > 0,
  });

  const handleSearch = () => {
    const t = query.trim();
    if (!t) return;
    setSearchTerm(t);
    navigate(`/search?q=${encodeURIComponent(t)}`, { replace: true });
  };
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

  const products = data?.products || [];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags title={searchTerm ? `Поиск: ${searchTerm} — PrimeCoder` : 'Умный поиск — PrimeCoder'} description="Поиск товаров и услуг" url={currentUrl} noindex />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Поиск" title="Умный поиск" description="Найдите нужную услугу или решение." decoText="SEARCH" />

          {/* Search field */}
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }} data-anim="fade-up">
            <TextField
              fullWidth
              placeholder="Введите запрос для поиска..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={inputSx}
            />
            <Button
              onClick={handleSearch}
              sx={{
                bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4,
                borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#e5a800', color: '#141414' },
              }}
              startIcon={<SearchIcon />}
            >
              Найти
            </Button>
          </Box>

          {searchTerm && (
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', mb: 3, fontSize: '0.9rem' }}>
              Найдено: {data?.total || 0}
            </Typography>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>
          ) : products.length === 0 && searchTerm ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>Ничего не найдено по запросу «{searchTerm}»</Typography>
            </Box>
          ) : products.length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 3 }} data-anim="stagger">
              {products.map((product) => (
                <Box key={product.slug} sx={cardSx} data-anim-child onClick={() => navigate(`/products/${product.slug}`)}>
                  <Box
                    component="img"
                    src={resolveImageUrl(product.imageUrl)}
                    alt={product.title}
                    loading="lazy"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                    sx={{ width: '100%', height: 220, objectFit: 'contain', display: 'block', bgcolor: 'rgba(0,0,0,0.15)' }}
                  />
                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem', mb: 0.75, lineHeight: 1.3 }}>{product.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55 }}>
                      {product.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100)}
                    </Typography>
                    {product.tags && product.tags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {product.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }} />
                        ))}
                      </Box>
                    )}
                    <Typography sx={{ fontWeight: 700, color: '#ffbb00', fontSize: '1.05rem' }}>
                      {product.priceCents ? `${Math.round(product.priceCents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <SearchIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>Введите запрос для поиска услуг</Typography>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
