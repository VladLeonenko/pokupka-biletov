import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicCarousel } from '@/services/carouselsApi';

/**
 * Секция "Команда" на странице /about
 * Использует данные из карусели "team" в БД
 */
export function TeamSection() {
  const { data: carousel, isLoading } = useQuery({
    queryKey: ['public-carousel', 'team'],
    queryFn: () => getPublicCarousel('team'),
    retry: 2,
  });

  // Парсим данные команды из карусели
  const teamMembers = carousel?.items?.map((item) => {
    // Парсим HTML для извлечения имени и должности
    if (typeof window !== 'undefined' && item.caption_html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(item.caption_html, 'text/html');
      const nameEl = doc.querySelector('strong');
      const positionEl = doc.querySelector('p');
      const name = nameEl?.textContent?.trim() || '';
      const position = positionEl?.textContent?.trim() || '';
      
      return {
        name,
        position,
        image: item.image_url || item.image || '',
        alt: `${position} Primecoder ${name}`,
      };
    }
    // Fallback, если нет HTML
    return {
      name: item.title || '',
      position: item.text || '',
      image: item.image_url || item.image || '',
      alt: `${item.text || ''} Primecoder ${item.title || ''}`,
    };
  }).filter(m => m.name) || [];

  // Fallback на старые данные, если карусель еще не загружена
  const defaultMembers = [
    {
      name: 'Владислав Леоненко',
      position: 'Руководитель',
      image: '/legacy/img/leonenko-vladislav.jpg',
      alt: 'Руководитель компании Primecoder Леоненко Владислав',
    },
    {
      name: 'Павел Гришко',
      position: 'Front-end разработчик',
      image: '/legacy/img/pavel.jpeg',
      alt: 'Front-end разработчик Primecoder Павел Гришко',
    },
    {
      name: 'Светлана Пчелинцева',
      position: 'Маркетолог',
      image: '/legacy/img/svetlana.jpg',
      alt: 'Маркетолог Primecoder Светлана Пчелинцева',
    },
    {
      name: 'Сергей Королёв',
      position: 'Главный дизайнер',
      image: '/legacy/img/sergey.jpeg',
      alt: 'Главный дизайнер Primecoder Сергей Королёв',
    },
    {
      name: 'Анна Сёмушкина',
      position: 'Дизайнер',
      image: '/legacy/img/anna.jpeg',
      alt: 'Дизайнер Primecoder Анна Сёмушкина',
    },
    {
      name: 'Миннуллин Ильшат',
      position: 'Backend-разработчик',
      image: '/legacy/img/ilshat.jpeg',
      alt: 'Backend-разработчик Primecoder Миннуллин Ильшат',
    },
  ];

  const members = teamMembers.length > 0 ? teamMembers : defaultMembers;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Определяем количество элементов в зависимости от ширины экрана
  useEffect(() => {
    const updateItemsToShow = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setItemsToShow(1);
      } else if (width < 768) {
        setItemsToShow(1);
      } else if (width < 1024) {
        setItemsToShow(2);
      } else if (width < 1200) {
        setItemsToShow(3);
      } else {
        setItemsToShow(4);
      }
    };

    updateItemsToShow();
    window.addEventListener('resize', updateItemsToShow);
    return () => window.removeEventListener('resize', updateItemsToShow);
  }, []);

  // Обработка перетаскивания мышью
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeft(carouselRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - (carouselRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Обработка свайпа на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeft(carouselRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - (carouselRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Навигация
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? members.length - itemsToShow : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev >= members.length - itemsToShow ? 0 : prev + 1));
  };

  // Автопрокрутка
  useEffect(() => {
    if (members.length === 0) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        goToNext();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, isDragging, itemsToShow, members.length]);

  // Обновляем позицию карусели при изменении индекса
  useEffect(() => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.offsetWidth / itemsToShow;
      carouselRef.current.scrollTo({
        left: currentIndex * itemWidth,
        behavior: 'smooth',
      });
    }
  }, [currentIndex, itemsToShow]);

  return (
    <section>
      <h2>Команда</h2>
      <p>Знакомьтесь с командой PrimeCoder! Мы — молодые, но опытные специалисты, которые с энтузиазмом подходят к каждому проекту. Каждый член команды — профессионал в своей области, готовый превратить ваши идеи в успешные digital-решения.</p>

      <div className="team-carousel-wrapper mt-50" style={{ position: 'relative' }}>
        {/* Кнопки навигации */}
        <button
          className="carousel-nav carousel-nav-prev"
          onClick={goToPrevious}
          aria-label="Предыдущий слайд"
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'rgba(255, 187, 0, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: '20px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 187, 0, 1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 187, 0, 0.8)';
          }}
        >
          ‹
        </button>
        <button
          className="carousel-nav carousel-nav-next"
          onClick={goToNext}
          aria-label="Следующий слайд"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'rgba(255, 187, 0, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: '20px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 187, 0, 1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 187, 0, 0.8)';
          }}
        >
          ›
        </button>

        {/* Карусель */}
        <div
          ref={carouselRef}
          className="team-carousel"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '30px',
            padding: '0 50px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            WebkitOverflowScrolling: 'touch',
          }}
          onWheel={(e) => {
            if (carouselRef.current) {
              carouselRef.current.scrollLeft += e.deltaY;
            }
          }}
        >
          {members.map((member, index) => (
            <div
              key={index}
              className="team-item"
              style={{
                minWidth: `calc(${100 / itemsToShow}% - ${(30 * (itemsToShow - 1)) / itemsToShow}px)`,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <img
                src={member.image}
                alt={member.alt}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  objectFit: 'cover',
                }}
              />
              <span style={{ fontWeight: 600, marginBottom: '5px', fontSize: '18px' }}>{member.name}</span>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>{member.position}</p>
            </div>
          ))}
        </div>

        <style>{`
          .team-carousel::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </section>
  );
}

