import { useEffect, useState } from 'react';
import { CookieConsentModal } from './CookieConsentModal';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieConsentProvider() {
  const { hasConsent, checkConsent } = useCookieConsent();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Проверяем согласие при загрузке
    const hasStoredConsent = checkConsent();
    
    // Показываем модальное окно только если согласия нет
    if (!hasStoredConsent) {
      // Небольшая задержка для лучшего UX
      setTimeout(() => {
        setShowModal(true);
      }, 1000);
    }
  }, []);

  const handleClose = () => {
    setShowModal(false);
  };

  return <CookieConsentModal open={showModal} onClose={handleClose} />;
}

