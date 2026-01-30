import { useQuery } from '@tanstack/react-query';
import { getPublicCarousel, CarouselItem } from '@/services/carouselsApi';
import { VerticalCarousel } from './VerticalCarousel';

/**
 * Hero секция - главный блок главной страницы с вертикальной каруселью
 * Загружает карусель через API из админки
 */
export function HeroSection() {
  // Загружаем вертикальную карусель из админки
  const { data: carousel, isLoading: carouselLoading, error } = useQuery({
    queryKey: ['public-carousel', 'vertical-carousel-home'],
    queryFn: () => getPublicCarousel('vertical-carousel-home'),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: false, // Не повторяем запрос при 404
    refetchOnWindowFocus: false,
    // Игнорируем ошибки (404 обрабатывается внутри функции)
    throwOnError: false,
  });

  // Статичные данные по умолчанию, если карусель не загружена или пуста
  const defaultCarouselItems: CarouselItem[] = [
    { caption_html: 'Веб-дизайн', text: 'Веб-дизайн' },
    { caption_html: 'Маркетинг', text: 'Маркетинг' },
    { caption_html: 'Реклама', text: 'Реклама' },
    { caption_html: 'Сайт под ключ', text: 'Сайт под ключ' },
    { caption_html: 'Тестирование', text: 'Тестирование' },
    { caption_html: 'Продвижение', text: 'Продвижение' },
  ];

  // Преобразуем данные карусели в формат CarouselItem
  const carouselItems: CarouselItem[] = 
    !carouselLoading && carousel?.items && carousel.items.length > 0
      ? carousel.items
      : defaultCarouselItems;

  return (
    <div className="container">
      <section className="main-block d-flex jcsb align-items-center" style={{ padding: '6em 0' }}>
        <div className="d-flex gap-v-50 flex-column">
          <div className="section-header d-flex gap-v-20 flex-column">
            <h1>Заказать сайт под ключ</h1>
            <h2>Профессиональное создание и продвижение сайтов | мобильных приложений</h2>
          </div>
          <div className="header-advantages d-flex gap-h-30">
            <p className="borderR">75+<br />проектов</p>
            <p className="borderR">12+<br />сотрудников</p>
            <p>10+<br />дней на заказ</p>
          </div>
          <div className="btn-mode">
            <a href="/new-client" className="btn">Стать клиентом</a>
          </div>
        </div>
        <div className="vertical-carousel">
          <VerticalCarousel items={carouselItems} speed={3000} />
        </div>
      </section>
    </div>
  );
}

