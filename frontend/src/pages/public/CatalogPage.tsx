import { useState, useEffect, SyntheticEvent, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts, getSearchCategories, getSearchTags, trackProductEvent } from '@/services/ecommerceApi';
import { ProductItem, SearchFilters } from '@/types/cms';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Slider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

export function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const catalogRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'created_desc',
    isActive: true, // Показываем только активные товары по умолчанию
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;
  const isInitialMount = useRef(true);

  const { data: categoriesData } = useQuery({ 
    queryKey: ['searchCategories'], 
    queryFn: getSearchCategories,
    staleTime: 60000, // Категории меняются редко
  });
  const { data: tagsData } = useQuery({ 
    queryKey: ['searchTags'], 
    queryFn: getSearchTags,
    staleTime: 60000,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['searchProducts', filters, page],
    queryFn: () => searchProducts({ ...filters, limit, offset: page * limit }),
    enabled: true,
    staleTime: 10000, // Поиск можно обновлять чаще
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.searchQuery) {
        setFilters(prev => ({ ...prev, searchQuery }));
        setPage(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Скролл в верх каталога при изменении страницы
  useEffect(() => {
    // Пропускаем скролл при первоначальной загрузке
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleProductClick = async (product: ProductItem) => {
    await trackProductEvent(product.slug, 'click');
    navigate(`/products/${product.slug}`);
  };

  const handleProductView = async (product: ProductItem) => {
    await trackProductEvent(product.slug, 'view');
  };

  const products = data?.products || [];
  const categories = categoriesData || [];
  const tags = tagsData || [];

  const filtersContent = (
    <>
      {/* Категории */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Категория</InputLabel>
        <Select
          value={filters.categoryId || ''}
          onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)}
          label="Категория"
        >
          <MenuItem value="">Все категории</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Цена */}
      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>Цена</Typography>
        <Box sx={{ px: 1 }}>
          <TextField
            type="number"
            label="От"
            value={filters.minPrice || ''}
            onChange={(e) =>
              handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            size="small"
            sx={{ width: '100%', mb: 1 }}
          />
          <TextField
            type="number"
            label="До"
            value={filters.maxPrice || ''}
            onChange={(e) =>
              handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            size="small"
            sx={{ width: '100%' }}
          />
        </Box>
      </Box>

      {/* Теги */}
      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>Теги</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onClick={() => {
                const currentTags = filters.tags || [];
                const newTags = currentTags.includes(tag)
                  ? currentTags.filter((t) => t !== tag)
                  : [...currentTags, tag];
                handleFilterChange('tags', newTags.length > 0 ? newTags : undefined);
              }}
              color={filters.tags?.includes(tag) ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Сортировка */}
      <FormControl fullWidth>
        <InputLabel>Сортировка</InputLabel>
        <Select
          value={filters.sortBy || 'created_desc'}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          label="Сортировка"
        >
          <MenuItem value="created_desc">Новинки</MenuItem>
          <MenuItem value="price_asc">Цена: по возрастанию</MenuItem>
          <MenuItem value="price_desc">Цена: по убыванию</MenuItem>
          <MenuItem value="name_asc">Название: А-Я</MenuItem>
          <MenuItem value="name_desc">Название: Я-А</MenuItem>
          <MenuItem value="popularity">Популярность</MenuItem>
        </Select>
      </FormControl>
    </>
  );

  return (
    <>
      <div ref={catalogRef}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontSize: { xs: '1.5rem', sm: '2rem' } }}>Каталог услуг</Typography>

      {/* Поиск */}
      <TextField
        fullWidth
        placeholder="Поиск товаров..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        {/* Фильтры */}
        <Grid item xs={12} md={3}>
          {/* Мобильный аккордеон */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Фильтры</Typography>
              </AccordionSummary>
              <AccordionDetails>{filtersContent}</AccordionDetails>
            </Accordion>
          </Box>

          {/* Десктопный сайдбар */}
          <Box
            sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 20 }}
            className="catalog-filters"
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Фильтры
            </Typography>
            {filtersContent}
          </Box>
        </Grid>

        {/* Товары */}
        <Grid item xs={12} md={9}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Typography>Товары не найдены</Typography>
          ) : (
            <>
              <Grid container spacing={2}>
                {products.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.slug}>
                    <Card
                      sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
                      onClick={() => handleProductClick(product)}
                      onMouseEnter={() => handleProductView(product)}
                    >
                      <CardMedia
                        component="img"
                        height="200"
                        image={resolveImageUrl(product.imageUrl)}
                        alt={product.title}
                        loading="lazy"
                        sx={{ 
                          objectFit: 'cover',
                          backgroundColor: 'grey.200',
                          minHeight: 200,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = fallbackImageUrl();
                        }}
                      />
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>{product.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 40 }}>
                          {product.summary || product.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Описание товара'}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {product.priceCents ? `${(product.priceCents / 100).toFixed(2)} ${product.currency}` : 'Цена по запросу'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Пагинация */}
              {data && data.total > limit && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                  <Button 
                    disabled={page === 0} 
                    onClick={() => {
                      if (page > 0) {
                        setPage(page - 1);
                      }
                    }}
                  >
                    Назад
                  </Button>
                  <Typography sx={{ alignSelf: 'center' }}>
                    Страница {page + 1} из {Math.ceil(data.total / limit)}
                  </Typography>
                  <Button 
                    disabled={page >= Math.ceil(data.total / limit) - 1} 
                    onClick={() => {
                      if (page < Math.ceil(data.total / limit) - 1) {
                        setPage(page + 1);
                      }
                    }}
                  >
                    Вперед
                  </Button>
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </Container>
    </div>
    </>
  );
}

