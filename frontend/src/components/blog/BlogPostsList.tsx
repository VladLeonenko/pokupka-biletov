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
  seo?: { ogImageUrl?: string; og_image_url?: string };
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

type CardSize = 'featured' | 'wide' | 'tall' | 'normal';

function getCardSize(index: number): CardSize {
  if (index === 0) return 'featured';
  if ((index - 1) % 6 === 4) return 'wide'; // 5th, 11th, 17th... после featured
  if ((index - 1) % 3 === 1) return 'tall'; // 2nd, 5th, 8th... — выше обычных
  return 'normal';
}

/**
 * Bento-сетка: featured, wide и normal карточки для динамичного ритма
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
      htmlItem.style.transform = 'translateY(24px) scale(0.98)';
      htmlItem.style.transition = 'none';
    });
    previousCategoryRef.current = selectedCategory;
    const animate = () => {
      items.forEach((item, index) => {
        const htmlItem = item as HTMLElement;
        htmlItem.style.transition =
          `opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s, ` +
          `transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s`;
        htmlItem.style.opacity = '1';
        htmlItem.style.transform = 'translateY(0) scale(1)';
      });
    };
    requestAnimationFrame(() => setTimeout(animate, 50));
  }, [filteredPosts, selectedCategory]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getPreviewImage = (post: BlogPost): string => {
    const cover = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');
    const og = resolveImageUrl(
      post.seo?.ogImageUrl || post.seo?.og_image_url || post.og_image_url || post.ogImageUrl || '',
      ''
    );
    return cover || og || fallbackImageUrl();
  };

  const getExcerpt = (post: BlogPost): string => {
    const body = post.body || post.contentHtml || post.content_html || '';
    const text = body.replace(/<[^>]*>/g, '').trim();
    return text.length > 140 ? text.substring(0, 140) + '…' : text;
  };

  const renderCard = (
    post: BlogPost,
    size: CardSize,
    index: number
  ) => {
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

    const heights: Record<CardSize, Record<string, string>> = {
      featured: { xs: '320px', sm: '380px', md: '420px' },
      wide: { xs: '280px', sm: '320px', md: '360px' },
      tall: { xs: '300px', sm: '350px', md: '390px' },
      normal: { xs: '260px', sm: '300px', md: '340px' },
    };
    const h = heights[size];

    const wrapperSx =
      size === 'featured' || size === 'wide'
        ? { gridColumn: { xs: 'auto', md: 'span 2', xl: 'span 2' } }
        : {};

    return (
      <Box
        key={post.id || post.slug}
        className="blog-item"
        sx={{
          minWidth: 0,
          opacity: 0,
          transform: 'translateY(24px) scale(0.98)',
          ...wrapperSx,
        }}
      >
        <Link
          to={`/blog/${post.slug}`}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
            minWidth: 0,
          }}
        >
        <Box
          sx={{
            height: h,
            minHeight: { xs: '260px', sm: '300px' },
            borderRadius: size === 'featured' || size === 'tall' ? 4 : 3,
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'border-color 0.4s, transform 0.4s, box-shadow 0.4s',
            '&:hover': {
              borderColor: 'rgba(255,187,0,0.35)',
              transform: 'translateY(-8px)',
              boxShadow: '0 24px 56px -20px rgba(0,0,0,0.5)',
            },
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
              <Typography
                sx={{
                  fontSize: size === 'featured' ? '4rem' : size === 'tall' ? '3.5rem' : '3rem',
                  fontWeight: 900,
                  color: 'rgba(255,255,255,0.06)',
                }}
              >
                {(post.title || 'СТ').substring(0, 2).toUpperCase()}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)',
            }}
          />

          <Box
            className="blog-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: 0,
              transition: 'opacity 0.4s',
              p: 3,
              zIndex: 1,
            }}
          >
            <Typography
              sx={{
                color: '#ffbb00',
                fontWeight: 700,
                fontSize: size === 'featured' ? '1rem' : '0.9rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
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
              textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)',
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
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.75rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {publishedDate}
                </Typography>
              )}
            </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.5)',
                    fontSize:
                  size === 'featured'
                    ? { xs: '1.15rem', md: '1.35rem' }
                    : size === 'wide' || size === 'tall'
                      ? { xs: '1.05rem', md: '1.15rem' }
                      : { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.25,
                mb: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: size === 'featured' || size === 'tall' ? 3 : 2,
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
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                  display: '-webkit-box',
                  WebkitLineClamp: size === 'featured' || size === 'tall' ? 3 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                  fontSize: size === 'featured' || size === 'tall' ? '0.95rem' : '0.85rem',
                }}
              >
                {excerpt}
              </Typography>
            )}
          </Box>
        </Box>
      </Link>
    </Box>
    );
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
          md: 'repeat(2, minmax(0, 1fr))',
          xl: 'repeat(3, minmax(0, 1fr))',
        },
        gap: { xs: 1.5, sm: 2, lg: 2, xl: 2.5 },
        mt: { xs: 4, sm: 5 },
      }}
    >
      {filteredPosts.map((post, index) => {
        const size = getCardSize(index);
        return renderCard(post, size, index);
      })}
    </Box>
  );
}
