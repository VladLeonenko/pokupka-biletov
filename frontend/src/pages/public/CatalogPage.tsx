import { useState, useEffect, SyntheticEvent, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchProducts, listProductCategories, getSearchTags, trackProductEvent } from '@/services/ecommerceApi';
import { ProductItem, SearchFilters } from '@/types/cms';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, CircularProgress, Container,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { FaqJsonLd } from '@/components/common/FaqJsonLd';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { pushProductList, pushProductClick } from '@/utils/dataLayer';

export function CatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const catalogRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'created_desc', isActive: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;
  const isInitialMount = useRef(true);

  const { data: categoriesData } = useQuery({ queryKey: ['searchCategories'], queryFn: () => listProductCategories(false), staleTime: 60000 });
  const categories = categoriesData || [];

  const categorySlugFromUrl = searchParams.get('category');
  useEffect(() => {
    if (!categorySlugFromUrl || categories.length === 0) return;
    const cat = categories.find((c) => c.slug?.toLowerCase() === categorySlugFromUrl.toLowerCase());
    if (cat) setFilters((p) => ({ ...p, categoryId: cat.id }));
  }, [categorySlugFromUrl, categories]);
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

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(0);
    if (key === 'categoryId') {
      const cat = categories.find((c) => c.id === value);
      setSearchParams(cat ? { category: cat.slug } : {}, { replace: true });
    }
  };
  const handleProductClick = async (product: ProductItem) => {
    pushProductClick({
      id: product.slug,
      name: product.title,
      price: product.priceCents ? product.priceCents / 100 : undefined,
      list: 'Catalog',
    });
    await trackProductEvent(product.slug, 'click');
    navigate(`/products/${product.slug}`);
  };

  const products = data?.products || [];
  const tags = tagsData || [];

  const catalogFaq = [
    { question: 'Почему веб-студии Москвы берут в 2 раза дороже, а результат хуже?', answer: 'Большинство студий работают по шаблону: Tilda за 300к, Yii1 за 500к, сдача за 2 недели с багами. Prime Coder: анализ конкурентов + UX-аудит бесплатно, React/Yii2/PostgreSQL (масштаб до 100k+ товаров), 85% клиентов остаются больше года. 70% наших клиентов пришли от других студий с неработающими сайтами.' },
    { question: 'Сколько реально заявок даст сайт за первый месяц?', answer: 'Лендинг (150к ₽): 15-35 заявок. Корпоративный (350к ₽): 25-60 заявок. E-commerce (800к ₽): 45-120 заказов. Гарантируем в договоре: ТОП-10 по 3 брендовым запросам, конверсия ≥1.5% (e-com ≥2.5%), PageSpeed Mobile ≥90. Если не выполним — бесплатно дорабатываем.' },
    { question: 'Зачем мне новый сайт, если текущий более-менее работает?', answer: 'Три красных флага: 1) Трафик есть, заявок нет — 60% уходят из-за UX. 2) Конверсия <1.5% (норма 2.5-4%). 3) PageSpeed Mobile <80 — минус 30% позиций. Кейс KChTZ: старый 1.2% конверсия, новый 1.7%, трафик 5k→12.5k, продажи x3. Бесплатный аудит за 15 минут.' },
    { question: 'Можно ли сделать сайт дешевле на Tilda или WordPress?', answer: 'Tilda (50-150к): быстро, но не масштабируется, нет админки, интеграции платно. WordPress (100-300к): много шаблонов, но уязвимости, медленная загрузка. Prime Coder (React/Yii2): масштаб 100k+ товаров, PageSpeed 95, своя админка бесплатно, 1С/CRM в цене.' },
    { question: 'Как понять, что вы не фрилансер, а студия?', answer: 'Команда 7 человек, офис в Москве, 50+ кейсов с цифрами, договор ИП/ООО, GitHub с открытым кодом, еженедельные стендапы (Trello доступ), 85% клиентов со мной больше 6 месяцев. Фрилансер ответит устно — мы даём договор и доступ к процессу.' },
    { question: 'Что делать, если проект затянется или результат не понравится?', answer: 'Защита в договоре: штраф 2% за каждый день просрочки, поэтапная предоплата 40-30-30%, 3 правки бесплатно на каждом этапе, возврат 100% при срыве сроков, тестирование на ваших данных перед оплатой. 95% проектов сдаём раньше срока, 85% заказывают 2+ проект.' },
    { question: 'На каком хостинге лучше разместить мой сайт?', answer: 'Рекомендуем Timeweb Cloud (70% наших проектов), Selectel для высоких нагрузок, Cloudflare+Timeweb для PageSpeed 95+. Не рекомендуем Beget, Reg.ru — тормоза на WooCommerce/Yii2. Включаем: SSL, домен .ru, бэкапы, мониторинг. 1 год хостинга бесплатно в стоимости.' },
    { question: 'Можете ли показать демо проекта до заказа?', answer: 'Да, 5 готовых демо: E-commerce (prime-coder.ru/demo/ecommerce), B2B-портал, админка, лендинг (конверсия 12%), корпоративный с 1С+CRM. Полный доступ и исходники на 30 дней бесплатно.' },
    { question: 'Зачем мне SEO, если я хочу быстрые заявки из рекламы?', answer: 'SEO = бесплатная реклама 24/7. 70% клиентов пришли из органики. Контекст: 800-1500 ₽ за лид, 50-100 заявок/мес. SEO: 0 ₽, 80-200 заявок/мес, ТОП-10 навсегда. Делаем: техническое SEO, Schema.org, ТОП-10 по 5 брендовым, контент-план. 60-70% трафика бесплатно через 3 месяца.' },
    { question: 'Какой минимальный бюджет нужен для разработки сайта?', answer: 'Заявки (B2B): лендинг 150 000 ₽, корпоративный 350 000 ₽. Продажи (e-com): маркетплейс 800 000 ₽, сложный с 1С 1 200 000 ₽. Фрилансер 50-100к = баги через 3 месяца. Prime Coder = результат + поддержка 1 год. Бонус: аудит конкурентов + прототип бесплатно.' },
  ];

  // dataLayer: просмотр списка товаров (цели ecommerce)
  useEffect(() => {
    if (products.length > 0) {
      pushProductList(
        products.map((p, i) => ({
          id: p.slug,
          name: p.title,
          price: p.priceCents ? p.priceCents / 100 : undefined,
          category: p.category?.name,
          list: 'Catalog',
          position: i + 1,
        })),
        'Catalog'
      );
    }
  }, [products]);

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
        title="Услуги разработки сайтов и SEO — цены | PrimeCoder"
        description="Полный каталог: создание сайтов от 150 000 ₽, SEO-продвижение, реклама у блогеров, дизайн. Выберите услугу и получите расчёт за 24 часа."
        keywords="каталог услуг, разработка сайтов цена, SEO продвижение стоимость, реклама у блогеров, создание лендинга, PrimeCoder"
        url="https://prime-coder.ru/catalog"
        type="website"
      />
      <FaqJsonLd items={catalogFaq} />

      <Box component="main" ref={catalogRef} sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
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
                          sx={{ width: '100%', height: { xs: 400, sm: 320 }, objectFit: 'cover', display: 'block', bgcolor: 'rgba(0,0,0,0.15)' }}
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

          {/* FAQ */}
          <Box sx={{ mt: 10, mb: 4 }} data-anim="fade-up">
            <Typography component="h2" sx={{ fontSize: '1.75rem', fontWeight: 600, color: '#fff', mb: 3 }}>
              Частые вопросы о каталоге услуг
            </Typography>
            {catalogFaq.map((item, idx) => (
              <Accordion
                key={idx}
                sx={{
                  bgcolor: 'rgba(20,20,20,0.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  '&:before': { display: 'none' },
                  mb: 1,
                  '& .MuiAccordionSummary-root': { color: '#fff', fontWeight: 500 },
                  '& .MuiAccordionDetails-root': { color: 'rgba(255,255,255,0.85)', pt: 0, lineHeight: 1.7 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffbb00' }} />}>
                  {item.question}
                </AccordionSummary>
                <AccordionDetails>
                  <Typography component="div" sx={{ whiteSpace: 'pre-line' }}>
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>
    </>
  );
}
