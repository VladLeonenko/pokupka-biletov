import { useState, useEffect } from 'react';
import { CookieSettingsModal } from './CookieSettingsModal';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import styles from './CookieConsentModal.module.css';

interface CookieConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CookieConsentModal({ open, onClose }: CookieConsentModalProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { acceptAll, rejectAll, hasConsent } = useCookieConsent();

  useEffect(() => {
    if (open && hasConsent) {
      onClose();
    }
  }, [open, hasConsent, onClose]);

  const handleAcceptAll = async () => {
    await acceptAll();
    onClose();
  };

  const handleRejectAll = async () => {
    await rejectAll();
    onClose();
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSettingsSaved = () => {
    setShowSettings(false);
    onClose();
  };

  if (showSettings) {
    return (
      <CookieSettingsModal
        open={showSettings}
        onClose={handleCloseSettings}
        onSave={handleSettingsSaved}
      />
    );
  }

  if (!open) return null;

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className={styles.row}>
        <div className={styles.copy}>
          <p id="cookie-consent-title" className={styles.title}>
            Cookie
          </p>
          <p id="cookie-consent-desc" className={styles.text}>
            Нужны, чтобы помнить корзину и понимать, что заходит. Рекламу сами не включаем.{' '}
            <a href="/cookies" className={styles.link}>
              Подробнее
            </a>
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={handleRejectAll}>
            Только нужные
          </button>
          <button type="button" className={styles.btnGhost} onClick={handleOpenSettings}>
            Настроить
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleAcceptAll}
          >
            Хорошо
          </button>
        </div>
      </div>
    </div>
  );
}
