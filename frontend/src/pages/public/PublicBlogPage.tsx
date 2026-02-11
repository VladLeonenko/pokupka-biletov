import { useQuery } from '@tanstack/react-query';
import { listPublicBlogPosts, listPublicBlogCategories } from '@/services/publicApi';
import { useState } from 'react';
import { Box, CircularProgress, Container } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { BlogFilters } from '@/components/blog/BlogFilters';
import { BlogPostsList } from '@/components/blog/BlogPostsList';

export function PublicBlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: posts = [], isLoading: loadingPosts } = useQuery({ queryKey: ['public-blog-posts'], queryFn: listPublicBlogPosts });
  const { data: categories = [], isLoading: loadingCategories } = useQuery({ queryKey: ['public-blog-categories'], queryFn: listPublicBlogCategories });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/blog';

  if (loadingPosts || loadingCategories) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
        <CircularProgress sx={{ color: '#ffbb00' }} />
      </Box>
    );
  }

  return (
    <>
      <SeoMetaTags
        title="Блог веб-студии PrimeCoder — статьи о разработке, дизайне и маркетинге"
        description="Полезные статьи о создании сайтов, веб-дизайне, SEO-продвижении и маркетинге."
        keywords="блог, статьи, веб-разработка, дизайн, маркетинг, SEO, PrimeCoder"
        url={currentUrl}
      />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 12, md: 14 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Блог" title="Полезные материалы" description="Статьи о разработке, дизайне, SEO и маркетинге от команды PrimeCoder." decoText="BLOG" />
          <Box data-anim="fade-up">
            <BlogFilters categories={categories} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          </Box>
          <Box data-anim="fade-up">
            <BlogPostsList posts={posts} selectedCategory={selectedCategory} />
          </Box>
        </Container>
      </Box>
    </>
  );
}
