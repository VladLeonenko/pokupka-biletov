import { useState, SyntheticEvent, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/services/ecommerceApi';
import { ProductItem } from '@/types/cms';
import { Box, Typography, TextField, Button, Grid, Card, CardContent, CardMedia, CircularProgress, Chip, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['searchProducts', searchTerm],
    queryFn: () => searchProducts({ searchQuery: searchTerm, limit: 20 }),
    enabled: searchTerm.length > 0,
  });

  const handleSearch = () => {
    if (query.trim()) {
      setSearchTerm(query.trim());
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const products = data?.products || [];

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title={searchTerm ? `Поиск: ${searchTerm} - Primecoder` : 'Умный поиск - Primecoder'}
        description={searchTerm ? `Результаты поиска по запросу: ${searchTerm}` : 'Поиск товаров и услуг'}
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Умный поиск</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Введите запрос для поиска..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: (
              <Button onClick={handleSearch} startIcon={<SearchIcon />}>
                Найти
              </Button>
            ),
          }}
        />
      </Box>

      {searchTerm && (
        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
          Найдено товаров: {data?.total || 0}
        </Typography>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : products.length === 0 && searchTerm ? (
        <Typography>Товары не найдены</Typography>
      ) : products.length > 0 ? (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.slug}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
                onClick={() => navigate(`/products/${product.slug}`)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={resolveImageUrl(product.imageUrl)}
                  alt={product.title}
                  loading="lazy"
                  sx={{ backgroundColor: 'grey.200' }}
                  onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = fallbackImageUrl();
                  }}
                />
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>{product.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {product.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </Typography>
                  {product.tags && product.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {product.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  )}
                  <Typography variant="h6" color="primary">
                    {product.priceCents ? `${(product.priceCents / 100).toFixed(2)} ${product.currency}` : 'Цена по запросу'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Введите запрос для поиска товаров
          </Typography>
        </Box>
      )}
    </Container>
    <style>{`
      /* Стили для меню - скрыто по умолчанию */
      .menu {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: 50 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease, visibility 0.3s ease !important;
      }

      #burger-toggle:checked ~ .menu {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 52 !important;
      }

      body {
        position: relative !important;
      }
    `}</style>
    </>
  );
}

