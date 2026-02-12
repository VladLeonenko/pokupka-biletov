import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicBlogPost } from '@/services/publicApi';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Container } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { BlogBlocksContent } from '@/components/blog/BlogBlocksContent';
import { BlogPostStyles } from '@/components/blog/BlogPostStyles';
import { InlineCarouselSlide } from '@/components/public/InlineImageCarousel';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { ParticleSphere } from '@/components/home/ParticleSphere';
import { ScrollSection, useScrollReveal } from '@/components/home/ScrollAnimations';

export function PublicBlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const mainRef = useRef<HTMLDivElement>(null);
  useScrollReveal(mainRef);

  useEffect(() => {
    document.body.setAttribute('data-page', '/blog');
  }, []);

  const { data: post, isLoading } = useQuery({
    queryKey: ['public-blog-post', slug],
    queryFn: () => getPublicBlogPost(slug || ''),
    enabled: !!slug,
    staleTime: 30000,
  });

  const carouselData = useMemo(() => {
    if (!post) return { enabled: false, title: '', slides: [] as InlineCarouselSlide[] };
    const rawItems = post.carousel_items ?? post.carouselItems ?? [];
    let parsed: any[] = Array.isArray(rawItems) ? rawItems : [];
    if (typeof rawItems === 'string') { try { const j = JSON.parse(rawItems); if (Array.isArray(j)) parsed = j; } catch { /* skip */ } }
    const slides: InlineCarouselSlide[] = parsed.map((item) => {
      if (!item) return null;
      const imageUrl = resolveImageUrl(item.imageUrl || item.image_url || '', '');
      if (!imageUrl) return null;
      return { imageUrl, caption: item.caption ?? item.caption_html ?? undefined, alt: item.alt ?? item.alt_text ?? undefined, linkUrl: item.linkUrl ?? item.link_url ?? undefined };
    }).filter(Boolean) as InlineCarouselSlide[];
    return { enabled: Boolean((post.carousel_enabled ?? post.carouselEnabled) && slides.length > 0), title: post.carousel_title ?? post.carouselTitle ?? '', slides };
  }, [post]);

  const postData = useMemo(() => {
    if (!post) return null;
    const fmt = (d: string | null | undefined) => { if (!d) return null; try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`; } catch { return null; } };
    const cj = post.content_json || (post as any).contentJson || {};
    const rawBlocks = Array.isArray(cj.blocks) ? cj.blocks : [];
    const body = post.body || post.contentHtml || post.content_html || '';
    const hasMeaningfulBlocks = rawBlocks.some((b: any) => {
      const html = (b.content?.html ?? b.content?.text ?? '').trim();
      if (html.length > 0) return true;
      if (b.type === 'intro' && (b.content?.title || b.content?.text)) return true;
      if (b.type === 'image' && b.content?.src) return true;
      if (b.type === 'faq' && Array.isArray(b.content?.items) && b.content.items.length > 0) return true;
      if (['table', 'stats', 'cta'].includes(b.type) && b.content) return true;
      return false;
    });
    const blocks = hasMeaningfulBlocks ? rawBlocks : [];
    return {
      title: post.title || 'Без названия',
      body,
      blocks,
      date: fmt(post.created_at || post.createdAt || post.published_at || post.publishedAt),
      categoryName: post.category_slug || post.categorySlug || '',
      coverImageUrl: resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '') || null,
    };
  }, [post]);

  const seoData = useMemo(() => {
    if (!post) return null;
    const s = post.seo || {} as any;
    const coverImage = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');
    const ogImage = coverImage || resolveImageUrl(s.ogImageUrl || s.og_image_url || post.og_image_url || post.ogImageUrl || '', '');
    return {
      title: s.metaTitle || s.meta_title || post.seo_title || post.title || '',
      description: s.metaDescription || s.meta_description || post.seo_description || '',
      keywords: s.metaKeywords || s.meta_keywords || post.seo_keywords?.join?.(', ') || '',
      ogTitle: s.ogTitle || s.og_title || post.seo_title || post.title || '',
      ogDescription: s.ogDescription || s.og_description || post.seo_description || '',
      ogImage: ogImage || '',
      canonicalUrl: typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : `https://primecoder.ru/blog/${slug}`,
    };
  }, [post, slug]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  if (!post || !postData || !seoData) return <Box sx={{ py: 20, textAlign: 'center' }}><Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Статья не найдена.</Typography></Box>;

  return (
    <>
      <BlogPostStyles />
      <SeoMetaTags title={seoData.title} description={seoData.description} keywords={seoData.keywords} url={seoData.canonicalUrl} image={seoData.ogImage} ogTitle={seoData.ogTitle} ogDescription={seoData.ogDescription} type="article" articleSchema={{ headline: postData.title, datePublished: (post as any).created_at, dateModified: (post as any).updated_at || (post as any).created_at }} />
      <ParticleSphere labelsFromSelector=".blog-post-content" />
      <Box ref={mainRef} component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <ScrollSection visibleOnLoad>
          <Container maxWidth="lg">
            {postData.coverImageUrl && (
              <Box component="img" src={postData.coverImageUrl} alt={postData.title} sx={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 3, mb: 4 }} data-scroll-child />
            )}
            <Box data-scroll-child>
              {postData.date && <Typography variant="overline" sx={{ letterSpacing: '0.2em', color: '#ffbb00' }}>{postData.date}</Typography>}
              <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, mt: 1, mb: 3 }}>
                {postData.title}
              </Typography>
            </Box>
            <Box data-scroll-child sx={{ '& img': { borderRadius: 2, maxWidth: '100%', height: 'auto' }, '& p': { color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, mb: 2 }, '& h2,& h3,& h4': { color: '#fff', mt: 4, mb: 1.5 } }}>
              {postData.blocks && postData.blocks.length > 0 ? (
                <BlogBlocksContent blocks={postData.blocks} />
              ) : (
                <BlogPostContent contentHtml={postData.body} carouselEnabled={carouselData.enabled} carouselTitle={carouselData.title} carouselSlides={carouselData.slides} />
              )}
            </Box>
          </Container>
        </ScrollSection>
      </Box>
    </>
  );
}
