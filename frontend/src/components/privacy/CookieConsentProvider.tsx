import { useEffect, useState, useRef } from 'react';
import { CookieConsentModal } from './CookieConsentModal';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieConsentProvider() {
  const { hasConsent } = useCookieConsent();
  const [showModal, setShowModal] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Проверяем согласие только один раз при монтировании
    if (checkedRef.current) return;
    checkedRef.current = true;
    
    try {
      const consentData = localStorage.getItem('cookie_consent');
      if (consentData) {
        try {
          const parsed = JSON.parse(consentData);
          if (parsed && typeof parsed === 'object' && parsed.consent === true) {
            // Согласие есть, не показываем модальное окно
            setShowModal(false);
            return;
          }
        } catch {
          // Если данные повреждены, очищаем
          localStorage.removeItem('cookie_consent');
        }
      }
      
      // Если согласия нет, показываем модальное окно с задержкой
      if (!hasConsent) {
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('[CookieConsentProvider] Error checking consent:', error);
    }
  }, []); // Пустой массив зависимостей - проверяем только при монтировании

  // Отдельный эффект для отслеживания изменений hasConsent
  useEffect(() => {
    if (hasConsent) {
      setShowModal(false);
    }
  }, [hasConsent]);

  const handleClose = () => {
    setShowModal(false);
  };

  return <CookieConsentModal open={showModal} onClose={handleClose} />;
}

