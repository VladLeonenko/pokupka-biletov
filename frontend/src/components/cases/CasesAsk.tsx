import { useState, useCallback, useEffect } from 'react';
import { Box, Container, Typography, GlobalStyles } from '@mui/material';

interface FloatingEmoji {
  id: string;
  src: string;
  size: number;
  left: number;
  duration: number;
  startX: number;
}

/**
 * Секция "Как Вам проект?" с эмодзи и геймификацией
 */
export function CasesAsk() {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const handleEmojiClick = useCallback((emojiSrc: string, event: React.MouseEvent<HTMLImageElement>) => {
    // Получаем позицию клика относительно экрана
    const clickX = event.clientX;
    const clickY = event.clientY;
    
    // Создаем несколько эмодзи с разными параметрами
    const newEmojis: FloatingEmoji[] = [];
    const count = 8; // Количество эмодзи за один клик
    
    for (let i = 0; i < count; i++) {
      const id = `emoji-${Date.now()}-${i}-${Math.random()}`;
      const size = Math.random() * 80 + 30; // Размер от 30 до 110px
      // Позиция относительно места клика с разбросом
      const spread = (Math.random() - 0.5) * 300; // Разброс ±150px
      const left = ((clickX + spread) / window.innerWidth) * 100; // Позиция в процентах
      const duration = Math.random() * 2 + 4; // Длительность от 4 до 6 секунд
      
      newEmojis.push({
        id,
        src: emojiSrc,
        size,
        left: Math.max(0, Math.min(100, left)), // Ограничиваем от 0 до 100%
        duration,
        startX: clickX + spread,
      });
    }
    
    setFloatingEmojis((prev) => [...prev, ...newEmojis]);
    
    // Удаляем эмодзи после завершения анимации
    const maxDuration = Math.max(...newEmojis.map(e => e.duration));
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((emoji) => !newEmojis.find(e => e.id === emoji.id)));
    }, maxDuration * 1000 + 100);
  }, []);

  // Очистка эмодзи при размонтировании
  useEffect(() => {
    return () => {
      setFloatingEmojis([]);
    };
  }, []);

  return (
    <>
      <GlobalStyles
        styles={{
          '.floating-emoji': {
            position: 'fixed',
            bottom: '0',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'floatUp ease-out forwards',
            willChange: 'transform, opacity',
          },
          '@keyframes floatUp': {
            '0%': {
              transform: 'translateY(0) translateX(0) rotate(0deg) scale(0.8)',
              opacity: 0.8,
            },
            '10%': {
              opacity: 1,
              transform: 'translateY(-10vh) translateX(0) rotate(36deg) scale(1)',
            },
            '50%': {
              transform: 'translateY(-50vh) translateX(var(--drift-x, 0)) rotate(180deg) scale(1.1)',
            },
            '100%': {
              transform: 'translateY(-110vh) translateX(var(--drift-x, 0)) rotate(360deg) scale(0.6)',
              opacity: 0,
            },
          },
          '.ask .emodji img': {
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            '&:hover': {
              transform: 'scale(1.15)',
            },
            '&:active': {
              transform: 'scale(0.9)',
            },
          },
        }}
      />
      <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, my: 8, position: 'relative' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            Как Вам проект?
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 3, md: 6 },
              flexWrap: 'wrap',
            }}
            className="emodji"
          >
            {[
              '/legacy/img/emodji.png',
              '/legacy/img/emodji-2.png',
              '/legacy/img/emodji-3.png',
            ].map((src, index) => (
              <Box
                key={index}
                component="img"
                src={src}
            alt="эмодзи"
            loading="lazy"
                onClick={(e) => handleEmojiClick(src, e)}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  userSelect: 'none',
                  width: { xs: '60px', md: '80px' },
                  height: { xs: '60px', md: '80px' },
                  '&:hover': {
                    transform: 'scale(1.15)',
                  },
                  '&:active': {
                    transform: 'scale(0.9)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Container>
      
      {/* Анимированные эмодзи */}
      {floatingEmojis.map((emoji) => {
        // Случайное отклонение по горизонтали для более естественного движения
        const driftX = (Math.random() - 0.5) * 100; // Отклонение ±50px
        
        return (
          <img
            key={emoji.id}
            src={emoji.src}
            alt="floating emoji"
            className="floating-emoji"
            style={{
              left: `${emoji.left}%`,
              width: `${emoji.size}px`,
              height: `${emoji.size}px`,
              animationDuration: `${emoji.duration}s`,
              '--drift-x': `${driftX}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

