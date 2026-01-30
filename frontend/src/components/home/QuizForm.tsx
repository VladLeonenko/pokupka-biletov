import { useState, useEffect } from 'react';
import { submitQuizForm as submitQuizFormApi } from '@/services/publicApi';
import { useToast } from '@/components/common/ToastProvider';

interface QuizFormData {
  // Вопрос 1: Цели
  seo?: boolean;
  'web-site'?: boolean;
  'mobile-app'?: boolean;
  design?: boolean;
  
  // Вопрос 2: Тип деятельности
  ecommerce?: boolean;
  services?: boolean;
  production?: boolean;
  finance?: boolean;
  consulting?: boolean;
  other?: boolean;
  
  // Вопрос 3: Дополнительные услуги
  direct?: boolean;
  filling?: boolean;
  crm?: boolean;
  smm?: boolean;
  target?: boolean;
  marketing?: boolean;
  seo?: boolean; // SEO-продвижение (отдельно от seo в вопросе 1)
  photo?: boolean;
  
  // Вопрос 4: Промокод
  promocode?: string;
  
  // Вопрос 5: Контакты
  'quiz-name'?: string;
  'quiz-tel'?: string;
  'quiz-email'?: string;
  
  // Согласие
  privacy?: boolean;
}

/**
 * Форма калькулятора стоимости (Quiz) - полностью на React
 */
export function QuizForm() {
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<QuizFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Инициализация quiz формы через legacy скрипт для совместимости
    if (typeof window !== 'undefined' && (window as any).showTab) {
      (window as any).showTab(0);
    }
  }, []);

  const validateTab = (tabIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (tabIndex === 0) {
      // Вопрос 1: хотя бы один чекбокс
      const hasChecked = formData.seo || formData['web-site'] || formData['mobile-app'] || formData.design;
      if (!hasChecked) {
        newErrors['tab-0'] = 'Выберите хотя бы один вариант';
      }
    } else if (tabIndex === 1) {
      // Вопрос 2: хотя бы один чекбокс
      const hasChecked = formData.ecommerce || formData.services || formData.production || 
                        formData.finance || formData.consulting || formData.other;
      if (!hasChecked) {
        newErrors['tab-1'] = 'Выберите хотя бы один вариант';
      }
    } else if (tabIndex === 4) {
      // Вопрос 5: контакты обязательны
      if (!formData['quiz-name'] || formData['quiz-name'].trim() === '') {
        newErrors['quiz-name'] = 'Имя обязательно';
      }
      if (!formData['quiz-tel'] || formData['quiz-tel'].trim() === '' || formData['quiz-tel'].trim() === '+7') {
        newErrors['quiz-tel'] = 'Телефон обязателен';
      }
      if (!formData['quiz-email'] || formData['quiz-email'].trim() === '') {
        newErrors['quiz-email'] = 'Email обязателен';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData['quiz-email'])) {
          newErrors['quiz-email'] = 'Введите корректный email';
        }
      }
      if (!formData.privacy) {
        newErrors.privacy = 'Необходимо согласие на обработку персональных данных';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateTab(currentTab)) {
      return;
    }

    if (currentTab < 5) {
      setCurrentTab(currentTab + 1);
      if (typeof window !== 'undefined' && (window as any).showTab) {
        (window as any).showTab(currentTab + 1);
      }
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
      if (typeof window !== 'undefined' && (window as any).showTab) {
        (window as any).showTab(currentTab - 1);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateTab(currentTab)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSend: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof QuizFormData];
        if (value !== undefined && value !== null) {
          if (typeof value === 'boolean') {
            if (value) {
              dataToSend[key] = '1';
            }
          } else {
            dataToSend[key] = String(value);
          }
        }
      });

      await submitQuizFormApi(dataToSend);
      setCurrentTab(5); // Финальная вкладка
    } catch (error) {
      console.error('Error submitting quiz form:', error);
      showToast('Произошла ошибка при отправке формы. Попробуйте позже.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="container">
      <section className="quiz-block d-flex gap-v-50 flex-column">
        <div className="header-section">
          <h2>Калькулятор стоимости проекта</h2>
          <p>Ответьте на несколько вопросов, и мы подготовим для вас лучшее коммерческое предложение. В подарок - консультация со специалистом технического отдела.</p>
        </div>
        <div className="d-flex gap-h-40 jcsb quiz-question-block">
        <form id="quizForm" action="" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Tab 1: Цели */}
          <div className="tab" style={{ display: currentTab === 0 ? 'block' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10">
              <p>01 <span>/</span></p>
              <h3>Какая у вас цель?</h3>
            </div>
            <div className="qustion-1 question-tab">
              <label>
                <input
                  type="checkbox"
                  className="seo quiz-question-content"
                  value="seo"
                  name="seo"
                  checked={!!formData.seo}
                  onChange={(e) => handleChange('seo', e.target.checked)}
                />
                <div className="d-flex flex-column question-img">
                  <img src="/legacy/img/seo.png" alt="seo продвижение под ключ" />
                  <h5>Продвижение</h5>
                </div>
              </label>
              <label>
                <input
                  type="checkbox"
                  className="web-site quiz-question-content"
                  value="web-site"
                  name="web-site"
                  checked={!!formData['web-site']}
                  onChange={(e) => handleChange('web-site', e.target.checked)}
                />
                <div className="d-flex flex-column question-img tac">
                  <img src="/legacy/img/web-site.png" alt="Создание сайта под ключ" />
                  <h5>Разработка сайта</h5>
                </div>
              </label>
              <label>
                <input
                  type="checkbox"
                  className="mobile-app quiz-question-content"
                  value="mobile-app"
                  name="mobile-app"
                  checked={!!formData['mobile-app']}
                  onChange={(e) => handleChange('mobile-app', e.target.checked)}
                />
                <div className="d-flex flex-column question-img tac">
                  <img src="/legacy/img/mobile-app.png" alt="Создание Мобильного приложения под ключ" />
                  <h5>Мобильное<br />приложение</h5>
                </div>
              </label>
              <label>
                <input
                  type="checkbox"
                  className="design quiz-question-content"
                  value="design"
                  name="design"
                  checked={!!formData.design}
                  onChange={(e) => handleChange('design', e.target.checked)}
                />
                <div className="d-flex flex-column question-img">
                  <img src="/legacy/img/design.png" alt="Веб-дизайн сайта под ключ" />
                  <h5>Дизайн</h5>
                </div>
              </label>
            </div>
            {errors['tab-0'] && <div style={{ color: '#ff4444', marginTop: '10px' }}>{errors['tab-0']}</div>}
          </div>

          {/* Tab 2: Вид деятельности */}
          <div className="tab" style={{ display: currentTab === 1 ? 'block' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10">
              <p>02 <span>/</span></p>
              <h3>Вид вашей деятельности</h3>
            </div>
            <div className="qustion-2 question-tab">
              {[
                { name: 'ecommerce', img: 'ecommerce.png', alt: 'Сайт каталог для продажи товаров', label: 'Продажа товаров' },
                { name: 'services', img: 'services.png', alt: 'Сайт для продажи услуг', label: 'Оказание услуг' },
                { name: 'production', img: 'production.png', alt: 'Сайт для компании с производством', label: 'Производство' },
                { name: 'finance', img: 'finance.png', alt: 'Сайт для финансовой компании', label: 'Финансы' },
                { name: 'consulting', img: 'consulting.png', alt: 'Сайт для консалтинговой компании', label: 'Консалтинг' },
                { name: 'other', img: 'another.png', alt: 'Сайт для компании', label: 'Другое' },
              ].map((item) => (
                <label key={item.name}>
                  <input
                    type="checkbox"
                    className={`${item.name} quiz-question-content`}
                    value={item.name}
                    name={item.name}
                    checked={!!formData[item.name as keyof QuizFormData]}
                    onChange={(e) => handleChange(item.name, e.target.checked)}
                  />
                  <div className="d-flex flex-column question-img">
                    <img src={`/legacy/img/${item.img}`} alt={item.alt} />
                    <h5>{item.label}</h5>
                  </div>
                </label>
              ))}
            </div>
            {errors['tab-1'] && <div style={{ color: '#ff4444', marginTop: '10px' }}>{errors['tab-1']}</div>}
          </div>

          {/* Tab 3: Дополнительные услуги */}
          <div className="tab" style={{ display: currentTab === 2 ? 'block' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10">
              <p>03 <span>/</span></p>
              <h3>Дополнительные услуги</h3>
            </div>
            <div className="question-3">
              {[
                { id: 'direct', name: 'direct', label: 'Яндекс Директ', desc: 'Запускаем рекламу в Яндекс.Директ' },
                { id: 'filling', name: 'filling', label: 'Наполнение сайта', desc: 'Наполним ваш сайт контентом' },
                { id: 'crm', name: 'crm', label: 'Нужна интеграция с CRM', desc: 'Интегрируем популярные CRM-системы, такие как Bitrix24 или Amo CRM' },
                { id: 'smm', name: 'smm', label: 'Нужен SMM', desc: 'Нужен SMM, VK, You Tube' },
                { id: 'target', name: 'target', label: 'Настройка таргетированной рекламы', desc: 'Настроем рекламу в соц. сетях' },
                { id: 'marketing', name: 'marketing', label: 'Маркетинг-стратегия', desc: 'Нужны услуги маркетолога' },
                { id: 'seo-service', name: 'seo', label: 'SEO-продвижение', desc: 'Нужно SEO-продвижение' },
                { id: 'photo', name: 'photo', label: 'Фото/Видео контент', desc: 'Нужен фото/видео контент' },
              ].map((item) => (
                <div key={item.id} className="question-3-item">
                  <label className="d-flex gap-h-15 align-items-center">
                    <input
                      type="checkbox"
                      id={item.id}
                      value={item.name}
                      name={item.name}
                      className="checkbox"
                      checked={!!formData[item.name as keyof QuizFormData]}
                      onChange={(e) => handleChange(item.name, e.target.checked)}
                    />
                    <span></span>
                    {item.label}
                  </label>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab 4: Промокод */}
          <div className="tab" style={{ display: currentTab === 3 ? 'block' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10">
              <p>04 <span>/</span></p>
              <h3>Скидка %</h3>
            </div>
            <div className="question-4">
              <h5>Найдите на нашем сайте спрятанное слово-промокод и получите скидку</h5>
              <input
                type="text"
                placeholder="Введите найденный промокод"
                name="promocode"
                value={formData.promocode || ''}
                onChange={(e) => handleChange('promocode', e.target.value)}
              />
            </div>
          </div>

          {/* Tab 5: Контакты */}
          <div className="tab" style={{ display: currentTab === 4 ? 'block' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10">
              <p>05 <span>/</span></p>
              <h3>Контакты</h3>
            </div>
            <div className="question-5">
              <h5>Напишите куда нам отправить ваше коммерческое предложение</h5>
              <div className="d-flex flex-column gap-v-15 mt-30">
                <label htmlFor="quiz-name">Имя</label>
                <input
                  type="text"
                  placeholder="Введите ваше имя"
                  id="quiz-name"
                  name="quiz-name"
                  className={`_req-quiz ${errors['quiz-name'] ? 'invalid' : ''}`}
                  value={formData['quiz-name'] || ''}
                  onChange={(e) => handleChange('quiz-name', e.target.value)}
                />
                {errors['quiz-name'] && <div style={{ color: '#ff4444', marginTop: '5px', fontSize: '14px' }}>{errors['quiz-name']}</div>}
              </div>
              <div className="d-flex mt-15 gap-h-15">
                <div className="d-flex flex-column gap-v-15 col-5">
                  <label htmlFor="quiz-tel">Телефон</label>
                  <input
                    type="tel"
                    placeholder="Введите номер телефона"
                    id="quiz-tel"
                    className={`_req-quiz ${errors['quiz-tel'] ? 'invalid' : ''}`}
                    name="quiz-tel"
                    value={formData['quiz-tel'] || ''}
                    onChange={(e) => handleChange('quiz-tel', e.target.value)}
                  />
                  {errors['quiz-tel'] && <div style={{ color: '#ff4444', marginTop: '5px', fontSize: '14px' }}>{errors['quiz-tel']}</div>}
                </div>
                <div className="d-flex flex-column gap-v-15 col-5">
                  <label htmlFor="quiz-email">Электронная почта</label>
                  <input
                    type="email"
                    placeholder="Введите email"
                    id="quiz-email"
                    className={`_req-quiz _email ${errors['quiz-email'] ? 'invalid' : ''}`}
                    name="quiz-email"
                    value={formData['quiz-email'] || ''}
                    onChange={(e) => handleChange('quiz-email', e.target.value)}
                  />
                  {errors['quiz-email'] && <div style={{ color: '#ff4444', marginTop: '5px', fontSize: '14px' }}>{errors['quiz-email']}</div>}
                </div>
              </div>
              <div className="question-5-item mt-30">
                <label className="d-flex gap-h-15 align-items-center" style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4', color: '#B9B9B9' }}>
                  <input
                    type="checkbox"
                    value="privacy"
                    name="privacy"
                    className="checkbox-squere"
                    checked={!!formData.privacy}
                    onChange={(e) => handleChange('privacy', e.target.checked)}
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
                {errors.privacy && (
                  <div style={{ color: '#ff4444', marginTop: '5px', fontSize: '12px', paddingLeft: '28px' }}>
                    {errors.privacy}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab 6: Финальная */}
          <div className="tab d-flex flex-column jcc" style={{ display: currentTab === 5 ? 'flex' : 'none' }}>
            <div className="tab-headear d-flex flex-row align-items-center gap-h-10 final-quiz-tab">
              <h5>Спасибо за уделённое время. Мы уже получили ваши ответы и в ближайшее время отправим Вам сообщение.</h5>
            </div>
            <div className="question-6">
              <img src="/legacy/img/success-icon.png" alt="success-icon" />
              <div className="d-flex mt-50 gap-h-25">
                <div className="d-flex gap-h-15 col-5">
                  <img src="/legacy/img/brif-icon.png" alt="brif-icon" className="big-icon" />
                  <div className="brif d-flex gap-v-15 flex-column">
                    <h5>Заполнить бриф онлайн</h5>
                    <p>Для персонального расчёта стоимости вашего проекта</p>
                    <a className="d-flex jce gap-h-25 yellow" href="/">
                      Подробнее
                      <img src="/legacy/img/yellow-arrow-right.png" alt="yellow-arrow-right" />
                    </a>
                  </div>
                </div>
                <div className="d-flex gap-h-15 col-5">
                  <img src="/legacy/img/promo-icon.png" alt="promo-icon" className="big-icon" />
                  <div className="promo d-flex gap-v-15 flex-column">
                    <h5>Получить промо-материал</h5>
                    <p>Портфолио и презентация в <br />PDF формате</p>
                    <a className="d-flex jce gap-h-25 yellow" href="/">
                      Подробнее
                      <img src="/legacy/img/yellow-arrow-right.png" alt="yellow-arrow-right" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {currentTab < 5 && (
            <div style={{ overflow: 'auto' }} className="mt-50">
              <div className="d-flex gap-h-20 align-items-center">
                {currentTab > 0 && (
                  <button type="button" id="prevBtn" className="btn-small" onClick={handlePrev}>
                    Назад
                  </button>
                )}
                <button
                  type="button"
                  id="nextBtn"
                  className="btn-small"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {currentTab === 4 ? 'Отправить' : 'Далее'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="subscribe text-align-center d-flex gap-v-45 flex-column">
          <div className="subscribe-header d-flex gap-v-15 flex-column">
            <h5>Узнайте стоимость своего проекта</h5>
            <p>Ответьте на несколько вопросов, и мы подготовим для вас коммерческое предложение. В подарок - консультация со специалистом технического отдела.</p>
          </div>
          <div className="promo d-flex gap-v-15 flex-column">
            <h5>Получить промо-материал</h5>
            <p>Портфолио и презентация в PDF формате</p>
            <a className="d-flex jce gap-h-25 yellow" href="/">
              Подробнее
              <img src="/legacy/img/yellow-arrow-right.png" alt="yellow-arrow-right" />
            </a>
          </div>
          <div className="brif d-flex gap-v-15 flex-column">
            <h5>Заполнить бриф онлайн</h5>
            <p>Заполняйте онлайн-бриф прямо сейчас и в ближайшее время получите подробный персональный расчёт стоимости вашего проекта</p>
            <a className="d-flex jce gap-h-25 yellow" href="https://docs.google.com/forms/d/e/1FAIpQLSct6OIVCAb14dtjp5uu_74fXhEGFf4Ds5nZ5CH9Ux0Y6DKcTg/viewform?usp=sf_link">
              Подробнее
              <img src="/legacy/img/yellow-arrow-right.png" alt="yellow-arrow-right" />
            </a>
          </div>
          <div className="callback d-flex gap-v-15 flex-column">
            <div className="callback-form">
              <h5>Заказать обратный звонок</h5>
              <form action="/api/public/callback" className="mt-20 d-flex flex-column" id="callback-form" method="POST">
                <label htmlFor="callback-input">Телефон</label>
                <input type="tel" id="callback-input" className="mt-15 _req" name="tel" placeholder="Введите номер телефона" />
                <input type="submit" className="btn-outline mt-30" value="Отправить" />
              </form>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
