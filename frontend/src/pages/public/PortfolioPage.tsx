import { useState, useMemo, useRef, useCallback, SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress, Chip, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { listPublicCases } from '@/services/publicApi';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

type Category = 'all' | 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | 'marketing';

const CATS: { val: Category; label: string }[] = [
  { val: 'all', label: 'Все' },
  { val: 'website', label: 'Сайты' },
  { val: 'mobile', label: 'Мобильные' },
  { val: 'ai', label: 'AI' },
  { val: 'seo', label: 'SEO' },
  { val: 'advertising', label: 'Реклама' },
  { val: 'design', label: 'Дизайн' },
  { val: 'marketing', label: 'Маркетинг' },
];

function getCat(c: any): Category {
  if (c.category && ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'].includes(c.category)) return c.category;
  const t = ((c.title || '') + ' ' + (c.summary || '')).toLowerCase();
  const tags = (c.tags || []).join(' ').toLowerCase();
  const all = t + ' ' + tags;
  if (all.includes('ai') || all.includes('boost')) return 'ai';
  if (all.includes('seo') || all.includes('продвижение')) return 'seo';
  if (all.includes('маркетинг') || all.includes('smm')) return 'marketing';
  if (all.includes('реклама') || all.includes('контекст') || all.includes('таргет')) return 'advertising';
  if (all.includes('дизайн') || all.includes('figma') || all.includes('ui/ux')) return 'design';
  if (all.includes('мобил') || all.includes('app') || all.includes('flutter') || all.includes('react native')) return 'mobile';
  return 'website';
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category>('all');
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const { data: cases = [], isLoading } = useQuery({ queryKey: ['publicCases'], queryFn: listPublicCases });
  const filtered = useMemo(() => {
    const f = cat === 'all' ? cases : cases.filter((c: any) => getCat(c) === cat);
    return f;
  }, [cases, cat]);

  const handleCatChange = useCallback((val: Category) => {
    setCat(val);
    setCurrent(0);
  }, []);

  const prev = () => setCurrent((p) => Math.max(0, p - 1));
  const next = () => setCurrent((p) => Math.min(filtered.length - 1, p + 1));
  const handleClick = (slug: string) => navigate(`/cases/${slug}`);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  }

  const VISIBLE = 3; // cards visible at once on desktop

  return (
    <>
      <SeoMetaTags
        title="Портфолио — Примеры работ PrimeCoder"
        description="Портфолио проектов: сайты, приложения, дизайн, SEO, маркетинг."
        keywords="портфолио, кейсы, примеры работ, PrimeCoder"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 12, md: 14 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader
            overline="Портфолио"
            title="Наши кейсы"
            description="Реальные проекты — от разработки сайтов и мобильных приложений до SEO, рекламы и комплексного маркетинга."
            decoText="PORTFOLIO"
          />

          {/* Category filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
            {CATS.map((c) => (
              <Chip
                key={c.val}
                label={c.label}
                onClick={() => handleCatChange(c.val)}
                sx={{
                  bgcolor: cat === c.val ? 'rgba(255,187,0,0.15)' : 'rgba(255,255,255,0.04)',
                  color: cat === c.val ? '#ffbb00' : 'rgba(255,255,255,0.5)',
                  border: '1px solid',
                  borderColor: cat === c.val ? 'rgba(255,187,0,0.4)' : 'transparent',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,187,0,0.1)' },
                }}
              />
            ))}
          </Box>

          {filtered.length > 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', mb: 3, fontSize: '0.85rem' }}>
              {filtered.length} {filtered.length === 1 ? 'проект' : filtered.length < 5 ? 'проекта' : 'проектов'}
            </Typography>
          )}

          {/* Carousel */}
          {filtered.length > 0 ? (
            <>
              <Box sx={{ position: 'relative', overflow: 'hidden', mb: 4 }}>
                <Box
                  ref={trackRef}
                  sx={{
                    display: 'flex',
                    gap: 3,
                    transition: 'transform 0.5s cubic-bezier(0.25,0.8,0.25,1)',
                    transform: `translateX(calc(-${current} * (calc(100% / ${VISIBLE}) + 24px * ${VISIBLE - 1} / ${VISIBLE})))`,
                  }}
                >
                  {filtered.map((c: any, idx: number) => {
                    const imgSrc = resolveImageUrl(c.heroImageUrl || c.donorImageUrl || '');
                    const hasImg = !!imgSrc;
                    return (
                      <Box
                        key={c.slug}
                        onClick={() => handleClick(c.slug)}
                        data-anim-child
                        sx={{
                          flexShrink: 0,
                          width: { xs: '85%', sm: `calc(50% - 12px)`, md: `calc(${100 / VISIBLE}% - ${24 * (VISIBLE - 1) / VISIBLE}px)` },
                          height: { xs: 360, md: 440 },
                          borderRadius: 4,
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.06)',
                          transition: 'border-color 0.4s, transform 0.4s',
                          '&:hover': { borderColor: 'rgba(255,187,0,0.3)', transform: 'translateY(-6px)' },
                          '&:hover .pf-overlay': { opacity: 1 },
                        }}
                      >
                        {hasImg ? (
                          <Box
                            component="img"
                            src={imgSrc}
                            alt={c.title}
                            loading="lazy"
                            onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(30,30,30,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontSize: '4rem', fontWeight: 900, color: 'rgba(255,255,255,0.06)' }}>
                              {(c.title || 'КЕ').substring(0, 2).toUpperCase()}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />

                        <Box
                          className="pf-overlay"
                          sx={{
                            position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            opacity: 0, transition: 'opacity 0.4s', p: 3,
                          }}
                        >
                          <Typography sx={{ color: '#ffbb00', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                            Подробнее
                          </Typography>
                        </Box>

                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: { xs: 2, md: 2.5 }, zIndex: 2 }}>
                          <Chip
                            label={CATS.find((cc) => cc.val === getCat(c))?.label || 'Сайт'}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', fontWeight: 600, mb: 1 }}
                          />
                          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.25, mb: 0.5 }}>
                            {c.title}
                          </Typography>
                          {c.summary && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.summary}
                            </Typography>
                          )}
                          {c.tools && c.tools.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                              {c.tools.slice(0, 4).map((tool: string) => (
                                <Typography key={tool} variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, px: 0.8, py: 0.15 }}>
                                  {tool}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Navigation */}
              {filtered.length > VISIBLE && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <IconButton
                    onClick={prev}
                    disabled={current === 0}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', minWidth: 60, textAlign: 'center' }}>
                    {current + 1} / {Math.max(1, filtered.length - VISIBLE + 1)}
                  </Typography>
                  <IconButton
                    onClick={next}
                    disabled={current >= filtered.length - VISIBLE}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>Кейсы не найдены</Typography>
            </Box>
          )}

          {/* CTA */}
          <Box sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }} data-anim="fade-up">
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 1.5 }}>
              Хотите такой же проект?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
              Расскажите о задаче — подготовим КП за 24 часа.
            </Typography>
            <Box
              component="a"
              href="/new-client"
              sx={{
                display: 'inline-block', bgcolor: '#ffbb00', color: '#141414', fontWeight: 700,
                px: 5, py: 1.5, borderRadius: 2, textDecoration: 'none',
                transition: 'background 0.3s', '&:hover': { bgcolor: '#e5a800', color: '#141414' },
              }}
            >
              Обсудить проект
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
