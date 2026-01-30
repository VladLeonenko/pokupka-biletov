import { useState, useEffect } from 'react';
import { PromotionModal } from './PromotionModal';

interface Promotion {
  id?: number;
  title: string;
  description: string;
  expiryDate?: string | null;
  expiryText?: string | null;
  buttonText?: string;
  formId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

interface PromotionsListProps {
  promotions: Promotion[];
}

/**
 * Список акций на странице /promotion
 */
export function PromotionsList({ promotions }: PromotionsListProps) {
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Блокируем legacy скрипты от обработки кнопок акций
  useEffect(() => {
    let timeoutId1: NodeJS.Timeout;
    let timeoutId2: NodeJS.Timeout;
    let timeoutId3: NodeJS.Timeout;
    
    const disableLegacyHandlers = () => {
      // Отключаем jQuery обработчики для кнопок акций, если jQuery загружен
      if (typeof window !== 'undefined' && (window as any).jQuery) {
        try {
          const $ = (window as any).jQuery;
          
          // Удаляем все обработчики для классов кнопок акций
          const buttonClasses = [
            'primecombo-order',
            'threepromo-order',
            'radio-order',
            'primedirect-order',
            'bigestpromo-order',
            'promotion-order'
          ];
          
          buttonClasses.forEach(className => {
            $(`.${className}`).off('click');
          });
          
          // Также отключаем обработчики для closePopup, если они мешают
          $('.closePopup').off('click');
        } catch (error) {
          // Игнорируем ошибки
        }
      }
    };

    // Пытаемся отключить сразу
    disableLegacyHandlers();
    
    // И после задержек, чтобы перехватить обработчики, которые могут быть добавлены позже
    timeoutId1 = setTimeout(disableLegacyHandlers, 100);
    timeoutId2 = setTimeout(disableLegacyHandlers, 500);
    timeoutId3 = setTimeout(disableLegacyHandlers, 1000);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  const formatExpiryDate = (promo: Promotion): string => {
    if (promo.expiryText) {
      return promo.expiryText;
    }
    if (promo.expiryDate) {
      try {
        const date = new Date(promo.expiryDate);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          return `До ${day}.${month}.${year}`;
        }
      } catch (e) {
        // Ignore
      }
    }
    return 'Всегда';
  };

  const handleOpenModal = (formId: string | null, title: string) => {
    console.log('[PromotionsList] handleOpenModal called:', { formId, title, currentOpenModal: openModal });
    
    // Используем функциональное обновление для проверки актуального состояния
    setOpenModal((currentModal) => {
      // Предотвращаем множественные вызовы
      if (currentModal !== null) {
        console.log('[PromotionsList] Modal already open, ignoring');
        return currentModal;
      }
      
      let newModalId: string;
      if (formId) {
        // Очищаем formId от лишних частей (например, "btn-outline radio-input" -> "radio-input")
        let cleanFormId = formId.trim();
        // Если formId содержит пробелы, берем последнюю часть (после последнего пробела)
        if (cleanFormId.includes(' ')) {
          cleanFormId = cleanFormId.split(' ').pop() || cleanFormId;
        }
        // Убираем суффикс -input для идентификации модального окна
        newModalId = cleanFormId.replace('-input', '').trim();
      } else {
        // Если нет formId, используем общий модал
        newModalId = `promotion-${title.toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      console.log('[PromotionsList] Setting modal to:', newModalId);
      return newModalId;
    });
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  if (promotions.length === 0) {
    return (
      <section>
        <div className="d-flex promotions">
          <div className="promotion-item">
            <p>Акций пока нет</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section>
        <div className="d-flex promotions" style={{ width: '100%', flexWrap: 'wrap', gap: '20px', justifyContent: 'flex-start', marginTop: '4em' }}>
          {promotions.map((promo, index) => {
            const inactiveClass = !promo.isActive ? ' no-active-promotion' : '';
            // Очищаем formId для создания класса кнопки
            let cleanFormId = promo.formId || '';
            if (cleanFormId.includes(' ')) {
              cleanFormId = cleanFormId.split(' ').pop() || cleanFormId;
            }
            const buttonClass = promo.formId ? `${cleanFormId.replace('-input', '')}-order` : 'promotion-order';
            
            return (
              <div 
                key={promo.id || index} 
                className={`promotion-item${inactiveClass}`}
                style={{ 
                  flex: '1 1 calc(50% - 20px)',
                  minWidth: '300px',
                  maxWidth: '100%',
                }}
              >
                {promo.title && <h3 dangerouslySetInnerHTML={{ __html: promo.title.replace(/\n/g, '<br>') }} />}
                {promo.description && <p>{promo.description}</p>}
                <div className="d-flex jcsb w-100 align-items-center">
                  <h5>{formatExpiryDate(promo)}</h5>
                  <a
                    href="#"
                    className={`btn-outline ${buttonClass}`}
                    data-react-handled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      console.log('[PromotionsList] Button clicked:', { 
                        promo: promo.title, 
                        isActive: promo.isActive, 
                        currentOpenModal: openModal, 
                        formId: promo.formId 
                      });
                      
                      // Используем нативное событие для stopImmediatePropagation
                      if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                        e.nativeEvent.stopImmediatePropagation();
                      }
                      
                      // Проверяем активность акции
                      if (!promo.isActive) {
                        console.log('[PromotionsList] Promotion is not active, ignoring');
                        return;
                      }
                      
                      // Открываем модальное окно
                      handleOpenModal(promo.formId, promo.title);
                    }}
                  >
                    {promo.buttonText || 'Получить скидку'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Модальные окна для каждой акции */}
      {promotions.map((promo, index) => {
        // Очищаем formId для создания modalId
        let cleanFormId = promo.formId || '';
        if (cleanFormId.includes(' ')) {
          cleanFormId = cleanFormId.split(' ').pop() || cleanFormId;
        }
        // Используем formId без суффикса -input для идентификации модального окна
        const modalId = promo.formId ? cleanFormId.replace('-input', '').trim() : `promotion-${promo.title.toLowerCase().replace(/\s+/g, '-')}`;
        // Используем очищенный formId или создаем новый
        const formId = cleanFormId || `promotion-${index}-input`;
        
        console.log('[PromotionsList] Rendering modal:', { 
          promo: promo.title, 
          originalFormId: promo.formId, 
          cleanFormId, 
          modalId, 
          formId, 
          isOpen: openModal === modalId 
        });
        
        return (
          <PromotionModal
            key={promo.id || index}
            isOpen={openModal === modalId}
            onClose={handleCloseModal}
            promotion={promo}
            formId={formId}
          />
        );
      })}
    </>
  );
}

