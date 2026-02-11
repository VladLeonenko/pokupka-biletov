import { useState, useEffect, SyntheticEvent, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts, listProductCategories, getSearchTags, trackProductEvent } from '@/services/ecommerceApi';
import { ProductItem, SearchFilters } from '@/types/cms';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, CircularProgress, Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

export function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const catalogRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'created_desc', isActive: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;
  const isInitialMount = useRef(true);

  const { data: categoriesData } = useQuery({ queryKey: ['searchCategories'], queryFn: () => listProductCategories(false), staleTime: 60000 });
  const { data: tagsData } = useQuery({ queryKey: ['searchTags'], queryFn: getSearchTags, staleTime: 60000 });
  const { data, isLoading } = useQuery({
    queryKey: ['searchProducts', filters, page],
    queryFn: () => searchProducts({ ...filters, limit, offset: page * limit }),
    enabled: true,
    staleTime: 10000,
  });

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery !== filters.searchQuery) { setFilters(p => ({ ...p, searchQuery })); setPage(0); } }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => { setFilters(p => ({ ...p, [key]: value })); setPage(0); };
  const handleProductClick = async (product: ProductItem) => { await trackProductEvent(product.slug, 'click'); navigate(`/products/${product.slug}`); };

  const products = data?.products || [];
  const categories = categoriesData || [];
  const tags = tagsData || [];

  /* ---------- Inline styles ---------- */
  const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#ffbb00' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ffbb00' },
  };

  const cardSx = {
    p: 0, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(20,20,20,0.6)', overflow: 'hidden', cursor: 'pointer',
    transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
    '&:hover': { borderColor: 'rgba(255,187,0,0.25)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', transform: 'translateY(-4px)' },
  };

  return (
    <>
      <SeoMetaTags
        title="Каталог услуг веб-разработки и digital-маркетинга | PrimeCoder"
        description="Услуги разработки сайтов, SEO-продвижения, рекламы у блогеров, маркетинга. Цены от 150 000 ₽. Москва."
        keywords="каталог услуг, разработка сайтов, SEO продвижение, реклама у блогеров, веб-разработка, PrimeCoder"
        url="https://prime-coder.ru/catalog"
        type="website"
      />

      <Box component="main" ref={catalogRef} sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 12, md: 14 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Каталог" title="Услуги и решения" description="Разработка сайтов, SEO, реклама, дизайн — всё в одном месте." decoText="CATALOG" />

          {/* Search */}
          <TextField
            fullWidth placeholder="Поиск услуг..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 4, ...inputSx }}
          />

          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Sidebar filters */}
            <Box sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }} data-anim="fade-up">
              <Typography sx={{ fontWeight: 600, color: '#fff', mb: 2, fontSize: '1.05rem' }}>Фильтры</Typography>

              <FormControl fullWidth sx={{ mb: 2, ...inputSx }}>
                <InputLabel>Категория</InputLabel>
                <Select value={filters.categoryId || ''} onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)} label="Категория">
                  <MenuItem value="">Все</MenuItem>
                  {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <TextField type="number" label="Цена от" value={filters.minPrice || ''} onChange={(e) => handleFilterChange('minPrice', e.target.value ? +e.target.value : undefined)} size="small" fullWidth sx={{ mb: 1, ...inputSx }} />
                <TextField type="number" label="Цена до" value={filters.maxPrice || ''} onChange={(e) => handleFilterChange('maxPrice', e.target.value ? +e.target.value : undefined)} size="small" fullWidth sx={inputSx} />
              </Box>

              {tags.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small"
                      onClick={() => { const cur = filters.tags || []; const n = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag]; handleFilterChange('tags', n.length ? n : undefined); }}
                      sx={{ bgcolor: filters.tags?.includes(tag) ? 'rgba(255,187,0,0.2)' : 'rgba(255,255,255,0.06)', color: filters.tags?.includes(tag) ? '#ffbb00' : 'rgba(255,255,255,0.6)', border: '1px solid', borderColor: filters.tags?.includes(tag) ? '#ffbb00' : 'transparent' }}
                    />
                  ))}
                </Box>
              )}

              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Сортировка</InputLabel>
                <Select value={filters.sortBy || 'created_desc'} onChange={(e) => handleFilterChange('sortBy', e.target.value)} label="Сортировка">
                  <MenuItem value="created_desc">Новинки</MenuItem>
                  <MenuItem value="price_asc">Цена ↑</MenuItem>
                  <MenuItem value="price_desc">Цена ↓</MenuItem>
                  <MenuItem value="name_asc">А-Я</MenuItem>
                  <MenuItem value="popularity">Популярность</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Product grid */}
            <Box sx={{ flex: 1 }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>
              ) : !products.length ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', py: 6, textAlign: 'center' }}>Услуги не найдены</Typography>
              ) : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 3 }} data-anim="stagger">
                    {products.map((p) => (
                      <Box key={p.slug} sx={cardSx} data-anim-child onClick={() => handleProductClick(p)}>
                        <Box
                          component="img"
                          src={resolveImageUrl(p.imageUrl)}
                          alt={p.title}
                          loading="lazy"
                          onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                          sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                        />
                        <Box sx={{ p: 2.5 }}>
                          <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem', mb: 0.75, lineHeight: 1.3 }}>{p.title}</Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55 }}>
                            {p.summary || p.descriptionHtml?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}
                          </Typography>
                          <Typography sx={{ fontWeight: 700, color: '#ffbb00', fontSize: '1.05rem' }}>
                            {p.priceCents ? `${Math.round(p.priceCents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {data && data.total > limit && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 5 }}>
                      <Button disabled={page === 0} onClick={() => setPage(page - 1)} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: '#ffbb00' } }}>Назад</Button>
                      <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>{page + 1} / {Math.ceil(data.total / limit)}</Typography>
                      <Button disabled={page >= Math.ceil(data.total / limit) - 1} onClick={() => setPage(page + 1)} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: '#ffbb00' } }}>Далее</Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
