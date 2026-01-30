import { useState } from 'react';
import { Box } from '@mui/material';

const services = [
  {
    id: 'web-site',
    title: 'Разработка сайтов',
    content: `Ищите где заказать сайт, как продвинуть свой проект в ТОП
      или веб-студию для выполнения IT задач? Тогда вы перешли по нужной ссылке.
      Персональный менеджер в кротчайшие сроки рассчитает стоимость проекта
      и отправит промо-материал для вашей компании.
      + Бесплатная консультация со специалистами технического отдела!`,
  },
  {
    id: 'mobile-dev',
    title: 'Мобильные приложения',
    content: `Разрабатываем удобные, производительные и нативные мобильные приложения для смартфонов, планшетов и других устройств. С помощью библиотеки JavaScript - React Native программисты создают кроссплатформенные приложения для операционных систем IOS и Android.`,
  },
  {
    id: 'design',
    title: 'Дизайн и графика',
    content: `В команде есть
      специалисты по UI/UX и моушн-дизайну, а так же 3D-графике.
     Дизайнеры, используя сервис графического редактора для создания прототипов сайтов и приложений Figma, могут разработать адаптивный макет сайта под любые устройства или мобильного приложения для IOS и Android, фирменный стиль - брендбук, логотип или баннер на основе
      технического задания.
     Современный, адаптивный и уникальный дизайн запомнится вашим клиентам и выделит среди конкурентов.`,
  },
  {
    id: 'seo',
    title: 'Продвижение',
    content: `Хотите заказать продвижение своего сайта? Вы в нужном месте. В нашей практике есть успешные и рабочие кейсы по продвижению бизнеса в digital.
      Маркетологи исследуют нишу вашей компании, проанализируют конкурентов, определят целевую аудиторию, выявят проблемы и разработают маркетинговую стратегию.
      SEO-специалисты выполнят сбор семантического ядра и оптимизацию на основе ключевых слов с целью охвата целевой аудитории и последующего перехода по высокочастотным и конкурентным запросам. Это необходимо для продвижения сайта в ТОП и настройки рекламных кабинетов. Благодаря работе SEO, сайт будет лучше ранжироваться в поисковиках и начнет поступать органический трафик.
      Директолог займется рекламными кампаниями в Яндекс.Директ. Создаст продающие объявления, снизит среднюю цену клика, настроит повышение % CTR, и многое другое.
      Все эти инструменты помогут увеличить продажи, повысить конверсию и наладить поток заявок. Узнаваемость бренда выйдет на новый уровень, а ваш бизнес начнет приносить прибыль.`,
  },
];

/**
 * Секция услуг с табами
 */
export function ServicesSection() {
  const [activeTab, setActiveTab] = useState('web-site');

  return (
    <div className="container">
      <section className="services d-flex gap-v-50 flex-column pt-150">
        <div className="header-section">
          <h2>Услуги</h2>
        </div>
        <div className="section__tabs d-flex gap-h-30 pt-60 flex-row">
          <div className="tabs__head d-flex flex-column col-4">
            {services.map((service) => (
              <div
                key={service.id}
                className={`tabs__caption d-flex jcsb ${activeTab === service.id ? 'tabs__caption_active' : ''}`}
                onClick={() => setActiveTab(service.id)}
                data-tab={service.id}
              >
                <h4>{service.title}</h4>
                <img src="/legacy/img/white-arrow-right.png" alt="white-arrow-right" />
              </div>
            ))}
          </div>
          <div className="tabs__body col-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`tabs__content d-flex flex-column gap-v-50 ${activeTab === service.id ? 'tabs__content_active' : ''}`}
                data-tab={service.id}
              >
                <p>{service.content}</p>
                <div className="header-advantages d-flex gap-h-30">
                  <p className="borderR">75+<br />проектов</p>
                  <p className="borderR">12+<br />сотрудников</p>
                  <p>10+<br />дней на заказ</p>
                </div>
                <div className="btn-mode">
                  <a href="/new-client" className="btn">Стать клиентом</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

