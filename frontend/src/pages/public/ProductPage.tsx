import { useState, useEffect, SyntheticEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, Container, Typography, Button, Card, CardContent, 
  Grid, TextField, Chip, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, IconButton, ImageList, ImageListItem,
  Divider, Paper, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Stack
} from '@mui/material';

import { 
  ShoppingCart, Favorite, Share, 
  ArrowBack, Send, Close, Visibility, ExpandMore, ZoomIn, NavigateBefore, NavigateNext
} from '@mui/icons-material';
import { ProductItem } from '@/types/cms';
import { submitForm } from '@/services/cmsApi';
import { getPublicProduct, getPublicCase } from '@/services/publicApi';
import { trackProductEvent, addToCart, addToWishlist } from '@/services/ecommerceApi';
import { pushProductView, pushAddToCart, pushReachGoal } from '@/utils/dataLayer';
import { useAuth } from '@/auth/AuthProvider';
import DOMPurify from 'dompurify';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ProductJsonLd } from '@/components/common/ProductJsonLd';
import { FaqJsonLd } from '@/components/common/FaqJsonLd';
import { BreadcrumbJsonLd } from '@/components/common/BreadcrumbJsonLd';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { motion } from 'framer-motion';
import { TeamCarousel } from '@/components/public/TeamCarousel';
import { useToast } from '@/components/common/ToastProvider';
import { ServiceCalculator } from '@/components/calculator';
import { TariffQuiz } from '@/components/products/TariffQuiz';
import { Star } from '@mui/icons-material';
import Rating from '@mui/material/Rating';
import Avatar from '@mui/material/Avatar';
import { getApiBase } from '@/utils/apiBase';
import { dedupeRepeatedPhrase } from '@/utils/text';
import { SocialProofs } from '@/components/products/SocialProofs';
import { getRelatedProductSlugs, getRelatedProductsWithBenefits } from '@/config/relatedProducts';

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);
const MotionStack = motion.create(Stack);
const MotionCard = motion.create(Card);
const MotionAccordion = motion.create(Accordion);
const MotionTypography = motion.create(Typography);


export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [fullDescriptionExpanded, setFullDescriptionExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: product, isLoading } = useQuery<ProductItem | undefined>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      return await getPublicProduct(slug);
    },
    enabled: !!slug,
  });

  const { data: cases } = useQuery({
    queryKey: ['cases', (product as any)?.caseSlugs],
    queryFn: async () => {
      const caseSlugs = (product as any)?.caseSlugs;
      if (!caseSlugs || !Array.isArray(caseSlugs) || caseSlugs.length === 0) return [];
      const promises = caseSlugs.map(async (caseSlug: string) => {
        try {
          return await getPublicCase(caseSlug);
        } catch {
          return null;
        }
      });
      return (await Promise.all(promises)).filter(Boolean);
    },
    enabled: !!product?.caseSlugs && product.caseSlugs.length > 0,
  });

  // Отзывы по данному продукту
  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', slug],
    queryFn: async () => {
      const base = getApiBase();
      const res = await fetch(`${base}/api/reviews/public?product_slug=${slug}&limit=6&sort=rating_desc`);
      if (!res.ok) return { reviews: [] };
      return res.json();
    },
    enabled: !!slug,
    staleTime: 60000,
  });
  const productReviews = reviewsData?.reviews || [];

  const contentJson = product?.contentJson || {};
  const cmsRelatedServices = contentJson?.relatedServices?.services?.filter(
    (s: any) => s && (s.title || s.link)
  ) || [];
  const cmsRelatedSlugs = cmsRelatedServices
    .filter((s: any) => s.link && !s.imageUrl)
    .map((s: any) => {
      const p = s.link?.startsWith('/catalog/') ? s.link.replace(/^\/catalog/, '/products') : s.link;
      return (p || '').replace(/^\/products\//, '').split('?')[0].trim();
    })
    .filter(Boolean);

  const matrixUpsells = product?.slug ? getRelatedProductsWithBenefits(product.slug) : [];
  const smartSlugs = matrixUpsells.map((u) => u.slug);
  const benefitBySlug = Object.fromEntries(matrixUpsells.map((u) => [u.slug, u.benefit]));
  const relatedSlugs = cmsRelatedSlugs.length > 0 ? cmsRelatedSlugs : smartSlugs;

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', relatedSlugs.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        relatedSlugs.map((slug: string) =>
          getPublicProduct(slug).then((p) => (p ? { slug, imageUrl: p.imageUrl, title: p.title, description: p.summary || (p.contentJson as any)?.shortDescription } : null))
        )
      );
      return results.filter(Boolean) as { slug: string; imageUrl?: string; title?: string; description?: string }[];
    },
    enabled: !!product && relatedSlugs.length > 0,
    staleTime: 60000,
  });
  const relatedImageBySlug = Object.fromEntries(
    (relatedProducts as { slug: string; imageUrl?: string }[]).map((r) => [r.slug, r.imageUrl])
  );

  const relatedServices =
    relatedSlugs.length > 0 && (relatedProducts as { slug: string; imageUrl?: string; title?: string; description?: string }[]).length > 0
      ? (relatedProducts as { slug: string; imageUrl?: string; title?: string; description?: string }[]).map((p) => ({
          title: p.title,
          link: `/products/${p.slug}`,
          description: benefitBySlug[p.slug] || p.description,
          imageUrl: p.imageUrl,
        }))
      : cmsRelatedServices;

  useEffect(() => {
    if (product) {
      trackProductEvent(product.slug, 'view');
      pushProductView({
        id: product.slug,
        name: product.title,
        price: product.priceCents ? product.priceCents / 100 : undefined,
        category: product.category?.name,
        list: 'Product detail',
      });
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      pushAddToCart({
        id: product.slug,
        name: product.title,
        price: product.priceCents ? product.priceCents / 100 : undefined,
        quantity: 1,
        list: 'Product detail',
      });
      await trackProductEvent(product.slug, 'add_to_cart');
      await addToCart(product.slug, 1);
      showToast('Товар добавлен в корзину', 'success');
    } catch (error) {
      showToast('Ошибка при добавлении товара в корзину', 'error');
    }
  };

  const handleAddToWishlist = async () => {
    if (!product || !user) {
      navigate('/admin/login');
      return;
    }
    try {
      pushReachGoal('add_to_wishlist');
      await trackProductEvent(product.slug, 'add_to_wishlist');
      await addToWishlist(product.slug);
      showToast('Товар добавлен в избранное', 'success');
    } catch (error) {
      showToast('Ошибка при добавлении товара в избранное', 'error');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) {
      showToast('Ошибка: товар не найден', 'error');
      return;
    }
    
    // Валидация полей
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      showToast('Заполните все обязательные поля (Имя, Email, Сообщение)', 'error');
      return;
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      showToast('Введите корректный email адрес', 'error');
      return;
    }

    try {
      pushReachGoal('contact_form_submit');
      // Используем форму обратной связи из CMS
      await submitForm('contact', {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone?.trim() || '',
        message: `Запрос по услуге: ${product.title}\n\n${contactForm.message.trim()}`,
        product: product.title,
        productSlug: product.slug,
        pageUrl: window.location.href,
      });
      
      showToast('Спасибо! Ваш запрос отправлен. Мы свяжемся с вами в ближайшее время.', 'success');
      setContactFormOpen(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      console.error('Ошибка отправки формы:', error);
      const errorMessage = error?.message || 'Произошла ошибка при отправке формы. Пожалуйста, попробуйте еще раз.';
      showToast(errorMessage, 'error');
    }
  };

  const formatPrice = (cents?: number, currency?: string) => {
    if (!cents) return 'Цена по запросу';
    // Отображаем цену в рублях (без копеек)
    const rubles = Math.round(cents / 100);
    return `${rubles.toLocaleString('ru-RU')} ₽`;
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4">Товар не найден</Typography>
        <Button onClick={() => navigate('/catalog')} sx={{ mt: 2 }}>
          Вернуться в каталог
        </Button>
      </Container>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const headerSection = contentJson?.header;
  const hasHeaderBlock = headerSection && (headerSection.title || headerSection.description || headerSection.primaryButtonText || headerSection.secondaryButtonText);
  const priceSection = contentJson?.priceSection;
  const tariffs = priceSection?.tariffs?.filter(
    (tariff) => tariff && (tariff.name || tariff.price || tariff.description || (tariff.featuresLeft && tariff.featuresLeft.length) || (tariff.featuresRight && tariff.featuresRight.length))
  );
  const hasDescriptionBlock = contentJson.description?.title || contentJson.description?.text;
  const workSteps = contentJson.workSteps;
  const workStepsList = workSteps?.steps?.filter((step) => step && (step.title || step.description));
  const statsSection = contentJson.stats;
  const statsItems = statsSection?.items?.filter((item) => item && (item.value || item.label));
  const teamSection = contentJson.team;
  const teamMembers = teamSection?.members?.filter((member) => member && (member.name || member.role || member.imageUrl));
  const relatedServicesSection = contentJson.relatedServices;
  const toProductUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('/catalog/')) return url.replace(/^\/catalog/, '/products');
    if (url.startsWith('/')) return url;
    return `/${url}`.replace(/^\/catalog\//, '/products/');
  };
  const subscribeItems = contentJson.subscribe?.items?.filter((item) => item && (item.title || item.description || item.linkText));
  const faqSection = contentJson.faq;
  const faqItems = faqSection?.items?.filter((item) => item && (item.question || item.answer));
  const sectionAnimation = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
    viewport: { once: true, amount: 0.05, margin: '-80px' },
  });

  const handleSmartNavigate = (url?: string) => {
    if (!url) return;
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const allImages = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => setLightboxIndex((i) => (i === null ? null : i > 0 ? i - 1 : allImages.length - 1));
  const lightboxNext = () => setLightboxIndex((i) => (i === null ? null : i < allImages.length - 1 ? i + 1 : 0));

  return (
    <>
      <SeoMetaTags
        title={product.metaTitle || product.title}
        description={product.metaDescription || product.summary || (product.descriptionHtml ? product.descriptionHtml.replace(/<[^>]*>/g, '').substring(0, 160) : '')}
        keywords={
          (Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : 
           typeof product.metaKeywords === 'string' ? product.metaKeywords : 
           (Array.isArray(product.tags) ? product.tags.join(', ') : ''))
        }
        image={product.imageUrl}
        url={currentUrl}
        type="product"
      />
      <ProductJsonLd
        product={{
          title: product.title,
          description: product.summary || (product.descriptionHtml ? product.descriptionHtml.replace(/<[^>]*>/g, '').substring(0, 300) : ''),
          imageUrl: product.imageUrl,
          priceCents: product.priceCents,
          currency: product.currency,
          slug: product.slug,
        }}
        url={currentUrl}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: 'https://prime-coder.ru/' },
          { name: 'Каталог', url: 'https://prime-coder.ru/catalog' },
          { name: product.title, url: currentUrl },
        ]}
      />
      {faqItems && faqItems.length > 0 && (
        <FaqJsonLd items={faqItems} />
      )}
      {/* class "product-shopping" снижает вероятность срабатывания Reader Mode (Яндекс/Safari) — Readability помечает "shopping" как не-статью */}
      <Box
        className="product-shopping"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          backgroundColor: '#141414',
        }}
      >
        <Container maxWidth="lg" sx={{ pt: { xs: 6.25, md: 6.25 }, pb: { xs: 6, md: 10 }, position: 'relative', zIndex: 1 }}>
      {/* Кнопка назад */}
      <MotionBox
        {...sectionAnimation(0)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 4, md: 6 } }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/catalog')}
          variant="text"
          color="inherit"
          sx={{
            px: 3,
            py: 1,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(12px)',
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' },
          }}
        >
          Вернуться в каталог
        </Button>
      </MotionBox>
      
      <Grid container spacing={4}>
        {/* Левая колонка - изображение и галерея */}
        <Grid item xs={12} md={6}>
          <MotionPaper
            {...sectionAnimation(0.12)}
            elevation={0}
            sx={{
              position: 'relative',
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              bgcolor: 'rgba(20,20,20,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}
          >
            <Box
              onClick={() => allImages.length > 0 && openLightbox(0)}
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                mb: product.gallery && product.gallery.length > 0 ? 3 : 0,
                background: 'rgba(20,20,20,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
                cursor: 'pointer',
                '&:hover .product-img-zoom-hint': { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={resolveImageUrl(product.imageUrl)}
                alt={product.title}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  maxHeight: 480,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 12px 30px rgba(0,0,0,0.45))',
                  transition: 'transform 0.5s ease',
                  '&:hover': { transform: 'scale(1.04)' },
                }}
                onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = fallbackImageUrl();
                }}
              />
              <Box
                className="product-img-zoom-hint"
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  opacity: 0,
                  transition: 'opacity 0.3s',
                }}
              >
                <ZoomIn sx={{ fontSize: 18 }} /> Увеличить
              </Box>
            </Box>

            {product.gallery && product.gallery.length > 0 && (
              <ImageList cols={3} gap={8} sx={{ m: 0 }}>
                {product.gallery.map((img, idx) => (
                  <ImageListItem
                    key={idx}
                    sx={{ overflow: 'hidden', borderRadius: 2, cursor: 'pointer' }}
                    onClick={() => openLightbox(idx + 1)}
                  >
                    <Box
                      component="img"
                      src={resolveImageUrl(img)}
                      alt={`${product.title} ${idx + 1}`}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease, border-color 0.3s',
                        border: '2px solid transparent',
                        '&:hover': { transform: 'scale(1.05)', borderColor: 'rgba(255,187,0,0.4)' },
                      }}
                      onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = fallbackImageUrl();
                      }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </MotionPaper>
        </Grid>

        {/* Правая колонка - информация */}
        <Grid item xs={12} md={6}>
          <MotionStack {...sectionAnimation(0.18)} spacing={3} sx={{ height: '100%' }}>
            <MotionBox
              {...sectionAnimation(0.2)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                borderRadius: 999,
                background: 'rgba(255,187,0,0.08)',
                border: '1px solid rgba(255,187,0,0.2)',
                color: 'rgba(255,187,0,0.9)',
                textTransform: 'uppercase',
                letterSpacing: '0.32em',
                fontSize: '0.7rem',
                fontWeight: 600,
                backdropFilter: 'blur(12px)',
                width: 'fit-content',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ffbb00' }} />
              УСЛУГА PRIMECODER
            </MotionBox>
            <Box>
              <MotionTypography
                {...sectionAnimation(0.26)}
                variant="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  lineHeight: 1.1,
                  color: '#fff',
                  mt: 1.5,
                }}
              >
                {product.title}
              </MotionTypography>
              {product.summary && (
                <MotionTypography
                  {...sectionAnimation(0.32)}
                  variant="h6"
                  sx={{
                    maxWidth: 580,
                    mt: 2,
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.68,
                    fontWeight: 400,
                    fontSize: { xs: '1.05rem', md: '1.15rem' },
                    'textWrap': 'balance',
                  }}
                >
                  {product.summary}
                </MotionTypography>
              )}
            </Box>
            <MotionBox
              {...sectionAnimation(0.36)}
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                maxWidth: 560,
                mt: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(20,20,20,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 24px 45px -30px rgba(0,0,0,0.56)',
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ffbb00' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  Индивидуальные сценарии внедрения
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(20,20,20,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 24px 45px -30px rgba(0,0,0,0.56)',
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbb00' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  Комплексное сопровождение и аналитика
                </Typography>
              </Box>
            </MotionBox>

            <MotionPaper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                position: 'relative',
                bgcolor: 'rgba(20,20,20,0.7)',
                border: '1px solid rgba(255,187,0,0.2)',
                color: '#fff',
                maxWidth: 420,
              }}
            >
              <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: '0.18em', mb: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                Стоимость
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#ffbb00',
                }}
              >
                {formatPrice(product.priceCents, product.currency)}
                {product.pricePeriod && product.pricePeriod !== 'one_time' && (
                  <Typography component="span" variant="body1" sx={{ ml: 1, color: 'rgba(255,255,255,0.75)' }}>
                    / {product.pricePeriod === 'monthly' ? 'месяц' : 'год'}
                  </Typography>
                )}
              </Typography>
            </MotionPaper>

            {product.tags && product.tags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {product.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </Stack>
            )}

            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              useFlexGap
              sx={{
                mt: 1,
                '& > .MuiButton-root': {
                  transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                },
                '& > .MuiButton-root:hover': {
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCart />}
                onClick={handleAddToCart}
                sx={{
                  minWidth: 200,
                  flexGrow: 1,
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#ffbb00',
                  color: '#141414',
                  '&:hover': { bgcolor: '#e5a800', color: '#141414' },
                }}
              >
                В корзину
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Favorite />}
                onClick={handleAddToWishlist}
                sx={{
                  minWidth: 180,
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.85)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                В избранное
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Share />}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: product.title, url: window.location.href }).catch(() => undefined);
                  }
                }}
                sx={{
                  minWidth: 180,
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: 'rgba(255,187,0,0.4)', color: '#ffbb00', bgcolor: 'rgba(255,187,0,0.05)' },
                }}
              >
                Поделиться
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={() => setContactFormOpen(true)}
                sx={{
                  minWidth: 220,
                  flexGrow: 1,
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#ffbb00',
                  color: '#141414',
                  '&:hover': { bgcolor: '#e5a800', color: '#141414' },
                }}
              >
                Заказать услугу
              </Button>
            </Stack>

            {product.descriptionHtml && (
              <MotionAccordion
                {...sectionAnimation(0.22)}
                expanded={descriptionExpanded}
                onChange={() => setDescriptionExpanded(!descriptionExpanded)}
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(30,32,56,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore htmlColor="rgba(255,255,255,0.7)" />}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Описание
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    className="service-description"
                    sx={{
                      '& > *': {
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: 'rgba(255,255,255,0.85)',
                        mb: 2,
                        '&:last-child': { mb: 0 },
                      },
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        mb: 2,
                        mt: 3,
                        color: 'rgba(255,255,255,0.95)',
                        '&:first-of-type': { mt: 0 },
                      },
                      '& p': {
                        mb: 2,
                      },
                      '& ul, & ol': {
                        mb: 2,
                        pl: 3,
                        '& li': {
                          mb: 1,
                        },
                      },
                      '& blockquote': {
                        borderLeft: '3px solid rgba(255,187,0,0.3)',
                        pl: 2,
                        ml: 0,
                        mb: 2,
                        fontStyle: 'italic',
                      },
                    }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.descriptionHtml) }}
                  />
                </AccordionDetails>
              </MotionAccordion>
            )}

            {product.features && product.features.length > 0 && (
              <MotionAccordion
                {...sectionAnimation(0.25)}
                expanded={featuresExpanded}
                onChange={() => setFeaturesExpanded(!featuresExpanded)}
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(30,32,56,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore htmlColor="rgba(255,255,255,0.7)" />}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Особенности и преимущества
                  </Typography>
                  <Chip label={product.features.length} size="small" sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }} />
                </AccordionSummary>
                <AccordionDetails>
                  <Stack component="ul" spacing={1.2} sx={{ pl: 0, mb: 0 }}>
                    {product.features.map((feature, idx) => (
                      <Box
                        component="li"
                        key={idx}
                        sx={{
                          listStyle: 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          color: 'rgba(255,255,255,0.82)',
                          lineHeight: 1.55,
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            mt: '6px',
                            flexShrink: 0,
                            background: 'rgba(255,187,0,0.15)',
                            boxShadow: '0 0 12px rgba(255,187,0,0.25)',
                          }}
                        />
                        <Typography variant="body2" sx={{ color: 'inherit' }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </MotionAccordion>
            )}

            {product.fullDescriptionHtml && (
              <MotionAccordion
                {...sectionAnimation(0.28)}
                expanded={fullDescriptionExpanded}
                onChange={() => setFullDescriptionExpanded(!fullDescriptionExpanded)}
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(30,32,56,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore htmlColor="rgba(255,255,255,0.7)" />}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Подробное описание
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.fullDescriptionHtml) }} />
                </AccordionDetails>
              </MotionAccordion>
            )}
          </MotionStack>
        </Grid>
      </Grid>


      {hasDescriptionBlock && (
        <MotionBox
          {...sectionAnimation(0.3)}
          sx={{ mt: 6, maxWidth: 820 }}
        >
          {contentJson.description?.title && (
            <Typography variant="h1" component="h1" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em', fontSize: { xs: '2rem', md: '2.5rem' } }}>
              {contentJson.description.title}
            </Typography>
          )}
          {contentJson.description?.text && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {contentJson.description.text}
            </Typography>
          )}
        </MotionBox>
      )}

      {/* Калькулятор стоимости */}
      {product.priceCents && (
        <Container maxWidth="lg" sx={{ mt: 8 }}>
          <ServiceCalculator
            service={product.slug}
            
            onCalculate={(result) => {
              setContactFormOpen(true);
              setContactForm((prev) => ({
                ...prev,
                message: prev.message || `Рассчитанная стоимость: ${result.totalCost.toLocaleString('ru-RU')} ₽. Окупаемость: ${result.paybackMonths} мес. ROI: ${result.totalROI}%`,
              }));
            }}
          />
        </Container>
      )}

      {/* Квиз выбора тарифа */}
      {tariffs && tariffs.length > 0 && (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <TariffQuiz
            onComplete={(recommendedTariff) => {
              setContactFormOpen(true);
              setContactForm((prev) => ({
                ...prev,
                message: prev.message || `Рекомендуемый тариф: ${tariffNames[recommendedTariff] || recommendedTariff}`,
              }));
            }}
          />
        </Container>
      )}

      {tariffs && tariffs.length > 0 && (
        <MotionBox {...sectionAnimation(0.34)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>
            {priceSection?.title || 'Тарифы и стоимость'}
          </Typography>
          <Grid container spacing={3}>
            {tariffs.map((tariff, index) => (
              <Grid item xs={12} md={tariffs.length >= 3 ? 4 : tariffs.length === 2 ? 6 : 12} key={tariff.id || tariff.name || tariff.price}>
                <MotionPaper
                  {...sectionAnimation(0.36 + index * 0.06)}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    position: 'relative',
                    bgcolor: 'rgba(17,18,36,0.76)',
                    border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 40px 60px -45px rgba(0,0,0,0.55)',
                    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.02)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(255,187,0,0.2)',
                      boxShadow: '0 40px 70px -38px rgba(0,0,0,0.65)',
                    },
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                      {tariff.name || 'Тариф'}
                    </Typography>
                    {tariff.subtitle && (
                      <Typography variant="subtitle1" color="rgba(255,255,255,0.7)" sx={{ mb: 2 }}>
                        {dedupeRepeatedPhrase(tariff.subtitle)}
                      </Typography>
                    )}
                    {tariff.price && (
                      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: '#ffbb00' }}>
                        {tariff.price}
                      </Typography>
                    )}
                    {tariff.description && (
                      <Typography variant="body2" color="rgba(255,255,255,0.72)" sx={{ mb: 3, lineHeight: 1.6 }}>
                        {tariff.description}
                      </Typography>
                    )}
                    {(tariff.featuresLeft?.length || tariff.featuresRight?.length) && (
                      <Box sx={{ display: 'grid', gap: 2 }}>
                        {tariff.featuresLeft?.length ? (
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.8)' }}>
                              Что входит
                            </Typography>
                            <List dense sx={{ color: 'rgba(255,255,255,0.75)' }}>
                              {tariff.featuresLeft.map((feature, idx) => (
                                <ListItem key={`tariff-${tariff.id || tariff.name || idx}-left-${idx}`} sx={{ py: 0.5 }}>
                                  <ListItemText primary={feature} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ) : null}
                        {tariff.featuresRight?.length ? (
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.8)' }}>
                              Дополнительно
                            </Typography>
                            <List dense sx={{ color: 'rgba(255,255,255,0.75)' }}>
                              {tariff.featuresRight.map((feature, idx) => (
                                <ListItem key={`tariff-${tariff.id || tariff.name || idx}-right-${idx}`} sx={{ py: 0.5 }}>
                                  <ListItemText primary={feature} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ) : null}
                      </Box>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3, py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#ffbb00', color: '#141414', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}
                    onClick={() => {
                      setContactFormOpen(true);
                      setContactForm((prev) => ({
                        ...prev,
                        message: prev.message || `Интересует тариф "${tariff.name || ''}"`,
                      }));
                    }}
                  >
                    Заказать тариф
                  </Button>
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {/* Социальные доказательства */}
      <Container maxWidth="xl" sx={{ mt: 8 }}>
        <SocialProofs />
      </Container>

      {workStepsList && workStepsList.length > 0 && (
        <MotionBox {...sectionAnimation(0.42)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 2 }}>
            {workSteps?.title || 'Как мы работаем'}
          </Typography>
          {workSteps?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 4, whiteSpace: 'pre-line', maxWidth: 900 }}>
              {(workSteps as any).description}
            </Typography>
          )}
          <Grid container spacing={4} sx={{ maxWidth: 1200, mx: 'auto' }}>
            {workStepsList.map((step, idx) => (
              <Grid item xs={12} sm={6} lg={4} key={step.number || idx}>
                <MotionPaper
                  {...sectionAnimation(0.44 + idx * 0.05)}
                  elevation={0}
                  sx={{
                    p: { xs: 3, md: 4 },
                    height: '100%',
                    borderRadius: 3,
                    position: 'relative',
                    bgcolor: 'rgba(17,18,36,0.76)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflow: 'hidden',
                    transition: 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.02)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'rgba(255,187,0,0.2)',
                      boxShadow: '0 26px 45px -35px rgba(0,0,0,0.65)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        minWidth: 36,
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,187,0,0.15)',
                        border: '2px solid rgba(255,187,0,0.5)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: '#ffbb00',
                      }}
                    >
                      {idx + 1}
                    </Box>
                    {step.title && (
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>
                        {String(step.title).replace(/^\d+\.\s*/, '')}
                      </Typography>
                    )}
                  </Box>
                  {/* title already shown in the header above */}
                  {step.description && (
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: '1rem', flexGrow: 1 }}>
                      {step.description}
                    </Typography>
                  )}
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {/* Stats: category-based layout */}
      {statsSection?.categories && statsSection.categories.length > 0 && (
        <MotionBox {...sectionAnimation(0.5)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', mb: 2 }}>
            {statsSection?.title || 'Наши результаты'}
          </Typography>
          {statsSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 4, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {statsSection.description}
            </Typography>
          )}
          <Grid container spacing={3}>
            {statsSection.categories.map((cat, idx) => (
              <Grid item xs={12} sm={6} md={3} key={cat.title || idx}>
                <MotionPaper
                  {...sectionAnimation(0.52 + idx * 0.05)}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    position: 'relative',
                    bgcolor: 'rgba(17,18,36,0.78)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 35px 50px -45px rgba(0,0,0,0.55)',
                    overflow: 'hidden',
                    transition: 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '-25%',
                      background: 'rgba(255,255,255,0.015)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(255,187,0,0.2)',
                      boxShadow: '0 45px 60px -40px rgba(0,0,0,0.6)',
                    },
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 2,
                      fontWeight: 700,
                      fontSize: { xs: '1.1rem', md: '1.25rem' },
                      lineHeight: 1.3,
                      color: '#fff',
                    }}
                  >
                    {cat.title}
                  </Typography>
                  <Stack spacing={1}>
                    {cat.bullets.map((bullet, bIdx) => (
                      <Typography
                        key={bIdx}
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.75)',
                          lineHeight: 1.5,
                          fontSize: '0.85rem',
                          '&::before': { content: '"• "' },
                        }}
                      >
                        {bullet}
                      </Typography>
                    ))}
                  </Stack>
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {/* Stats: flat value/label layout (legacy) */}
      {statsItems && statsItems.length > 0 && !statsSection?.categories?.length && (
        <MotionBox {...sectionAnimation(0.5)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', mb: 2 }}>
            {statsSection?.title || 'Наши результаты'}
          </Typography>
          {statsSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {statsSection.description}
            </Typography>
          )}
          <Grid container spacing={3}>
            {statsItems.map((item, idx) => (
              <Grid item xs={12} sm={6} md={Math.min(12 / Math.max(statsItems.length, 1), 3)} key={`${item.label || idx}-stat`}>
                <MotionPaper
                  {...sectionAnimation(0.52 + idx * 0.05)}
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 3,
                    position: 'relative',
                    bgcolor: 'rgba(17,18,36,0.78)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 35px 50px -45px rgba(0,0,0,0.55)',
                    overflow: 'hidden',
                    transition: 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '-25%',
                      background: 'rgba(255,255,255,0.015)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(255,187,0,0.2)',
                      boxShadow: '0 45px 60px -40px rgba(0,0,0,0.6)',
                    },
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      mb: 1,
                      fontWeight: 700,
                      fontSize: '2rem',
                      color: '#ffbb00',
                      textShadow: '0 0 20px rgba(255,187,0,0.3)',
                    }}
                  >
                    {item.value || '—'}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.72)">
                    {item.label}
                  </Typography>
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {teamMembers && teamMembers.length > 0 && (
        <MotionBox {...sectionAnimation(0.58)}>
          <TeamCarousel
            members={teamMembers}
            title={teamSection?.title || 'Команда проекта'}
            description={teamSection?.description}
          />
        </MotionBox>
      )}

      {relatedServices && relatedServices.length > 0 && (
        <MotionBox {...sectionAnimation(0.64)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 2 }}>
            {relatedServicesSection?.title || 'Похожие услуги'}
          </Typography>
          {relatedServicesSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {(relatedServicesSection as any).description}
            </Typography>
          )}
          <Grid container spacing={3}>
            {relatedServices.map((service, idx) => {
              const href = toProductUrl(service.link);
              const slug = href ? href.replace(/^\/products\//, '').split('?')[0] : '';
              const coverUrl = service.imageUrl || (slug ? relatedImageBySlug[slug] : undefined);
              const CardWrapper = href ? Link : Box;
              const cardProps = href ? { to: href, style: { textDecoration: 'none', color: 'inherit' } } : {};
              return (
                <Grid item xs={12} sm={6} md={Math.min(12 / Math.max(relatedServices!.length, 1), 4)} key={service.title || idx}>
                  <CardWrapper {...cardProps}>
                    <MotionCard
                      {...sectionAnimation(0.66 + idx * 0.05)}
                      component={href ? 'div' : undefined}
                      sx={{
                        cursor: href ? 'pointer' : 'default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        position: 'relative',
                        bgcolor: 'rgba(17,18,36,0.78)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                        boxShadow: '0 28px 52px -46px rgba(0,0,0,0.65)',
                        transition: 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(255,255,255,0.02)',
                          opacity: 0.6,
                          pointerEvents: 'none',
                        },
                        '&:hover': {
                          transform: 'translateY(-6px)',
                          borderColor: 'rgba(255,187,0,0.15)',
                          boxShadow: '0 34px 58px -42px rgba(0,0,0,0.68)',
                        },
                      }}
                    >
                      {coverUrl && (
                        <Box
                          component="img"
                          src={resolveImageUrl(coverUrl)}
                          alt={service.title}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: { xs: 400, sm: 320 },
                            objectFit: 'cover',
                            backgroundColor: 'rgba(20,20,40,0.5)',
                          }}
                          onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {service.title}
                        </Typography>
                        {((service as any).description) && (
                          <Typography variant="body2" color="rgba(255,255,255,0.72)" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                            {(service as any).description}
                          </Typography>
                        )}
                      </CardContent>
                      {href && (
                        <Button
                          variant="text"
                          color="inherit"
                          component="span"
                          sx={{ py: 1.2, textTransform: 'none', fontWeight: 600, color: '#ffbb00' }}
                        >
                          Подробнее →
                        </Button>
                      )}
                    </MotionCard>
                  </CardWrapper>
                </Grid>
              );
            })}
          </Grid>
        </MotionBox>
      )}

      {subscribeItems && subscribeItems.length > 0 && (
        <MotionBox {...sectionAnimation(0.7)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 2 }}>
            {contentJson.subscribe?.title || 'Следующий шаг'}
          </Typography>
          {contentJson.subscribe?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {(contentJson.subscribe as any).description}
            </Typography>
          )}
          <Grid container spacing={3}>
            {subscribeItems.map((item, idx) => (
              <Grid item xs={12} sm={6} md={Math.min(12 / Math.max(subscribeItems.length, 1), 4)} key={item.title || idx}>
                <MotionPaper
                  {...sectionAnimation(0.72 + idx * 0.05)}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    bgcolor: 'rgba(17,18,36,0.72)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  {(item as any).description && (
                     <Typography variant="body2" color="rgba(255,255,255,0.72)" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {(item as any).description}
                     </Typography>
                   )}
                  {item.linkText && item.linkUrl && (
                    <Button
                      variant="contained"
                      onClick={() => handleSmartNavigate(item.linkUrl)}
                      sx={{ mt: 'auto', textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#ffbb00', color: '#141414', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}
                    >
                      {item.linkText}
                    </Button>
                  )}
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {/* Отзывы клиентов по данной услуге */}
      {productReviews.length > 0 && (
        <MotionBox {...sectionAnimation(0.68)} sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 1 }}>
            Отзывы клиентов
          </Typography>
          <Typography variant="body1" color="rgba(255,255,255,0.65)" sx={{ mb: 4 }}>
            {productReviews.length} отзыв{productReviews.length > 4 ? 'ов' : productReviews.length > 1 ? 'а' : ''} по данной услуге
          </Typography>
          <Grid container spacing={3}>
            {productReviews.slice(0, 6).map((review: any, idx: number) => (
              <Grid item xs={12} md={6} key={review.id}>
                <MotionPaper
                  {...sectionAnimation(0.7 + idx * 0.04)}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    bgcolor: 'rgba(17,18,36,0.78)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: 'rgba(255,187,0,0.15)', fontSize: '1rem', fontWeight: 600 }}>
                      {review.author?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
                          {review.author}
                        </Typography>
                        {review.is_verified && (
                          <Chip label="✓" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(76,175,80,0.2)', color: '#66bb6a' }} />
                        )}
                      </Box>
                      {(review.author_position || review.author_company) && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {review.author_position}{review.author_company ? `, ${review.author_company}` : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Rating value={review.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#ffb300' } }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, flexGrow: 1 }}>
                    {review.text.length > 250 ? review.text.slice(0, 250) + '…' : review.text}
                  </Typography>
                  {review.source && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                      {review.source}
                    </Typography>
                  )}
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/reviews')}
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', '&:hover': { borderColor: 'rgba(255,187,0,0.4)' } }}
            >
              Все отзывы →
            </Button>
          </Box>
        </MotionBox>
      )}

      {faqItems && faqItems.length > 0 && (
        <MotionBox {...sectionAnimation(0.7)} sx={{ mt: 8 }}>
          {faqSection?.title && (
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 2 }}>
              {faqSection.title}
            </Typography>
          )}
          {faqSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {faqSection.description}
            </Typography>
          )}
          <Box sx={{ maxWidth: 900 }}>
            {faqItems.map((item, idx) => (
              <MotionAccordion
                key={idx}
                {...sectionAnimation(0.72 + idx * 0.02)}
                defaultExpanded={false}
                disableGutters
                elevation={0}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(30,32,56,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  '&:before': { display: 'none' },
                  '& .MuiAccordionSummary-root': {
                    minHeight: 64,
                    '&.Mui-expanded': {
                      minHeight: 64,
                    },
                  },
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMore htmlColor="rgba(255,255,255,0.7)" />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 2,
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </MotionAccordion>
            ))}
          </Box>
        </MotionBox>
      )}

      {/* CTA блок после FAQ */}
      {hasHeaderBlock && (
        <MotionPaper
          {...sectionAnimation(0.75)}
          elevation={0}
          sx={{
            mt: 8,
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 40px 60px -45px rgba(0,0,0,0.55)',
          }}
        >
          {headerSection?.title && (
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 2 }}>
              {headerSection.title}
            </Typography>
          )}
          {headerSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.72)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {headerSection.description}
            </Typography>
          )}
          {(headerSection?.primaryButtonText || headerSection?.secondaryButtonText) && (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {headerSection?.primaryButtonText && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setContactFormOpen(true)}
                  sx={{ px: 4, py: 1.4, borderRadius: 999, textTransform: 'none', fontWeight: 700, bgcolor: '#ffbb00', color: '#141414', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}
                >
                  {headerSection.primaryButtonText}
                </Button>
              )}
              {/* secondaryButton removed from CTA — only primary CTA here */}
            </Stack>
          )}
        </MotionPaper>
      )}


      {(cases && cases.length > 0) && <Divider sx={{ my: 8, borderColor: 'rgba(255,255,255,0.08)' }} />}

      {/* Примеры работ (кейсы) */}
      {cases && cases.length > 0 && (
        <MotionBox {...sectionAnimation(0.78)} sx={{ mb: 6 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>
            Примеры работ
          </Typography>
          <Grid container spacing={3}>
            {cases.map((caseItem: any, idx: number) => (
              <Grid item xs={12} sm={6} md={4} key={caseItem.slug}>
                <MotionCard
                  {...sectionAnimation(0.8 + idx * 0.05)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    position: 'relative',
                    bgcolor: 'rgba(17,18,36,0.78)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                    boxShadow: '0 32px 56px -46px rgba(0,0,0,0.66)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.02)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 42px 62px -42px rgba(0,0,0,0.7)',
                    },
                  }}
                  onClick={() => {
                    trackProductEvent(product.slug, 'case_view', { caseSlug: caseItem.slug });
                    navigate(`/cases/${caseItem.slug}`);
                  }}
                >
                  <Box
                    component="img"
                    src={resolveImageUrl(caseItem.heroImageUrl)}
                    alt={caseItem.title}
                    loading="lazy"
                    sx={{ width: '100%', height: 210, objectFit: 'cover', backgroundColor: 'grey.200', filter: 'brightness(0.92)' }}
                    onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = fallbackImageUrl();
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {caseItem.title}
                    </Typography>
                    {caseItem.summary && (
                      <Typography variant="body2" color="rgba(255,255,255,0.72)" sx={{ flexGrow: 1 }}>
                        {caseItem.summary}
                      </Typography>
                    )}
                    <Button
                      size="medium"
                      endIcon={<Visibility />}
                      sx={{
                        alignSelf: 'flex-start',
                        mt: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: '#ffbb00',
                      }}
                    >
                      Смотреть кейс
                    </Button>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}


      {/* CTA блок внизу страницы */}
      <Dialog open={contactFormOpen} onClose={() => setContactFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Заказать услугу: {product.title}
          <IconButton
            onClick={() => setContactFormOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleContactSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Имя"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Телефон"
              type="tel"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Сообщение"
              multiline
              rows={4}
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContactFormOpen(false)}>Отмена</Button>
            <Button type="submit" variant="contained" startIcon={<Send />} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
              Отправить
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Лайтбокс изображений */}
      <Dialog
        open={lightboxIndex !== null}
        onClose={closeLightbox}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.94)',
            '& .MuiDialogContent-root': { p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          },
        }}
      >
        <IconButton
          onClick={closeLightbox}
          sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2, color: '#fff', '&:hover': { color: '#ffbb00' } }}
          size="large"
        >
          <Close />
        </IconButton>
        {allImages.length > 1 && (
          <>
            <IconButton
              onClick={lightboxPrev}
              sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, color: '#fff', '&:hover': { color: '#ffbb00' } }}
              size="large"
            >
              <NavigateBefore sx={{ fontSize: 48 }} />
            </IconButton>
            <IconButton
              onClick={lightboxNext}
              sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, color: '#fff', '&:hover': { color: '#ffbb00' } }}
              size="large"
            >
              <NavigateNext sx={{ fontSize: 48 }} />
            </IconButton>
          </>
        )}
        <DialogContent>
          {lightboxIndex !== null && allImages[lightboxIndex] && (
            <Box
              component="img"
              src={resolveImageUrl(allImages[lightboxIndex])}
              alt={`${product.title} ${lightboxIndex + 1}`}
              onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
              sx={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        {lightboxIndex !== null && allImages.length > 1 && (
          <Typography sx={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            {lightboxIndex + 1} / {allImages.length}
          </Typography>
        )}
      </Dialog>
        </Container>
      </Box>
    </>
  );
}

