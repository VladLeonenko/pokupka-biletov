import { useQuery } from '@tanstack/react-query';
import { listPublicBlogPosts, listPublicBlogCategories } from '@/services/publicApi';
import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Container, Button, Typography } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { BlogFilters } from '@/components/blog/BlogFilters';
import { BlogPostsList } from '@/components/blog/BlogPostsList';

const LIMIT = 12;

export function PublicBlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: loadingPosts } = useQuery({
    queryKey: ['public-blog-posts', selectedCategory, page],
    queryFn: () => listPublicBlogPosts({ limit: LIMIT, offset: page * LIMIT, category: selectedCategory }),
  });
  const { data: categories = [], isLoading: loadingCategories } = useQuery({ queryKey: ['public-blog-categories'], queryFn: listPublicBlogCategories });

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    if (page > 0 && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  useEffect(() => {
    setPage(0);
  }, [selectedCategory]);

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
        title="Блог о создании сайтов и SEO | PrimeCoder"
        description="Статьи о разработке сайтов, продвижении, рекламе. Практические советы от практиков. Читайте — применяйте в бизнесе."
        keywords="блог веб-разработка, статьи про SEO, создание сайта советы, маркетинг статьи"
        url={currentUrl}
      />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Блог" title="Полезные материалы" description="Статьи о разработке, дизайне, SEO и маркетинге от команды PrimeCoder." decoText="BLOG" />
          <Box data-anim="fade-up">
            <BlogFilters categories={categories} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          </Box>
          <Box ref={listRef} data-anim="fade-up">
            <BlogPostsList posts={posts} selectedCategory="all" categories={categories} />
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 5 }}>
                <Button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: '#ffbb00' } }}
                >
                  Назад
                </Button>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {page + 1} / {totalPages}
                </Typography>
                <Button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: '#ffbb00' } }}
                >
                  Далее
                </Button>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
}
