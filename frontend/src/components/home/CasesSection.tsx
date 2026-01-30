import { useState } from 'react';

const cases = [
  {
    id: 'houses',
    title: 'ДОМА РОССИИ',
    year: '2021',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/houses-case.png',
    link: '/houses-case',
  },
  {
    id: 'polygon',
    title: 'ПОЛИГОН',
    year: '2018',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/polygon-case.png',
    link: '/polygon',
  },
  {
    id: 'madeo',
    title: 'MADEO',
    year: '2020',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/madeo-case.png',
    link: '/madeo-case',
  },
  {
    id: 'straumann',
    title: 'STRAUMANN GROUP',
    year: '2019',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/straumann-case.png',
    link: '/straumann-case',
  },
  {
    id: 'alaska',
    title: 'ALASKA FIREWOOD',
    year: '2022',
    type: 'кейс по редизайну сайта',
    image: '/legacy/img/alaska-case.png',
    link: null,
  },
  {
    id: 'litclinic',
    title: 'МЕДИЦИНСКИЙ ЦЕНТР',
    year: '2022',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/litclinic-case.png',
    link: null,
  },
  {
    id: 'ursus',
    title: 'УРСУС',
    year: '2019',
    type: 'кейс по продвижению САЙТа',
    image: '/legacy/img/ursus-case.png',
    link: null,
  },
  {
    id: 'straumann-mobile',
    title: 'STRAUMANN GROUP',
    year: '2021',
    type: 'кейс по МОБИЛЬНОму ПРИЛОЖЕНИю',
    image: '/legacy/img/mobile-straumann-case.png',
    link: null,
  },
  {
    id: 'leta',
    title: 'LETA',
    year: '2017',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/leta-case.png',
    link: null,
  },
  {
    id: 'winwin',
    title: 'WINWIN CHINA',
    year: '2019',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/winwin-case.png',
    link: null,
  },
  {
    id: 'greendent',
    title: 'GREENDENT',
    year: '2021',
    type: 'кейс по разработке САЙТа',
    image: '/legacy/img/greendent-case.png',
    link: null,
  },
];

/**
 * Секция кейсов/портфолио
 */
export function CasesSection() {
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  return (
    <div className="container">
      <section className="d-flex gap-v-50 flex-column pb-100">
        <div className="header-section">
          <h2>Кейсы</h2>
        </div>
      <div className="d-flex flex-column mt-50 cases">
        {cases.map((caseItem) => (
          <div key={caseItem.id} className="block">
            <div className="icon-block pb-10">
              <div
                className="cases-item d-flex jcsb w-100 icon"
                onClick={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
              >
                <h2>{caseItem.title}</h2>
                <h2 className="center">{caseItem.year}</h2>
                <h2 className="uppercase right">{caseItem.type}</h2>
              </div>
              <div className={`caeses-content ${expandedCase === caseItem.id ? '' : 'hidden'}`}>
                {caseItem.link ? (
                  <a href={caseItem.link}>
                    <img src={caseItem.image} alt={`Кейс ${caseItem.title} - ${caseItem.type}`} />
                  </a>
                ) : (
                  <img src={caseItem.image} alt={`Кейс ${caseItem.title} - ${caseItem.type}`} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </section>
    </div>
  );
}

