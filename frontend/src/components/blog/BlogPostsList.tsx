import { useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

// Объявление типа для GSAP
declare global {
  interface Window {
    gsap?: any;
  }
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
}

/**
 * Список статей блога с фильтрацией через React
 */
export function BlogPostsList({ posts, selectedCategory }: BlogPostsListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCategoryRef = useRef<string>(selectedCategory);
  const isAnimatingRef = useRef<boolean>(false);

  // Фильтруем статьи по категории
  const filteredPosts = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) return [];

    if (selectedCategory === 'all') {
      return posts;
    }

    return posts.filter((post) => {
      const catSlug = post.categorySlug || post.category_slug || '';
      return catSlug === selectedCategory;
    });
  }, [posts, selectedCategory]);

  // Красивая анимация появления статей при фильтрации
  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll('.blog-item');
    const categoryChanged = previousCategoryRef.current !== selectedCategory;
    
    // Сразу скрываем все элементы перед анимацией
    items.forEach((item) => {
      const htmlItem = item as HTMLElement;
      htmlItem.style.opacity = '0';
      htmlItem.style.transform = 'translateY(50px) scale(0.96)';
      htmlItem.style.willChange = 'opacity, transform';
      // Убираем transition для мгновенного скрытия
      htmlItem.style.transition = 'none';
    });

    previousCategoryRef.current = selectedCategory;
    isAnimatingRef.current = true;
    
    // Загружаем GSAP, если его нет
    const loadGSAP = (): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window.gsap !== 'undefined') {
          resolve();
          return;
        }
        
        // Проверяем, не загружается ли уже
        if (document.querySelector('script[src*="gsap"]')) {
          const checkInterval = setInterval(() => {
            if (typeof window.gsap !== 'undefined') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve(); // Fallback на CSS анимацию
        document.head.appendChild(script);
      });
    };

    const animateItems = async () => {
      await loadGSAP();

      // Небольшая задержка, чтобы React успел отрендерить элементы
      await new Promise(resolve => setTimeout(resolve, 20));

      if (typeof window.gsap !== 'undefined') {
        // Используем GSAP для плавной анимации
        items.forEach((item, index) => {
          const htmlItem = item as HTMLElement;
          
          // Убеждаемся, что начальное состояние установлено
          window.gsap.set(htmlItem, {
            opacity: 0,
            y: 50,
            scale: 0.96,
          });
          
          // Анимируем появление с плавным каскадным эффектом
          window.gsap.to(htmlItem, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9, // Увеличена длительность для плавности
            delay: index * 0.06, // Уменьшена задержка для более быстрого каскада
            ease: 'power2.out', // Более плавный easing
            onComplete: () => {
              if (index === items.length - 1) {
                isAnimatingRef.current = false;
                // Убираем willChange после анимации для оптимизации
                htmlItem.style.willChange = 'auto';
              }
            },
          });
        });
      } else {
        // Fallback: CSS анимация, если GSAP не загрузился
        items.forEach((item, index) => {
          const htmlItem = item as HTMLElement;
          // Более плавная CSS анимация
          htmlItem.style.transition = 'opacity 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          
          setTimeout(() => {
            htmlItem.style.opacity = '1';
            htmlItem.style.transform = 'translateY(0) scale(1)';
            if (index === items.length - 1) {
              isAnimatingRef.current = false;
              htmlItem.style.willChange = 'auto';
            }
          }, index * 60);
        });
      }
    };

    // Запускаем анимацию
    animateItems();
    
    return () => {
      isAnimatingRef.current = false;
    };
  }, [filteredPosts, selectedCategory]);

  // Форматируем дату
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '';
    }
  };

  // Получаем превью изображения
  const getPreviewImage = (post: BlogPost): string => {
    const coverImage = resolveImageUrl(post.cover_image_url || post.coverImageUrl || '', '');
    const ogImage = resolveImageUrl(
      post.seo?.ogImageUrl || post.seo?.og_image_url || post.og_image_url || post.ogImageUrl || '',
      ''
    );
    return coverImage || ogImage;
  };

  // Получаем анонс статьи
  const getExcerpt = (post: BlogPost): string => {
    const postBody = post.body || post.contentHtml || post.content_html || '';
    if (!postBody) return '';
    // Удаляем HTML теги и берем первые 150 символов
    const text = postBody.replace(/<[^>]*>/g, '').trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  // Получаем класс категории для фильтрации
  const getCategoryClass = (post: BlogPost): string => {
    const categorySlug = post.categorySlug || post.category_slug || '';
    return categorySlug ? `category-${categorySlug}` : '';
  };

  if (filteredPosts.length === 0) {
    return (
      <div id="Blog-items" ref={containerRef} className="d-flex gap-30 row" style={{ marginTop: '50px' }}>
        <div className="mb-30">
          <p>Статей пока нет</p>
        </div>
      </div>
    );
  }

  return (
    <div id="Blog-items" ref={containerRef} className="d-flex gap-30 row" style={{ marginTop: '50px' }}>
      {filteredPosts.map((post) => {
        const categoryClass = getCategoryClass(post);
        const previewImage = getPreviewImage(post);
        const excerpt = getExcerpt(post);
        const publishedDate = formatDate(
          post.publishedAt || post.published_at || post.createdAt || post.created_at
        );

        return (
          <Link
            key={post.id || post.slug}
            to={`/blog/${post.slug}`}
            className={`mb-30 mix ${categoryClass} blog-item`}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              opacity: 0, // Начальное состояние - скрыто
              transform: 'translateY(50px) scale(0.96)', // Начальное состояние
              willChange: 'opacity, transform',
              transition: 'none', // Отключаем transition для начального состояния
            }}
          >
            <div className="portfolio-wrapper portfolio-title">
              {previewImage && (
                <div className="portfolio-img">
                  <img src={previewImage} alt={post.title} />
                </div>
              )}
              <div className="portfolio-heading pt-20">
                <h4 className="mb-10">{post.title}</h4>
                {excerpt && <p>{excerpt}</p>}
                <div className="d-flex flex-row jcsb mt-20">
                  <h5>{publishedDate}</h5>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

