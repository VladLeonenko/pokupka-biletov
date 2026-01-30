import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { CarouselItem } from '@/services/carouselsApi';

interface VerticalCarouselProps {
  items: CarouselItem[];
  speed?: number; // миллисекунды между переходами
}

const VISIBLE_ITEMS = 5;
const DEFAULT_SPEED = 3000; // 3 секунды
const ANIMATION_DURATION = 800; // миллисекунды

export function VerticalCarousel({ items, speed = DEFAULT_SPEED }: VerticalCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Если нет элементов, не рендерим карусель
  if (!items || items.length === 0) {
    return null;
  }

  // Функция для получения текста/HTML из элемента
  const getItemContent = useCallback((item: CarouselItem): string => {
    const content = item.caption_html || item.text || item.title || '';
    // Если контент пустой, возвращаем плейсхолдер
    return content.trim() || 'Элемент карусели';
  }, []);

  // Дублируем элементы для бесконечной прокрутки
  const extendedItems = useMemo(() => {
    return [...items, ...items, ...items];
  }, [items]);

  // Функция для получения стилей элемента на основе позиции (1-5)
  const getItemSx = useCallback((position: number) => {
    const baseSx = {
      width: '100%',
      marginBottom: '1em',
      textAlign: 'right' as const,
      transition: 'opacity 0.8s ease, color 0.8s ease',
      // Всегда используем block для видимых элементов (перекрывает legacy CSS)
      display: 'block',
    };

    if (position === 1 || position === 5) {
      // Позиции 1 и 5 - opacity 0.3, белый
      return {
        ...baseSx,
        opacity: 0.3,
      };
    } else if (position === 2 || position === 4) {
      // Позиции 2 и 4 - opacity 1, белый
      return {
        ...baseSx,
        opacity: 1,
      };
    } else if (position === 3) {
      // Позиция 3 (центральная) - opacity 1, желтый #fb0
      return {
        ...baseSx,
        opacity: 1,
      };
    }
    
    // Скрытые элементы
    return {
      ...baseSx,
      opacity: 0,
      visibility: 'hidden' as const,
      position: 'absolute' as const,
      display: 'none',
    };
  }, []);

  // Функция для получения цвета текста на основе позиции
  const getTextColor = useCallback((position: number): string => {
    if (position === 3) {
      return '#fb0'; // Центральный - желтый
    }
    return '#ffffff'; // Остальные - белый
  }, []);

  // Обновление стилей элементов после перемещения (обновляем все стили: opacity, цвета и т.д.)
  const updateItemStyles = useCallback(() => {
    if (!listRef.current) return;

    const listItems = Array.from(listRef.current.children) as HTMLElement[];
    
    listItems.forEach((item, index) => {
      // Обновляем стили только для видимых элементов
      if (index < VISIBLE_ITEMS) {
        const position = index + 1;
        
        // Удаляем старые классы
        item.classList.remove(
          'slide-position-1',
          'slide-position-2',
          'slide-position-3',
          'slide-position-4',
          'slide-position-5'
        );
        
        // Добавляем новый класс
        item.classList.add(`slide-position-${position}`);
        
        // Получаем стили для позиции
        const itemSx = getItemSx(position);
        
        // Применяем opacity и другие стили через setProperty для переопределения CSS
        item.style.setProperty('opacity', String(itemSx.opacity), 'important');
        item.style.setProperty('visibility', 'visible', 'important');
        item.style.setProperty('position', 'relative', 'important');
        item.style.setProperty('display', 'block', 'important');
        
        // Обновляем цвет текста для h2
        const h2Element = item.querySelector('h2') as HTMLElement;
        if (h2Element) {
          const color = getTextColor(position);
          h2Element.style.setProperty('color', color, 'important');
        }
      } else {
        // Скрываем элементы за пределами видимой области
        item.style.setProperty('opacity', '0', 'important');
        item.style.setProperty('visibility', 'hidden', 'important');
        item.style.setProperty('display', 'none', 'important');
      }
    });
  }, [getTextColor, getItemSx]);

  // Переход к следующему элементу
  const moveNext = useCallback(() => {
    if (!listRef.current || isAnimatingRef.current || items.length === 0) return;

    isAnimatingRef.current = true;
    const listItems = Array.from(listRef.current.children) as HTMLElement[];
    
    if (listItems.length === 0) {
      isAnimatingRef.current = false;
      return;
    }

    const firstItem = listItems[0];
    const itemHeight = firstItem.offsetHeight;
    const marginBottom = parseInt(window.getComputedStyle(firstItem).marginBottom) || 16;
    const totalHeight = itemHeight + marginBottom;

    // Клонируем первый элемент и добавляем его в конец
    const clonedItem = firstItem.cloneNode(true) as HTMLElement;
    const position5Sx = getItemSx(5);
    const position5Color = getTextColor(5);
    
    // Устанавливаем начальное состояние (прозрачный) с плавным transition для появления
    clonedItem.style.setProperty('opacity', '0', 'important');
    clonedItem.style.setProperty('visibility', 'visible', 'important');
    clonedItem.style.setProperty('position', 'relative', 'important');
    clonedItem.style.setProperty('display', 'block', 'important');
    // Используем ease-out для более плавного появления нижнего элемента
    clonedItem.style.setProperty('transition', `opacity ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
    
    const clonedH2 = clonedItem.querySelector('h2') as HTMLElement;
    if (clonedH2) {
      clonedH2.style.setProperty('transition', `color ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
      clonedH2.style.setProperty('color', position5Color, 'important');
    }
    
    listRef.current.appendChild(clonedItem);

    // Принудительный reflow перед началом анимации
    void listRef.current.offsetHeight;

    // Обновляем стили для всех элементов одновременно - БЕЗ задержек
    const allItems = Array.from(listRef.current.children) as HTMLElement[];
    
    allItems.forEach((item, index) => {
      if (index < VISIBLE_ITEMS + 1) {
        if (index === 0) {
          // Первый элемент уходит - делаем его невидимым
          item.style.setProperty('transition', `opacity ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
          item.style.setProperty('opacity', '0', 'important');
        } else if (index <= VISIBLE_ITEMS) {
          // Остальные элементы сдвигаются на одну позицию вверх
          const position = index; // 1, 2, 3, 4, 5
          const itemSx = getItemSx(position);
          const color = getTextColor(position);
          
          // Применяем transition для синхронного изменения с движением
          // Используем cubic-bezier для плавного перехода
          item.style.setProperty('transition', `opacity ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
          item.style.setProperty('opacity', String(itemSx.opacity), 'important');
          
          const h2Element = item.querySelector('h2') as HTMLElement;
          if (h2Element) {
            h2Element.style.setProperty('transition', `color ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
            h2Element.style.setProperty('color', color, 'important');
          }
        }
      }
    });

    // Запускаем анимацию движения сразу же, в том же синхронном коде
    // Используем cubic-bezier для более плавной анимации
    listRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    listRef.current.style.transform = `translateY(-${totalHeight}px)`;

    // После завершения анимации удаляем первый элемент и сбрасываем позицию
    timeoutRef.current = setTimeout(() => {
      if (!listRef.current || !firstItem) {
        isAnimatingRef.current = false;
        return;
      }

      // Удаляем transition для мгновенного перемещения
      listRef.current.style.transition = 'none';
      
      // Удаляем первый элемент (он уже невидим)
      listRef.current.removeChild(firstItem);
      
      // Сбрасываем transform без анимации
      listRef.current.style.transform = 'translateY(0)';
      
      // Принудительный reflow
      void listRef.current.offsetHeight;
      
      // Обновляем стили элементов (включая классы и финальные стили)
      updateItemStyles();
      
      isAnimatingRef.current = false;
    }, ANIMATION_DURATION);
  }, [updateItemStyles, items.length, getItemSx, getTextColor]);

  // Инициализация стилей при монтировании и изменении items
  useEffect(() => {
    // Используем небольшую задержку для корректного применения стилей после рендера
    const timer = setTimeout(() => {
      updateItemStyles();
      
      // Фиксируем высоту контейнера равной высоте 5 видимых элементов
      if (listRef.current && containerRef.current) {
        const listItems = Array.from(listRef.current.children) as HTMLElement[];
        let totalHeight = 0;
        
        for (let i = 0; i < Math.min(VISIBLE_ITEMS, listItems.length); i++) {
          const item = listItems[i];
          totalHeight += item.offsetHeight;
          const marginBottom = parseInt(window.getComputedStyle(item).marginBottom) || 16;
          totalHeight += marginBottom;
        }
        
        setContainerHeight(totalHeight);
        if (containerRef.current) {
          containerRef.current.style.height = `${totalHeight}px`;
          containerRef.current.style.minHeight = `${totalHeight}px`;
          containerRef.current.style.maxHeight = `${totalHeight}px`;
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [items, updateItemStyles]);

  // Автопрокрутка
  useEffect(() => {
    if (isHovered || items.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      moveNext();
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isHovered, speed, moveNext, items.length]);

  // Обработчики наведения мыши
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <Box
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        height: containerHeight > 0 ? `${containerHeight}px` : '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        // Фиксируем размеры для предотвращения дергания соседних элементов
        flexShrink: 0,
        minHeight: containerHeight > 0 ? `${containerHeight}px` : 'auto',
        maxHeight: containerHeight > 0 ? `${containerHeight}px` : 'none',
      }}
    >
      <Box
        component="ul"
        ref={listRef}
        className="carousel-list vertical-carousel-list"
        sx={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          position: 'relative',
          transform: 'translateY(0)',
          // Оптимизация для предотвращения reflow и дергания
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: 1000,
        }}
      >
        {extendedItems.map((item, index) => {
          const content = getItemContent(item);
          if (!content) return null; // Пропускаем элементы без контента
          
          const isHtml = content.includes('<');
          const position = index < VISIBLE_ITEMS ? index + 1 : 0;
          const textColor = position > 0 ? getTextColor(position) : '#ffffff';
          
          // Для видимых элементов используем правильные стили, для скрытых - скрываем
          const itemSx = index < VISIBLE_ITEMS 
            ? {
                ...getItemSx(position),
                // Переопределяем display для видимых элементов (перекрываем legacy CSS)
                display: 'block',
              }
            : {
                width: '100%',
                marginBottom: '1em',
                textAlign: 'right' as const,
                opacity: 0,
                visibility: 'hidden' as const,
                position: 'absolute' as const,
                display: 'none',
              };
          
          return (
            <Box
              key={`item-${index}`}
              component="li"
              className={`carousel-item ${position > 0 ? `slide-position-${position}` : ''}`}
              sx={itemSx}
            >
              {isHtml ? (
                <Typography
                  variant="h2"
                  component="h2"
                  dangerouslySetInnerHTML={{ __html: content }}
                  sx={{
                    fontSize: '2.5em',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    fontFamily: '"Raleway", sans-serif',
                    fontWeight: 400,
                    margin: 0,
                    color: textColor,
                    transition: 'color 0.8s ease',
                  }}
                />
              ) : (
                <Typography
                  variant="h2"
                  component="h2"
                  sx={{
                    fontSize: '2.5em',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    fontFamily: '"Raleway", sans-serif',
                    fontWeight: 400,
                    margin: 0,
                    color: textColor,
                    transition: 'color 0.8s ease',
                  }}
                >
                  {content}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
