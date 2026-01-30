import { useState, FormEvent } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { getApiBase } from '@/utils/apiBase';

/**
 * Секция с формой обратной связи на странице /contacts
 */
export function ContactFormSection() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    tel: '',
    email: '',
    question: '',
    privacy_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,8})+$/.test(email);
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите имя';
    }

    if (!formData.tel.trim()) {
      newErrors.tel = 'Введите номер телефона';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!formData.privacy_consent) {
      newErrors.privacy_consent = 'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидируем форму
    const validation = validateForm();
    
    if (!validation.isValid) {
      // Показываем первую ошибку через toast
      const errorMessages = Object.values(validation.errors);
      if (errorMessages.length > 0) {
        showToast(errorMessages[0], 'error');
      } else {
        showToast('Пожалуйста, заполните все обязательные поля', 'error');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // Отправляем через публичный API форм
      const API_BASE = getApiBase();
      
      const formId = 'contact-form';
      const response = await fetch(`${API_BASE}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          tel: formData.tel,
          email: formData.email,
          question: formData.question,
          privacy_consent: formData.privacy_consent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка отправки формы' }));
        throw new Error(errorData.error || 'Ошибка отправки формы');
      }

      await response.json();

      setSubmitSuccess(true);
      setFormData({ name: '', tel: '', email: '', question: '', privacy_consent: false });
      setErrors({});
      showToast('Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.', 'success');

      // Скрываем сообщение об успехе через 5 секунд
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error: any) {
      console.error('Form submission error:', error);
      const errorMessage = error.message || 'Ошибка при отправке формы';
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Убираем ошибку при вводе
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div id="contacts-form" className="contacts-form">
      <div className="form-header">
        <h3>Обратная связь</h3>
      </div>
      <form
        id="contact-form"
        onSubmit={handleSubmit}
        className={`d-flex flex-column gap-v-15 ${isSubmitting ? '_sending' : ''}`}
        data-react-handled="true"
      >
        <div className={`form-item ${errors.name ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="name">
            Имя
          </label>
          <input
            type="text"
            name="name"
            placeholder="Введите имя"
            id="name"
            className="_req"
            value={formData.name}
            onChange={handleChange}
            required
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className={`form-item ${errors.tel ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="tel">
            Телефон
          </label>
          <input
            type="tel"
            name="tel"
            placeholder="Введите номер телефона"
            id="tel"
            className="_req"
            value={formData.tel}
            onChange={handleChange}
            required
          />
          {errors.tel && <span className="error-message">{errors.tel}</span>}
        </div>

        <div className={`form-item ${errors.email ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="email">
            Электронная почта
          </label>
          <input
            type="email"
            name="email"
            placeholder="Введите email"
            id="email"
            className="_req _email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-item">
          <label className="labelInput" htmlFor="question">
            Ваш вопрос
          </label>
          <textarea
            className="question-input"
            name="question"
            placeholder="Введите вопрос"
            id="question"
            value={formData.question}
            onChange={handleChange}
          />
        </div>

        <div className="submit-form">
          <input
            type="submit"
            className="submit-btn jcc"
            value={isSubmitting ? 'Отправка...' : 'Отправить'}
            id="submit"
            disabled={isSubmitting}
          />
          {submitSuccess && (
            <p className="pt-15" style={{ color: '#4caf50' }}>
              Сообщение успешно отправлено!
            </p>
          )}
          {errors.submit && (
            <p className="pt-15" style={{ color: '#f44336' }}>
              {errors.submit}
            </p>
          )}
          <div className={`form-item ${errors.privacy_consent ? '_error' : ''}`} style={{ marginTop: '15px' }}>
            <label className="d-flex gap-h-15 align-items-center" style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4', color: '#B9B9B9' }}>
              <input
                type="checkbox"
                name="privacy_consent"
                id="privacy_consent"
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
        </div>
      </form>
    </div>
  );
}

