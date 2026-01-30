import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Badge, Box } from '@mui/material';
import { 
  ShoppingCart, Favorite, Person, Search 
} from '@mui/icons-material';
import { useAuth } from '@/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { getCart, getWishlist } from '@/services/ecommerceApi';
import { createPortal } from 'react-dom';

export function EcommerceHeaderIcons() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [headerElement, setHeaderElement] = useState<HTMLElement | null>(null);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: true,
    refetchInterval: 30000, // Обновляем каждые 30 секунд (не 5!)
    staleTime: 20000, // Кэш валиден 20 сек
  });

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: !!user && !!user.id, // Более строгая проверка
    refetchInterval: 30000, // Обновляем каждые 30 секунд (не 5!)
    staleTime: 20000, // Кэш валиден 20 сек
    retry: false, // Не повторять запрос при ошибке 401
  });

  const cartCount = cartData?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const wishlistCount = wishlistData?.items?.length || 0;

  useEffect(() => {
    // Проверяем, не добавлены ли уже иконки глобально - СТРОГАЯ ПРОВЕРКА
    const existingContainer = document.querySelector('.ecommerce-icons-container-global') as HTMLElement;
    if (existingContainer) {
      setHeaderElement(existingContainer);
      return; // Выходим сразу, не создаем дубликаты
    }
    
    // Ищем шапку сайта - сначала ищем div с классом "header" внутри header
    const findHeader = () => {
      // Сначала пытаемся найти div.header внутри header (приоритет)
      let headerDiv = document.querySelector('header .header, header div.header') as HTMLElement;
      
      // Если не нашли, ищем просто .header
      if (!headerDiv) {
        headerDiv = document.querySelector('.header') as HTMLElement;
      }
      
      // Если и этого нет, ищем header
      if (!headerDiv) {
        headerDiv = document.querySelector('header') as HTMLElement;
      }
      
      // Если и header нет, ищем nav
      if (!headerDiv) {
        headerDiv = document.querySelector('nav') as HTMLElement;
      }

      if (headerDiv) {
        // СТРОГАЯ ПРОВЕРКА - проверяем глобально, не только в этом headerDiv
        let container = document.querySelector('.ecommerce-icons-container-global') as HTMLElement;
        if (!container) {
          // Проверяем еще раз перед созданием (race condition protection)
          container = document.querySelector('.ecommerce-icons-container-global') as HTMLElement;
          if (!container) {
            container = document.createElement('div');
            container.className = 'ecommerce-icons-container-global';
            container.style.cssText = `
              display: flex;
              align-items: center;
              gap: 4px;
              margin-left: auto;
              margin-right: 0;
              position: relative;
              z-index: 1000;
            `;
            
            headerDiv.appendChild(container);
          }
        }
        setHeaderElement(container);
        
        // Добавляем стили для выравнивания header
        if (!document.querySelector('#ecommerce-header-styles')) {
          const style = document.createElement('style');
          style.id = 'ecommerce-header-styles';
          style.textContent = `
            /* Выравнивание header - минимальные изменения */
            header .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            
            /* Запрещаем выделение текста в header */
            header .header,
            header .header * {
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
            }
            
            /* Логотип слева */
            header .header .logo {
              flex: 0 0 auto;
              order: 1;
            }
            
            /* Скрываем checkbox */
            header #burger-toggle {
              order: 997;
            }
            
            /* Меню имеет свой z-index, не трогаем */
            header .menu {
              order: 1000;
            }
            
            /* Burger menu - используем оригинальные стили */
            header .burger-menu {
              order: 999;
            }
            
            /* Контейнер с иконками справа, ПЕРЕД burger menu */
            header .header .ecommerce-icons-container-global {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-left: auto;
              margin-right: 0;
              order: 998;
            }
            
            /* Все иконки одинакового размера 40x40 */
            .ecommerce-icons-container-global .MuiIconButton-root {
              width: 40px;
              height: 40px;
              padding: 8px;
            }
            
            .ecommerce-icons-container-global .MuiSvgIcon-root {
              font-size: 24px;
            }
            
            /* Адаптивность - используем оригинальные стили из CSS */
              
              .ecommerce-icons-container-global {
                gap: 2px;
              }
              
              .ecommerce-icons-container-global .MuiIconButton-root {
                width: 36px;
                height: 36px;
                padding: 6px;
              }
              
              .ecommerce-icons-container-global .MuiSvgIcon-root {
                font-size: 20px;
              }
            }
          `;
          document.head.appendChild(style);
        }
        return true; // Успешно нашли и добавили
      }
      return false; // Не нашли header
    };

    // Пытаемся найти шапку сразу и через некоторое время (несколько попыток)
    let attempts = 0;
    const maxAttempts = 20;
    
    const tryFindHeader = () => {
      attempts++;
      if (findHeader()) {
        return; // Успешно нашли
      }
      if (attempts < maxAttempts) {
        setTimeout(tryFindHeader, 200);
      } else {
        console.warn('[EcommerceHeaderIcons] Header not found after', maxAttempts, 'attempts');
      }
    };
    
    // Пробуем сразу
    tryFindHeader();
    
    // Также используем MutationObserver для отслеживания изменений DOM
    const observer = new MutationObserver(() => {
      if (!headerElement) {
        tryFindHeader();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Дополнительные попытки через таймеры
    const timer1 = setTimeout(tryFindHeader, 100);
    const timer2 = setTimeout(tryFindHeader, 500);
    const timer3 = setTimeout(tryFindHeader, 1000);
    const timer4 = setTimeout(tryFindHeader, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      observer.disconnect();
    };
  }, [headerElement]);

  if (!headerElement) {
    return null;
  }

  const iconsContent = (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 0.5,
      '& .MuiIconButton-root': {
        width: '40px',
        height: '40px',
        padding: '8px',
      },
      '& .MuiSvgIcon-root': {
        fontSize: '24px',
      },
    }}>
      <IconButton
        onClick={() => navigate('/search')}
        sx={{ color: 'inherit' }}
        aria-label="Поиск"
      >
        <Search />
      </IconButton>

      <IconButton
        onClick={() => navigate('/wishlist')}
        sx={{ color: 'inherit' }}
        aria-label="Избранное"
      >
        <Badge badgeContent={wishlistCount} color="error" max={99}>
          <Favorite />
        </Badge>
      </IconButton>

      <IconButton
        onClick={() => navigate('/cart')}
        sx={{ color: 'inherit' }}
        aria-label="Корзина"
      >
        <Badge badgeContent={cartCount} color="error" max={99}>
          <ShoppingCart />
        </Badge>
      </IconButton>

      <IconButton
        onClick={() => navigate('/account')}
        sx={{ color: 'inherit' }}
        aria-label="Личный кабинет"
      >
        <Person />
      </IconButton>
    </Box>
  );

  return createPortal(iconsContent, headerElement);
}
