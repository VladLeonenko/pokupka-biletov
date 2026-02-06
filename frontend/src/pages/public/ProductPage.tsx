import { useState, useEffect, SyntheticEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, Container, Typography, Button, Card, CardContent, 
  Grid, TextField, Chip, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, IconButton, ImageList, ImageListItem,
  Divider, Paper, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Stack
} from '@mui/material';
import { keyframes } from '@mui/system';
import { 
  ShoppingCart, Favorite, Share, 
  ArrowBack, Send, Close, Visibility, ExpandMore
} from '@mui/icons-material';
import { ProductItem } from '@/types/cms';
import { submitForm } from '@/services/cmsApi';
import { getPublicProduct, getPublicCase } from '@/services/publicApi';
import { trackProductEvent, addToCart, addToWishlist } from '@/services/ecommerceApi';
import { useAuth } from '@/auth/AuthProvider';
import DOMPurify from 'dompurify';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ProductJsonLd } from '@/components/common/ProductJsonLd';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { motion } from 'framer-motion';
import { TeamCarousel } from '@/components/public/TeamCarousel';
import { useToast } from '@/components/common/ToastProvider';
import { PriceCalculator } from '@/components/products/PriceCalculator';
import { TariffQuiz } from '@/components/products/TariffQuiz';
import { SocialProofs } from '@/components/products/SocialProofs';

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);
const MotionStack = motion.create(Stack);
const MotionCard = motion.create(Card);
const MotionAccordion = motion.create(Accordion);
const MotionTypography = motion.create(Typography);

const floatingAurora = keyframes`
  0% {
    transform: translate3d(-6%, -4%, 0) scale(1);
  }
  50% {
    transform: translate3d(5%, 6%, 0) scale(1.08);
  }
  100% {
    transform: translate3d(-6%, -4%, 0) scale(1);
  }
`;

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

  useEffect(() => {
    if (product) {
      trackProductEvent(product.slug, 'view');
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await trackProductEvent(product.slug, 'add_to_cart');
      await addToCart(product.slug, 1);
      // Показываем уведомление об успешном добавлении
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Товар добавлен в корзину');
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при добавлении товара в корзину');
      }
    }
  };

  const handleAddToWishlist = async () => {
    if (!product || !user) {
      navigate('/admin/login');
      return;
    }
    try {
      await trackProductEvent(product.slug, 'add_to_wishlist');
      await addToWishlist(product.slug);
      // Показываем уведомление об успешном добавлении
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Товар добавлен в избранное');
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при добавлении товара в избранное');
      }
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
      // Используем форму обратной связи из CMS
      // Если форма 'contact' не существует, API создаст её автоматически или вернет ошибку
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
  const contentJson = product.contentJson || {};
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
  const relatedServices = relatedServicesSection?.services?.filter((service) => service && (service.title || service.link));
  const subscribeItems = contentJson.subscribe?.items?.filter((item) => item && (item.title || item.description || item.linkText));
  const faqSection = contentJson.faq;
  const faqItems = faqSection?.items?.filter((item) => item && (item.question || item.answer));
  const sectionAnimation = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
    viewport: { once: true, amount: 0.2 },
  });

  const handleSmartNavigate = (url?: string) => {
    if (!url) return;
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

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
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          backgroundColor: '#141414',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 }, position: 'relative', zIndex: 1 }}>
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
              bgcolor: 'rgba(20, 24, 44, 0.82)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 40px 70px -45px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.02)',
              backdropFilter: 'blur(18px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 1,
                borderRadius: 3.5,
                border: '1px solid rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: '-30%',
                background: 'radial-gradient(circle at 30% 30%, rgba(120, 82, 255, 0.18) 0%, transparent 50%)',
                opacity: 0.6,
                animation: `${floatingAurora} 24s ease-in-out infinite`,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                mb: product.gallery && product.gallery.length > 0 ? 3 : 0,
                background: 'linear-gradient(145deg, rgba(42,46,74,0.84), rgba(18,20,40,0.94))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 18% 22%, rgba(120, 82, 255, 0.22) 0%, transparent 45%), radial-gradient(circle at 82% 28%, rgba(255,117,168,0.18) 0%, transparent 52%)',
                  mixBlendMode: 'screen',
                  opacity: 0.8,
                }}
              />
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
                  transition: 'transform 0.6s ease',
                  '&:hover': { transform: 'scale(1.03)' },
                }}
                onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = fallbackImageUrl();
                }}
              />
            </Box>

            {product.gallery && product.gallery.length > 0 && (
              <ImageList cols={3} gap={8} sx={{ m: 0 }}>
                {product.gallery.map((img, idx) => (
                  <ImageListItem key={idx} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                    <Box
                      component="img"
                      src={resolveImageUrl(img)}
                      alt={`${product.title} ${idx + 1}`}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                      onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = fallbackImageUrl();
                      }}
                      onMouseOver={(e: SyntheticEvent<HTMLImageElement, Event>) => ((e.target as HTMLImageElement).style.transform = 'scale(1.06)')}
                      onMouseOut={(e: SyntheticEvent<HTMLImageElement, Event>) => ((e.target as HTMLImageElement).style.transform = 'scale(1)')}
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
                background: 'linear-gradient(135deg, rgba(103,95,255,0.16), rgba(255,117,168,0.12))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(214,219,255,0.78)',
                textTransform: 'uppercase',
                letterSpacing: '0.32em',
                fontSize: '0.7rem',
                fontWeight: 600,
                backdropFilter: 'blur(12px)',
                width: 'fit-content',
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(120deg, #816CFF, #FF7AB0)' }} />
              Услуга Primecoder
            </MotionBox>
            <Box>
              <MotionTypography
                {...sectionAnimation(0.26)}
                variant="h2"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.045em',
                  fontSize: { xs: '2.4rem', md: '3.3rem' },
                  lineHeight: { xs: 1.15, md: 1.1 },
                  fontFamily: '"Manrope","Inter","Roboto","Helvetica",sans-serif',
                  background: 'linear-gradient(120deg, rgba(241,244,255,1) 0%, rgba(168,179,255,0.92) 45%, rgba(255,198,220,0.88) 100%)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
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
                    color: 'rgba(235,236,255,0.78)',
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
                  bgcolor: 'rgba(20,24,44,0.78)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 24px 45px -30px rgba(0,0,0,0.56)',
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg,#816CFF,#64E6FF)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(215,218,255,0.78)', fontWeight: 500 }}>
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
                  bgcolor: 'rgba(20,24,44,0.78)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 24px 45px -30px rgba(0,0,0,0.56)',
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg,#FF7AA0,#FFB66D)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(215,218,255,0.78)', fontWeight: 500 }}>
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
                bgcolor: 'rgba(32, 28, 62, 0.75)',
                border: '1px solid rgba(117,116,255,0.28)',
                color: '#fff',
                maxWidth: 420,
                boxShadow: '0 28px 50px -38px rgba(0,0,0,0.75)',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(130deg, rgba(103,95,255,0.38) 0%, rgba(255,123,160,0.22) 52%, transparent 100%)',
                  opacity: 0.6,
                  mixBlendMode: 'screen',
                  pointerEvents: 'none',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 2,
                  borderRadius: 2.6,
                  border: '1px solid rgba(255,255,255,0.12)',
                  pointerEvents: 'none',
                },
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
                  fontFamily: '"Manrope","Inter","Roboto","Helvetica",sans-serif',
                  background: 'linear-gradient(120deg, #F8F9FF 0%, #B8C1FF 55%, #FFD4EC 100%)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
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
                  fontWeight: 600,
                  textTransform: 'none',
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
                  borderColor: 'rgba(103,95,255,0.4)',
                  color: 'rgba(149,140,255,0.92)',
                  '&:hover': { borderColor: 'rgba(103,95,255,0.6)', bgcolor: 'rgba(103,95,255,0.08)' },
                }}
              >
                Поделиться
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => setContactFormOpen(true)}
                sx={{
                  minWidth: 220,
                  flexGrow: 1,
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: 'linear-gradient(135deg, rgba(255,99,146,0.95), rgba(255,143,102,0.92))',
                  boxShadow: '0 18px 30px -18px rgba(255,120,150,0.55)',
                  '&:hover': {
                    bgcolor: 'linear-gradient(135deg, rgba(255,99,146,1), rgba(255,143,102,1))',
                    boxShadow: '0 22px 36px -18px rgba(255,120,150,0.65)',
                  },
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
                        borderLeft: '3px solid rgba(129,108,255,0.5)',
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
                            background: 'linear-gradient(135deg, #816CFF 0%, #64E6FF 100%)',
                            boxShadow: '0 0 12px rgba(129,108,255,0.45)',
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

      {hasHeaderBlock && (
      )}

      {hasDescriptionBlock && (
        <MotionBox
          {...sectionAnimation(0.3)}
          sx={{ mt: 6, maxWidth: 820 }}
        >
          {contentJson.description?.title && (
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
          <PriceCalculator
            basePrice={product.priceCents}
            productSlug={product.slug}
            onCalculate={(price) => {
              setContactFormOpen(true);
              setContactForm((prev) => ({
                ...prev,
                message: prev.message || `Рассчитанная стоимость: ${Math.round(price / 100).toLocaleString('ru-RU')} ₽`,
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
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                      background: 'linear-gradient(140deg, rgba(120,82,255,0.16) 0%, rgba(255,118,169,0.12) 48%, transparent 100%)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(129,108,255,0.38)',
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
                        {tariff.subtitle}
                      </Typography>
                    )}
                    {tariff.price && (
                      <Typography variant="h4" color="primary" sx={{ mb: 2, fontWeight: 700 }}>
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
                    color="primary"
                    fullWidth
                    sx={{ mt: 3, py: 1.2, borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
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
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                      background: 'linear-gradient(130deg, rgba(120,82,255,0.12) 0%, rgba(255,122,160,0.12) 50%, transparent 100%)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'rgba(129,108,255,0.35)',
                      boxShadow: '0 26px 45px -35px rgba(0,0,0,0.65)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        minWidth: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(129,108,255,0.3), rgba(255,122,160,0.3))',
                        border: '2px solid rgba(129,108,255,0.5)',
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        color: 'rgba(255,255,255,0.95)',
                      }}
                    >
                      {step.number || idx + 1}
                    </Box>
                    <Typography variant="overline" sx={{ fontSize: '0.85rem', color: 'rgba(149,140,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Этап {step.number || idx + 1}
                    </Typography>
                  </Box>
                  {step.title && (
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5, fontSize: { xs: '1.25rem', md: '1.5rem' }, lineHeight: 1.3 }}>
                      {step.title}
                    </Typography>
                  )}
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

      {statsItems && statsItems.length > 0 && (
        <MotionBox {...sectionAnimation(0.5)} sx={{ mt: 8 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {statsSection?.title || 'Наши результаты'}
          </Typography>
          {statsSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {(statsSection as any).description}
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
                      background: 'radial-gradient(circle at 50% 20%, rgba(120,82,255,0.22) 0%, transparent 55%)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(149,140,255,0.4)',
                      boxShadow: '0 45px 60px -40px rgba(0,0,0,0.6)',
                    },
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      mb: 1,
                      fontWeight: 700,
                      color: 'rgba(149,140,255,0.95)',
                      textShadow: '0 0 20px rgba(120, 82, 255, 0.45)',
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
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {relatedServicesSection?.title || 'Похожие услуги'}
          </Typography>
          {relatedServicesSection?.description && (
            <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 3, whiteSpace: 'pre-line', maxWidth: 820 }}>
              {(relatedServicesSection as any).description}
            </Typography>
          )}
          <Grid container spacing={3}>
            {relatedServices.map((service, idx) => (
              <Grid item xs={12} sm={6} md={Math.min(12 / Math.max(relatedServices.length, 1), 4)} key={service.title || idx}>
                <MotionCard
                  {...sectionAnimation(0.66 + idx * 0.05)}
                  sx={{
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
                      background: 'linear-gradient(145deg, rgba(120,82,255,0.12) 0%, rgba(255,122,160,0.12) 45%, transparent 100%)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: 'rgba(149,140,255,0.32)',
                      boxShadow: '0 34px 58px -42px rgba(0,0,0,0.68)',
                    },
                  }}
                >
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
                  {service.link && (
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => handleSmartNavigate(service.link)}
                      sx={{ py: 1.2, textTransform: 'none', fontWeight: 600, color: 'rgba(149,140,255,0.9)' }}
                    >
                      Перейти
                    </Button>
                  )}
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      )}

      {subscribeItems && subscribeItems.length > 0 && (
        <MotionBox {...sectionAnimation(0.7)} sx={{ mt: 8 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                      color="primary"
                      onClick={() => handleSmartNavigate(item.linkUrl)}
                      sx={{ mt: 'auto', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
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

      {faqItems && faqItems.length > 0 && (
        <MotionBox {...sectionAnimation(0.7)} sx={{ mt: 8 }}>
          {faqSection?.title && (
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
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

      {(cases && cases.length > 0) && <Divider sx={{ my: 8, borderColor: 'rgba(255,255,255,0.08)' }} />}

      {/* Примеры работ (кейсы) */}
      {cases && cases.length > 0 && (
        <MotionBox {...sectionAnimation(0.78)} sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                      background: 'linear-gradient(145deg, rgba(120,82,255,0.14) 0%, rgba(255,122,160,0.14) 52%, transparent 100%)',
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
                        color: 'rgba(149,140,255,0.9)',
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

      {/* Форма обратной связи */}
      <Dialog open={contactFormOpen} onClose={() => setContactFormOpen(false)} maxWidth="sm" fullWidth>
        <MotionPaper
          {...sectionAnimation(0.25)}
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
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                  sx={{ px: 4, py: 1.4, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                >
                  {headerSection.primaryButtonText}
                </Button>
              )}
              {headerSection?.secondaryButtonText && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => setContactFormOpen(true)}
                  sx={{ px: 4, py: 1.4, borderRadius: 999, textTransform: 'none', fontWeight: 600, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)', '&:hover': { borderColor: 'rgba(255,255,255,0.5)' } }}
                >
                  {headerSection.secondaryButtonText}
                </Button>
              )}
            </Stack>
          )}
        </MotionPaper>
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
            <Button type="submit" variant="contained" startIcon={<Send />}>
              Отправить
            </Button>
          </DialogActions>
        </form>
      </Dialog>
        </Container>
      </Box>
    </>
  );
}

