import { useMemo, useEffect, useRef, SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

interface Category {
  slug: string;
  name: string;
}

interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  body?: string;
  contentHtml?: string;
  content_html?: string;
  categorySlug?: string;
  category_slug?: string;
  cover_image_url?: string;
  coverImageUrl?: string;
  seo?: {
    ogImageUrl?: string;
    og_image_url?: string;
  };
  og_image_url?: string;
  ogImageUrl?: string;
  publishedAt?: string;
  published_at?: string;
  createdAt?: string;
  created_at?: string;
}

interface BlogPostsListProps {
  posts: BlogPost[];
  selectedCategory: string;
  categories?: Category[];
}

/**
 * Карточки статей в стиле карточек кейсов (PortfolioPage)
 */
export function BlogPostsList({ posts, selectedCategory, categories = [] }: BlogPostsListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCategoryRef = useRef<string>(selectedCategory);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) return [];
    if (selectedCategory === 'all') return posts;
    return posts.filter((post) => {
      const catSlug = post.categorySlug || post.category_slug || '';
      return catSlug === selectedCategory;
    });
  }, [posts, selectedCategory]);

  const getCategoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug;

  useEffect(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('.blog-item');
    items.forEach((item) => {
      const htmlItem = item as HTMLElement;
      htmlItem.style.opacity = '0';
      htmlItem.style.transform = 'translateY(24px)';
      htmlItem.style.transition = 'none';
    });
    previousCategoryRef.current = selectedCategory;
    const animate = () => {
      items.forEach((item, index) => {
        const htmlItem = item as HTMLElement;
        htmlItem.style.transition = 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        setTimeout(() => {
          htmlItem.style.opacity = '1';
          htmlItem.style.transform = 'translateY(0)';
        }, index * 40);
      });
    };
    requestAnimationFrame(() => setTimeout(animate, 20));
  }, [filteredPosts, selectedCategory]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getPreviewImage = (post: BlogPost): string => {
    const coverImage = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');
    const ogImage = resolveImageUrl(
      post.seo?.ogImageUrl || post.seo?.og_image_url || post.og_image_url || post.ogImageUrl || '',
      ''
    );
    return coverImage || ogImage || fallbackImageUrl();
  };

  const getExcerpt = (post: BlogPost): string => {
    const postBody = post.body || post.contentHtml || post.content_html || '';
    if (!postBody) return '';
    const text = postBody.replace(/<[^>]*>/g, '').trim();
    return text.length > 140 ? text.substring(0, 140) + '…' : text;
  };

  if (filteredPosts.length === 0) {
    return (
      <Box ref={containerRef} sx={{ mt: 6 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 8 }}>
          Статей в этой категории пока нет
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        gap: { xs: 2, sm: 2.5, lg: 3 },
        mt: { xs: 4, sm: 5 },
      }}
    >
      {filteredPosts.map((post) => {
        const categorySlug = post.categorySlug || post.category_slug || '';
        const previewImage = getPreviewImage(post);
        const excerpt = getExcerpt(post);
        const publishedDate = formatDate(
          post.publishedAt || post.published_at || post.createdAt || post.created_at
        );
        const hasImage = !!(
          post.cover_image_url ||
          post.coverImageUrl ||
          post.seo?.ogImageUrl ||
          post.seo?.og_image_url ||
          post.og_image_url ||
          post.ogImageUrl
        );

        return (
          <Link
            key={post.id || post.slug}
            to={`/blog/${post.slug}`}
            className="blog-item"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              minWidth: 0,
              opacity: 0,
              transform: 'translateY(24px)',
            }}
          >
            <Box
              sx={{
                height: { xs: 320, sm: 360, md: 400 },
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color 0.4s, transform 0.4s',
                '&:hover': { borderColor: 'rgba(255,187,0,0.3)', transform: 'translateY(-6px)' },
                '&:hover .blog-overlay': { opacity: 1 },
              }}
            >
              {hasImage ? (
                <Box
                  component="img"
                  src={previewImage}
                  alt={post.title}
                  loading="lazy"
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).src = fallbackImageUrl();
                  }}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    bgcolor: 'rgba(30,30,30,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(255,255,255,0.06)' }}>
                    {(post.title || 'СТ').substring(0, 2).toUpperCase()}
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                }}
              />

              <Box
                className="blog-overlay"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: 0,
                  transition: 'opacity 0.4s',
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    color: '#ffbb00',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  Читать статью
                </Typography>
              </Box>

              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: { xs: 2, md: 2.5 },
                  zIndex: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
                  {categorySlug && (
                    <Chip
                      label={getCategoryName(categorySlug)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,187,0,0.15)',
                        color: '#ffbb00',
                        fontWeight: 600,
                      }}
                    />
                  )}
                  {publishedDate && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}
                    >
                      {publishedDate}
                    </Typography>
                  )}
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    fontSize: { xs: '1rem', md: '1.15rem' },
                    lineHeight: 1.25,
                    mb: 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.title}
                </Typography>
                {excerpt && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.55)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                      fontSize: '0.85rem',
                    }}
                  >
                    {excerpt}
                  </Typography>
                )}
              </Box>
            </Box>
          </Link>
        );
      })}
    </Box>
  );
}
