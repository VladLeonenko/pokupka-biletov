import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BlogCarousel } from './BlogCarousel';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAt: string | null;
  coverImage?: string;
}

interface BlogCarouselInjectorProps {
  posts: BlogPost[];
}

const queryClient = new QueryClient();

export function BlogCarouselInjector({ posts }: BlogCarouselInjectorProps) {
  const rootRef = useRef<Root | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scheduleCleanup = (fn: () => void) => {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(fn);
      } else {
        Promise.resolve().then(fn);
      }
    };

    // Ждем, пока DOM будет готов
    const timer = setTimeout(() => {
      // Ищем целевой контейнер для вставки карусели
      // Ищем секцию блога или создаем контейнер
      let targetContainer = document.querySelector('.blog-section, #blog-section, section.blog');
      
      if (!targetContainer) {
        // Если секции нет, создаем новый контейнер и вставляем после advantages или перед footer
        const advantagesSection = document.querySelector('.advantages, section.advantages');
        const footer = document.querySelector('footer, .footer');
        
        targetContainer = document.createElement('div');
        targetContainer.id = 'blog-carousel-container';
        targetContainer.setAttribute('data-blog-carousel', 'true');
        
        if (advantagesSection && advantagesSection.nextSibling) {
          advantagesSection.parentNode?.insertBefore(targetContainer, advantagesSection.nextSibling);
        } else if (footer) {
          footer.parentNode?.insertBefore(targetContainer, footer);
        } else {
          document.body.appendChild(targetContainer);
        }
      }

      // Очищаем старое содержимое
      targetContainer.innerHTML = '';
      
      // Создаем контейнер для React
      const reactContainer = document.createElement('div');
      reactContainer.id = 'blog-carousel-react-root';
      targetContainer.appendChild(reactContainer);
      
      containerRef.current = reactContainer;

      // Создаем React root и рендерим карусель
      if (!rootRef.current) {
        rootRef.current = createRoot(reactContainer);
      }
      
      const normalizedPosts = posts.map((post) => ({
        ...post,
        coverImage: post.coverImage || (post as any).cover_image_url || (post as any).coverImageUrl,
      }));

      rootRef.current.render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <BlogCarousel posts={normalizedPosts} />
          </BrowserRouter>
        </QueryClientProvider>
      );
    }, 500); // Даем время на рендеринг основного HTML

    return () => {
      clearTimeout(timer);
      if (rootRef.current) {
        const root = rootRef.current;
        const container = containerRef.current;
        rootRef.current = null;

        scheduleCleanup(() => {
          try {
            root.unmount();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[BlogCarouselInjector] Error unmounting:', e);
          } finally {
            if (container && container.parentNode) {
              container.remove();
            }
          }
        });
      }
    };
  }, [posts]);

  // Этот компонент ничего не рендерит в React дереве
  return null;
}

