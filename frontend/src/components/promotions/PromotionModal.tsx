import { useState, FormEvent, useEffect } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { submitForm } from '@/services/cmsApi';

interface Promotion {
  id?: number;
  title: string;
  description?: string;
  formId?: string | null;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion;
  formId: string;
}

/**
 * Модальное окно с формой для получения акции
 */
export function PromotionModal({ isOpen, onClose, promotion, formId }: PromotionModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    tel: '',
    privacy_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Генерируем уникальный ID для модального окна
  const modalId = `popup-${formId.replace('-input', '')}`;

  // Отслеживаем размер экрана для адаптивности
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Восстанавливаем скролл при закрытии
      document.body.style.overflow = '';
      return;
    }

    // Закрытие по Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // Сохраняем текущее значение overflow
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // Блокируем скролл при открытом модальном окне

    // Применяем стили для переопределения legacy CSS после рендера
    const applyStyles = () => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        modalElement.style.setProperty('position', 'fixed', 'important');
        modalElement.style.setProperty('top', '0', 'important');
        modalElement.style.setProperty('left', '0', 'important');
        modalElement.style.setProperty('right', '0', 'important');
        modalElement.style.setProperty('bottom', '0', 'important');
        modalElement.style.setProperty('width', '100vw', 'important');
        modalElement.style.setProperty('height', '100vh', 'important');
        modalElement.style.setProperty('margin', '0', 'important');
        modalElement.style.setProperty('padding', '0', 'important');
        modalElement.style.setProperty('transform', 'none', 'important');
        modalElement.style.setProperty('display', 'flex', 'important');
        modalElement.style.setProperty('alignItems', 'center', 'important');
        modalElement.style.setProperty('justifyContent', 'center', 'important');
        modalElement.style.setProperty('zIndex', '10000', 'important');
      }
    };

    // Применяем стили сразу и после небольшой задержки
    applyStyles();
    setTimeout(applyStyles, 0);
    setTimeout(applyStyles, 50);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow; // Восстанавливаем скролл
    };
  }, [isOpen, onClose, modalId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите имя';
    }

    if (!formData.tel.trim()) {
      newErrors.tel = 'Введите номер телефона';
    }

    if (!formData.privacy_consent) {
      newErrors.privacy_consent = 'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) {
      const firstError = Object.values(errors)[0];
      if (firstError) {
        showToast(firstError, 'error');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await submitForm(formId, {
        name: formData.name,
        tel: formData.tel,
        promotion_title: promotion.title,
        privacy_consent: formData.privacy_consent,
      });

      showToast('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.', 'success');
      setFormData({ name: '', tel: '', privacy_consent: false });
      setErrors({});
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      const errorMessage = error.message || 'Ошибка при отправке формы';
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Не рендерим модальное окно, если оно не открыто
  if (!isOpen) return null;

  return (
    <div 
      id={modalId} 
      className="show_popup"
      data-react-handled="true"
      data-cursor-managed="react"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        margin: 0,
        padding: 0,
        transform: 'none',
        cursor: 'default',
      }}
      onClick={(e) => {
        // Закрытие по клику на фон (на сам popup, а не на его содержимое)
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseDown={(e) => {
        // Предотвращаем конфликты с legacy скриптами
        e.stopPropagation();
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#141414',
          color: '#fff',
          width: '90%',
          maxWidth: '340px',
          padding: isMobile ? '60px 20px 40px' : '100px 30px 50px',
          borderRadius: '5px',
          boxShadow: '0 0 125px 0 rgb(0, 0, 0), 0 0 10000px 500px rgba(0, 0, 0, 0.75)',
          textAlign: 'center',
          overflowY: 'auto',
          maxHeight: '90vh',
          margin: '20px',
          transform: 'none',
          left: 'auto',
          top: 'auto',
          cursor: 'default',
        }}
        onClick={(e) => {
          // Предотвращаем закрытие при клике на содержимое модального окна
          e.stopPropagation();
        }}
      >
      <a
        href="#"
        className="closePopup"
        data-react-handled="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Используем нативное событие для stopImmediatePropagation
          if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
            e.nativeEvent.stopImmediatePropagation();
          }
          onClose();
        }}
        style={{
          position: 'absolute',
          top: isMobile ? '10px' : '20px',
          right: isMobile ? '10px' : '20px',
          height: '25px',
          width: '25px',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          padding: 0,
        }}
      >
        <svg
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <path
            d="M18.75 6.25L6.25 18.75M6.25 6.25L18.75 18.75"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
      <h2>{promotion.title}</h2>
      <form
        action=""
        className="mt-20 d-flex flex-column"
        id={`${formId}-input`}
        onSubmit={handleSubmit}
        data-react-handled="true"
        onClick={(e) => {
          // Предотвращаем всплытие клика на форму
          e.stopPropagation();
        }}
      >
        <div className={`form-item ${errors.name ? '_error' : ''}`}>
          <input
            type="text"
            className={`mt-15 _req-${formId.replace('-input', '')} ${errors.name ? '_error' : ''}`}
            placeholder="Введите имя"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>
        <div className={`form-item ${errors.tel ? '_error' : ''}`}>
          <input
            type="tel"
            className={`mt-15 _req-${formId.replace('-input', '')} ${errors.tel ? '_error' : ''}`}
            placeholder="Введите номер телефона"
            name="tel"
            value={formData.tel}
            onChange={handleChange}
            required
          />
          {errors.tel && <span className="error-message">{errors.tel}</span>}
        </div>
        <div className={`form-item ${errors.privacy_consent ? '_error' : ''}`} style={{ marginTop: '15px' }}>
          <label className="d-flex gap-h-15 align-items-center" style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4', color: '#B9B9B9' }}>
            <input
              type="checkbox"
              name="privacy_consent"
              checked={formData.privacy_consent}
              onChange={handleChange}
              required
              style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, accentColor: '#FFBB00' }}
            />
            <span>
              Я согласен на{' '}
              <a href="/privacy" target="_blank" style={{ color: '#FFBB00', textDecoration: 'underline' }}>
                обработку персональных данных
              </a>
              <span style={{ color: '#ff4444' }}> *</span>
            </span>
          </label>
          {errors.privacy_consent && (
            <div style={{ color: '#ff4444', marginTop: '5px', fontSize: '12px', paddingLeft: '28px' }}>
              {errors.privacy_consent}
            </div>
          )}
        </div>
        {errors.submit && (
          <p style={{ color: '#f44336', marginTop: '10px', fontSize: '14px' }}>
            {errors.submit}
          </p>
        )}
        <button
          type="submit"
          className="btn-outline mt-30"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </button>
      </form>
      </div>
    </div>
  );
}

