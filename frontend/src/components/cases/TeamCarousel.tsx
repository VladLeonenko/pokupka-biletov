import { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { TeamMember } from '@/types/cms';

interface TeamCarouselProps {
  members: TeamMember[];
}

/**
 * React-карусель для отображения участников команды
 */
export function TeamCarousel({ members }: TeamCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(4);
  const [isMobile, setIsMobile] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Определяем количество элементов для отображения в зависимости от ширины экрана
  useEffect(() => {
    const updateItemsToShow = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 768) {
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

  const maxIndex = Math.max(0, members.length - itemsToShow);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  if (members.length === 0) {
    return null;
  }

  const itemWidth = `calc((100% - ${(itemsToShow - 1) * 30}px) / ${itemsToShow})`;

  return (
    <div 
      className="team-carousel-wrapper" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        padding: isMobile ? '0 40px' : '0 50px' 
      }}
    >
      <div
        ref={containerRef}
        className="team-carousel"
        style={{
          display: 'flex',
          gap: '30px',
          overflow: 'hidden',
          position: 'relative',
          transition: 'transform 0.5s ease',
          transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)`,
        }}
      >
        {members.map((member) => {
          const imageUrl = member.imageUrl ? resolveImageUrl(member.imageUrl, '') : '';
          const imageFailed = failedImages.has(member.id);
          const shouldShowImage = !!imageUrl && !imageFailed && imageUrl !== '/legacy/img/default-avatar.png';
          
          // Получаем инициалы из имени
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={member.id}
              className="team-carousel-item"
              style={{
                minWidth: itemWidth,
                flex: `0 0 ${itemWidth}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {shouldShowImage ? (
                <img
                  src={imageUrl}
                  alt={member.name}
                  loading="lazy"
                  onError={() => {
                    // Если изображение не загрузилось, добавляем в список неудачных
                    setFailedImages((prev) => new Set(prev).add(member.id));
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    height: 'auto',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    objectFit: 'cover',
                    aspectRatio: '1 / 1',
                  }}
                />
              ) : (
                <div
                  className="team-member-placeholder"
                  style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: '200px',
                    aspectRatio: '1 / 1',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontWeight: 300,
                    letterSpacing: '2px',
                  }}
                >
                  {initials || '👤'}
                </div>
              )}
              <span style={{ fontWeight: 'bold', marginBottom: '5px', color: '#fff' }}>
                {member.name}
              </span>
              <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>{member.role}</p>
            </div>
          );
        })}
      </div>

      {/* Навигационные кнопки */}
      {members.length > itemsToShow && (
        <>
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="team-carousel-nav team-carousel-prev"
            style={{
              position: 'absolute',
              left: isMobile ? '-10px' : '0',
              top: '50%',
              transform: 'translateY(-50%)',
              background: canGoPrev ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              width: isMobile ? '35px' : '40px',
              height: isMobile ? '35px' : '40px',
              borderRadius: '50%',
              cursor: canGoPrev ? 'pointer' : 'not-allowed',
              opacity: canGoPrev ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '20px' : '24px',
              transition: 'all 0.3s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (canGoPrev) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = canGoPrev ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ‹
          </button>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="team-carousel-nav team-carousel-next"
            style={{
              position: 'absolute',
              right: isMobile ? '-10px' : '0',
              top: '50%',
              transform: 'translateY(-50%)',
              background: canGoNext ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              width: isMobile ? '35px' : '40px',
              height: isMobile ? '35px' : '40px',
              borderRadius: '50%',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '20px' : '24px',
              transition: 'all 0.3s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (canGoNext) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = canGoNext ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

