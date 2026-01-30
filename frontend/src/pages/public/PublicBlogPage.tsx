import { useQuery } from '@tanstack/react-query';
import { listPublicBlogPosts, listPublicBlogCategories } from '@/services/publicApi';
import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { BlogFilters } from '@/components/blog/BlogFilters';
import { BlogPostsList } from '@/components/blog/BlogPostsList';
import { BackgroundImagesSection } from '@/components/contacts/BackgroundImagesSection';
import { useCursor } from '@/hooks/useCursor';

/**
 * Страница блога - полностью на React компонентах
 * Структура: заголовок, фильтры категорий, список статей, фоновые изображения
 */
export function PublicBlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Используем кастомный курсор
  useCursor('/blog');

  useEffect(() => {
    document.body.setAttribute('data-page', '/blog');
    
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
  }, []);
  
  const { data: posts = [], isLoading: loadingPosts } = useQuery({ 
    queryKey: ['public-blog-posts'], 
    queryFn: listPublicBlogPosts,
  });
  
  const { data: categories = [], isLoading: loadingCategories } = useQuery({ 
    queryKey: ['public-blog-categories'], 
    queryFn: listPublicBlogCategories,
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/blog';

  if (loadingPosts || loadingCategories) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, pt: '140px' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags
        title="Полезные и интересные статьи в блоге веб-студии Primecoder"
        description="Почитайте и поделитесь интересными статьями - в сфере создания сайтов, веб-дизайна, маркетинга, SEO-продвижения и контекстной рекламы"
        keywords="блог, статьи, веб-разработка, веб-дизайн, маркетинг, SEO, контекстная реклама, PrimeCoder"
        url={currentUrl}
        image="https://primecoder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
        <div className="container">
          <BlogHeader />
          <BlogFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          <BlogPostsList posts={posts} selectedCategory={selectedCategory} />
        </div>
        <BackgroundImagesSection />
      </div>
    </>
  );
}

