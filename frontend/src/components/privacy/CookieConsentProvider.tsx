import { useEffect, useState, useRef, useCallback } from 'react';
import { CookieConsentModal } from './CookieConsentModal';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const STORAGE_KEY = 'cookie_consent';

function hasStoredConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.preferences && typeof parsed.preferences === 'object');
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

export function CookieConsentProvider() {
  const { hasConsent, acceptAll } = useCookieConsent();
  const [showModal, setShowModal] = useState(false);
  const checkedRef = useRef(false);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (hasStoredConsent()) {
      setShowModal(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!hasStoredConsent()) {
        setShowModal(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasConsent) {
      setShowModal(false);
    }
  }, [hasConsent]);

  const dismissWithAccept = useCallback(async () => {
    if (dismissingRef.current || hasStoredConsent()) {
      setShowModal(false);
      return;
    }
    dismissingRef.current = true;
    try {
      await acceptAll();
    } finally {
      setShowModal(false);
      dismissingRef.current = false;
    }
  }, [acceptAll]);

  /** Первый скролл/жест = продолжение работы с сайтом → закрываем баннер, не блокируем схему. */
  useEffect(() => {
    if (!showModal) return;

    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 400);

    const onInteract = () => {
      if (!armed) return;
      void dismissWithAccept();
    };

    window.addEventListener('scroll', onInteract, { passive: true, capture: true });
    window.addEventListener('touchmove', onInteract, { passive: true, capture: true });
    window.addEventListener('wheel', onInteract, { passive: true, capture: true });

    return () => {
      window.clearTimeout(armTimer);
      window.removeEventListener('scroll', onInteract, true);
      window.removeEventListener('touchmove', onInteract, true);
      window.removeEventListener('wheel', onInteract, true);
    };
  }, [showModal, dismissWithAccept]);

  const handleClose = () => {
    setShowModal(false);
  };

  return <CookieConsentModal open={showModal} onClose={handleClose} />;
}
