import { useState, FormEvent } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { submitForm } from '@/services/cmsApi';

/**
 * Форма "Стать клиентом" на странице /new-client
 */
export function NewClientForm() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    company: '',
    difficulties: '',
    task: '',
    expectations: '',
    money: '',
    name: '',
    tel: '',
    email: '',
    commit: '',
    privacy_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,8})+$/.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Обязательные поля из анкеты
    if (!formData.company.trim()) {
      newErrors.company = 'Расскажите о вашем бизнесе';
    }
    if (!formData.difficulties.trim()) {
      newErrors.difficulties = 'Опишите трудности, с которыми вы столкнулись';
    }
    if (!formData.task.trim()) {
      newErrors.task = 'Опишите задачу, которую вы перед собой ставите';
    }
    if (!formData.expectations.trim()) {
      newErrors.expectations = 'Опишите ваши ожидания';
    }
    if (!formData.money.trim()) {
      newErrors.money = 'Укажите бюджет';
    }

    // Контактные данные
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

    // Согласие на обработку персональных данных
    if (!formData.privacy_consent) {
      newErrors.privacy_consent = 'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      // Показываем первую ошибку через toast
      const firstError = Object.values(errors)[0];
      if (firstError) {
        showToast(firstError, 'error');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      await submitForm('new-client-form', formData);
      
      setSubmitSuccess(true);
      setFormData({
        company: '',
        difficulties: '',
        task: '',
        expectations: '',
        money: '',
        name: '',
        tel: '',
        email: '',
        commit: '',
        privacy_consent: false,
      });
      setErrors({});
      showToast('Спасибо! Ваша анкета отправлена. Мы свяжемся с вами в ближайшее время.', 'success');

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
    <div className="new-client-form">
      <form
        id="new-client-form"
        onSubmit={handleSubmit}
        method="POST"
        className={isSubmitting ? '_sending' : ''}
        data-react-handled="true"
      >
        {/* Вопросы анкеты */}
        <div className={`questions ${errors.company ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="company">
            1. Расскажите о вашем бизнесе
          </label>
          <p>
            Название компании, основная деятельность, чем занимаетесь. Если у вас уже есть сайт — поделитесь ссылкой, 
            это поможет нам лучше понять ваш проект.
          </p>
          <input
            className={`questionnaire company _req-client ${errors.company ? '_error' : ''}`}
            type="text"
            name="company"
            id="company"
            placeholder="Например: интернет-магазин электроники, студия дизайна, консалтинговая компания"
            value={formData.company}
            onChange={handleChange}
            required
          />
          {errors.company && <span className="error-message">{errors.company}</span>}
        </div>

        <div className={`questions ${errors.difficulties ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="difficulties">
            2. С какими трудностями вы столкнулись?
          </label>
          <p>
            Ваш бизнес не приносит желаемый доход? Недостаточно продаж? Мало заявок? Нет новых клиентов? 
            Напишите, какие проблемы испытывает компания в данный момент.
          </p>
          <input
            className={`questionnaire difficulties _req-client ${errors.difficulties ? '_error' : ''}`}
            type="text"
            name="difficulties"
            id="difficulties"
            value={formData.difficulties}
            onChange={handleChange}
            required
          />
          {errors.difficulties && <span className="error-message">{errors.difficulties}</span>}
        </div>

        <div className={`questions ${errors.task ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="task">
            3. Какую цель вы хотите достичь?
          </label>
          <p>
            Что именно нужно вашему бизнесу? Новый сайт, мобильное приложение, продвижение в интернете, 
            редизайн или что-то другое? Опишите желаемый результат.
          </p>
          <input
            className={`questionnaire task _req-client ${errors.task ? '_error' : ''}`}
            type="text"
            name="task"
            id="task"
            placeholder="Например: создать современный сайт, запустить мобильное приложение, увеличить продажи"
            value={formData.task}
            onChange={handleChange}
            required
          />
          {errors.task && <span className="error-message">{errors.task}</span>}
        </div>

        <div className={`questions ${errors.expectations ? '_error' : ''}`}>
          <label className="labelInput" htmlFor="expectations">
            4. Каких результатов вы ждёте?
          </label>
          <p>
            Что должно измениться после реализации проекта? Больше клиентов, рост продаж, удобство для пользователей? 
            Также укажите желаемые сроки, если они важны.
          </p>
          <input
            className={`questionnaire expectations _req-client ${errors.expectations ? '_error' : ''}`}
            type="text"
            name="expectations"
            id="expectations"
            placeholder="Например: увеличить заявки на 30%, запустить проект за 2 месяца"
            value={formData.expectations}
            onChange={handleChange}
            required
          />
          {errors.expectations && <span className="error-message">{errors.expectations}</span>}
        </div>

        <div className={`questions ${errors.money ? '_error' : ''}`}>
          <label className="labelInput _req-client" htmlFor="money">
            5. Какой бюджет планируете?
          </label>
          <p>
            Укажите примерный диапазон бюджета, который вы готовы выделить на проект. 
            Это поможет нам предложить оптимальное решение под ваши возможности.
          </p>
          <input
            className={`questionnaire money _req-client ${errors.money ? '_error' : ''}`}
            type="text"
            name="money"
            id="money"
            placeholder="Например: от 200 000 до 500 000 рублей"
            value={formData.money}
            onChange={handleChange}
            required
          />
          {errors.money && <span className="error-message">{errors.money}</span>}
        </div>

        <h2 className="mb-40 mt-80">Контактные данные</h2>
        <div className="standart__form__wrapper d-flex flex-wrap">
          <div className={`questions ${errors.name ? '_error' : ''}`}>
            <label className="labelInput" htmlFor="name">
              Имя
            </label>
            <input
              type="text"
              className={`_req-client ${errors.name ? '_error' : ''}`}
              name="name"
              placeholder="Введите имя"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className={`questions ${errors.tel ? '_error' : ''}`}>
            <label className="labelInput" htmlFor="tel">
              Телефон
            </label>
            <input
              type="tel"
              className={`_req-client ${errors.tel ? '_error' : ''}`}
              name="tel"
              placeholder="Введите номер телефона"
              id="tel"
              value={formData.tel}
              onChange={handleChange}
              required
            />
            {errors.tel && <span className="error-message">{errors.tel}</span>}
          </div>

          <div className={`questions ${errors.email ? '_error' : ''}`}>
            <label className="labelInput" htmlFor="email">
              Электронная почта
            </label>
            <input
              type="email"
              name="email"
              placeholder="Введите email"
              id="email"
              className={errors.email ? '_error' : ''}
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="questions">
            <label className="labelInput" htmlFor="commit">
              Дополнительная информация
            </label>
            <input
              type="text"
              name="commit"
              placeholder="Любая дополнительная информация, которая может быть полезна"
              id="commit"
              value={formData.commit}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="submit__form d-flex flex-column">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
            <button
              type="submit"
              className="btn-small"
              style={{ width: '50%', flexShrink: 0 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
            {submitSuccess && (
              <p style={{ color: '#4caf50', margin: 0 }}>
                Анкета успешно отправлена!
              </p>
            )}
            {errors.submit && (
              <p style={{ color: '#f44336', margin: 0 }}>
                {errors.submit}
              </p>
            )}
          </div>
          <div className={`form-item ${errors.privacy_consent ? '_error' : ''}`} style={{ width: '100%' }}>
            <label className="d-flex gap-h-15 align-items-center" style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4', color: '#B9B9B9' }}>
              <input
                type="checkbox"
                name="privacy_consent"
                id="privacy_consent_new_client"
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

