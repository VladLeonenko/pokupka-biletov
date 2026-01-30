import { useQuery } from '@tanstack/react-query';
import { getPublicBlogPost } from '@/services/publicApi';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { BlogPostHeader } from '@/components/blog/BlogPostHeader';
import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { BlogPostStyles } from '@/components/blog/BlogPostStyles';
import { InlineCarouselSlide } from '@/components/public/InlineImageCarousel';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { useCursor } from '@/hooks/useCursor';

/**
 * Страница отдельной статьи блога - полностью на React компонентах
 * Структура: заголовок статьи, контент, карусель (опционально)
 */
export function PublicBlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  
  // Используем кастомный курсор
  useCursor(`/blog/${slug}`);

  useEffect(() => {
    document.body.setAttribute('data-page', `/blog/${slug}`);
    
    // Убеждаемся, что стили загружены
    const ensureStylesLoaded = () => {
      const pageContent = document.querySelector('.page-content');
      if (pageContent) {
        pageContent.classList.add('styles-loaded');
      }
    };
    
    // Проверяем, загружены ли уже стили
    const styleLoaded = document.querySelector('link[href*="style.min.css"]');
    if (styleLoaded) {
      ensureStylesLoaded();
    } else {
      // Если стили не загружены, загружаем их
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/legacy/css/style.min.css';
      styleLink.media = 'all';
      styleLink.onload = ensureStylesLoaded;
      document.head.appendChild(styleLink);
      
      // Fallback: если стили не загрузились за 200ms, показываем контент все равно
      setTimeout(ensureStylesLoaded, 200);
    }
  }, [slug]);
  
  const { data: post, isLoading } = useQuery({ 
    queryKey: ['public-blog-post', slug], 
    queryFn: () => getPublicBlogPost(slug || ''),
    enabled: !!slug,
    staleTime: 30000,
  });

  // Подготовка данных для карусели
  const carouselData = useMemo(() => {
    if (!post) {
      return { enabled: false, title: '', slides: [] as InlineCarouselSlide[] };
    }
    const rawItems = post.carousel_items ?? post.carouselItems ?? [];
    let parsed: any[] = [];
    if (Array.isArray(rawItems)) {
      parsed = rawItems;
    } else if (typeof rawItems === 'string') {
      try {
        const parsedJson = JSON.parse(rawItems);
        if (Array.isArray(parsedJson)) {
          parsed = parsedJson;
        }
      } catch {
        parsed = [];
      }
    }
    const slides: InlineCarouselSlide[] = parsed
      .map((item) => {
        if (!item) return null;
        const imageUrl = resolveImageUrl(item.imageUrl || item.image_url || '', '');
        if (!imageUrl) return null;
        return {
          imageUrl,
          caption: item.caption ?? item.caption_html ?? undefined,
          alt: item.alt ?? item.alt_text ?? undefined,
          linkUrl: item.linkUrl ?? item.link_url ?? undefined,
        };
      })
      .filter(Boolean) as InlineCarouselSlide[];
    const enabled = Boolean((post.carousel_enabled ?? post.carouselEnabled) && slides.length > 0);
    const title = post.carousel_title ?? post.carouselTitle ?? '';
    return { enabled, title, slides };
  }, [post]);

  // Подготовка данных для компонентов
  const postData = useMemo(() => {
    if (!post) return null;

    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      } catch {
        return null;
      }
    };

    const postTitle = post.title || 'Без названия';
    const postBody = post.body || post.contentHtml || post.content_html || '';
    const postDate = formatDate(post.created_at || post.createdAt || post.published_at || post.publishedAt);
    const categoryName = post.category_slug || post.categorySlug || '';
    const coverImage = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');

    return {
      title: postTitle,
      body: postBody,
      date: postDate,
      categoryName,
      coverImageUrl: coverImage || null,
    };
  }, [post]);

  // SEO данные
  const seoData = useMemo(() => {
    if (!post) return null;

    const s = post.seo || {} as any;
    const postTitle = post.title || 'Без названия';
    const coverImage = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');
    const ogImage = coverImage || resolveImageUrl(
      post.seo?.ogImageUrl || post.seo?.og_image_url || post.og_image_url || post.ogImageUrl || '',
      ''
    );

    return {
      title: s.metaTitle || s.meta_title || postTitle,
      description: s.metaDescription || s.meta_description || '',
      keywords: s.metaKeywords || s.meta_keywords || '',
      ogTitle: s.ogTitle || s.og_title || postTitle,
      ogDescription: s.ogDescription || s.og_description || '',
      ogImage: ogImage || '',
      canonicalUrl: typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : `https://primecoder.ru/blog/${slug}`,
    };
  }, [post, slug]);

  if (isLoading) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, pt: '140px' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!post || !postData || !seoData) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ p: 4, textAlign: 'center', pt: '140px' }}>
          <Typography>Статья не найдена или еще не опубликована.</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <BlogPostStyles />
      <SeoMetaTags
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url={seoData.canonicalUrl}
        image={seoData.ogImage}
        ogTitle={seoData.ogTitle}
        ogDescription={seoData.ogDescription}
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
        <div className="container">
          <article className="blog-post">
            <BlogPostHeader
              title={postData.title}
              date={postData.date}
              categoryName={postData.categoryName}
              coverImageUrl={postData.coverImageUrl}
            />
            <BlogPostContent
              contentHtml={postData.body}
              carouselEnabled={carouselData.enabled}
              carouselTitle={carouselData.title}
              carouselSlides={carouselData.slides}
            />
          </article>
        </div>
      </div>
    </>
  );
}

