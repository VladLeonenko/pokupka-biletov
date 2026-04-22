import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { getApiBase } from '@/utils/apiBase';
import styles from './ContactFormSection.module.css';

export type ContactFormSectionProps = {
  /** Заголовок из CMS / витрины */
  title: string;
  /** Подзаголовок под заголовком */
  subtitle?: string;
};

const DEFAULT_SUBTITLE =
  'Напишите детали заказа или вопрос — ответим на указанную почту. Если нужно срочно, лучше позвоните по номеру выше.';

export function ContactFormSection({ title, subtitle = DEFAULT_SUBTITLE }: ContactFormSectionProps) {
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

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Укажите, как к вам обращаться';
    }

    if (!formData.tel.trim()) {
      newErrors.tel = 'Нужен телефон для связи';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Укажите email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Похоже, в адресе ошибка';
    }

    if (!formData.privacy_consent) {
      newErrors.privacy_consent = 'Нужно согласие на обработку данных';
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateForm();

    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors);
      if (errorMessages.length > 0) {
        showToast(errorMessages[0], 'error');
      } else {
        showToast('Заполните обязательные поля', 'error');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const API_BASE = getApiBase();
      const formId = 'contact-form';
      const response = await fetch(`${API_BASE}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          tel: formData.tel,
          email: formData.email,
          question: formData.question,
          privacy_consent: formData.privacy_consent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Не удалось отправить' }));
        throw new Error(errorData.error || 'Ошибка отправки');
      }

      await response.json();

      setSubmitSuccess(true);
      setFormData({ name: '', tel: '', email: '', question: '', privacy_consent: false });
      setErrors({});
      showToast('Сообщение отправлено — скоро ответим на почту.', 'success');

      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при отправке';
      setErrors({ submit: message });
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  return (
    <section
      id="contacts-form"
      className={styles.root}
      aria-labelledby="contacts-form-heading"
    >
      <div className={styles.accent} aria-hidden />
      <div className={styles.header}>
        <h2 id="contacts-form-heading" className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <form
        className={`${styles.form} ${isSubmitting ? styles.formSending : ''}`}
        onSubmit={handleSubmit}
        data-react-handled="true"
        noValidate
      >
        <div className={styles.grid2}>
          <div className={`${styles.field} ${errors.name ? styles.fieldError : ''}`}>
            <label className={styles.label} htmlFor="contact-name">
              Имя <span className={styles.req}>*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Как к вам обращаться"
              className={styles.input}
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name ? <p className={styles.errorText}>{errors.name}</p> : null}
          </div>

          <div className={`${styles.field} ${errors.tel ? styles.fieldError : ''}`}>
            <label className={styles.label} htmlFor="contact-tel">
              Телефон <span className={styles.req}>*</span>
            </label>
            <input
              id="contact-tel"
              type="tel"
              name="tel"
              autoComplete="tel"
              placeholder="+7 …"
              className={styles.input}
              value={formData.tel}
              onChange={handleChange}
            />
            {errors.tel ? <p className={styles.errorText}>{errors.tel}</p> : null}
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldFull} ${errors.email ? styles.fieldError : ''}`}>
          <label className={styles.label} htmlFor="contact-email">
            Email <span className={styles.req}>*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="name@example.com"
            className={styles.input}
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email ? <p className={styles.errorText}>{errors.email}</p> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-question">
            Сообщение
          </label>
          <textarea
            id="contact-question"
            name="question"
            placeholder="Заказ, возврат, вопрос по мероприятию…"
            className={styles.textarea}
            rows={5}
            value={formData.question}
            onChange={handleChange}
          />
        </div>

        <div className={`${styles.field} ${styles.privacy} ${errors.privacy_consent ? styles.fieldError : ''}`}>
          <label className={styles.privacyLabel} htmlFor="contact-privacy">
            <input
              id="contact-privacy"
              type="checkbox"
              name="privacy_consent"
              className={styles.checkbox}
              checked={formData.privacy_consent}
              onChange={handleChange}
            />
            <span>
              Согласен на{' '}
              <Link className={styles.privacyLink} to="/privacy" target="_blank" rel="noreferrer">
                обработку персональных данных
              </Link>
              <span className={styles.req}> *</span>
            </span>
          </label>
          {errors.privacy_consent ? <p className={styles.errorText}>{errors.privacy_consent}</p> : null}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? 'Отправляем…' : 'Отправить сообщение'}
          </button>

          {submitSuccess ? (
            <p className={styles.success} role="status">
              Готово — письмо ушло в поддержку. Проверьте почту, мы ответим в рабочее время.
            </p>
          ) : null}

          {errors.submit ? <p className={styles.submitError}>{errors.submit}</p> : null}
        </div>
      </form>
    </section>
  );
}
