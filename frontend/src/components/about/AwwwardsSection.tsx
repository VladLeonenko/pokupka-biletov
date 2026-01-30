import { useQuery } from '@tanstack/react-query';
import { getPublicAwards } from '@/services/awardsApi';
import { Link } from 'react-router-dom';

/**
 * Секция "Награды Awwwards" на странице /about
 */
export function AwwwardsSection() {
  const { data: awards = [], isLoading, error } = useQuery({
    queryKey: ['public-awards'],
    queryFn: getPublicAwards,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 1, // Повторить только 1 раз при ошибке
    onError: (err) => {
      console.warn('Failed to load awards, using default data:', err);
    },
  });

  // Статичные данные по умолчанию, если API не работает или данных нет
  const defaultAwards = [
    {
      id: 1,
      year: 2020,
      description: 'Разработка сайта розничной торговли',
      caseSlug: null,
      externalUrl: null,
    },
    {
      id: 2,
      year: 2021,
      description: 'Дизайн интернет-магазина',
      caseSlug: null,
      externalUrl: null,
    },
    {
      id: 3,
      year: 2022,
      description: 'Веб-дизайн мобильного приложения',
      caseSlug: null,
      externalUrl: null,
    },
    {
      id: 4,
      year: 2022,
      description: 'Онлайн площадка для SMM',
      caseSlug: null,
      externalUrl: null,
    },
    {
      id: 5,
      year: 2023,
      description: 'Сайт квиз',
      caseSlug: null,
      externalUrl: null,
    },
  ];

  // Используем данные из API, если они есть, иначе статичные
  const displayAwards = awards.length > 0 ? awards : defaultAwards;

  const getAwardLink = (award: any) => {
    if (award.caseSlug) {
      return `/cases/${award.caseSlug}`;
    }
    if (award.externalUrl) {
      return award.externalUrl;
    }
    return '/cases/winners'; // Страница всех кейсов-победителей
  };

  return (
      <section className="awwwards d-flex flex-column">
      <h2>Лучшие работы и награды</h2>
      {isLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Загрузка...</p>
      ) : (
        displayAwards.map((award) => (
          <div key={award.id} className="awards-item d-flex jcsb w-100">
            <div className="d-flex gap-h-50 align-items-center awards-name">
              <h3>awwwards</h3>
              <p>{award.description}</p>
            </div>
            <div className="d-flex gap-h-50 align-items-center awards-date">
              <p>{award.year}</p>
              <Link to={getAwardLink(award)}>
                <img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к кейсу" loading="lazy" />
              </Link>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

