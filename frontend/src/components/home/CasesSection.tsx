import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { SafeImage } from '@/components/common/SafeImage';
import { listHomeCases } from '@/services/publicApi';

/** Высота задаётся на самом `.caeses-content` (раскрыт); картинка — 100% ширины и высоты этого блока */
const CAESES_CONTENT_OPEN_SX = {
  position: 'relative',
  width: '100%',
  height: { xs: 320, sm: 400, md: 'min(48vh, 560px)' },
  bgcolor: '#0a0a0c',
  borderRadius: 2,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.06)',
  boxSizing: 'border-box',
  display: 'block',
} as const;

const PREVIEW_IMG_SX = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
};

const previewLinkStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  textDecoration: 'none',
  color: 'inherit',
};

const FALLBACK_CASES = [
  { id: 'umagazine', title: 'UMAGAZINE', year: '2026', type: 'кейс по разработке САЙТа', image: '/uploads/images/hero-umagazine-1771257595209.png', link: '/cases/umagazine-case' },
  { id: 'kchtz', title: 'KCHTZ', year: '2025', type: 'кейс по разработке САЙТа', image: '/uploads/images/catalog-2-1771254502039.png', link: '/cases/kchtz-case' },
  { id: 'houses', title: 'ДОМА РОССИИ', year: '2021', type: 'кейс по разработке САЙТа', image: '/legacy/img/houses-case.png', link: '/cases/houses-case' },
  { id: 'polygon', title: 'ПОЛИГОН', year: '2018', type: 'кейс по разработке САЙТа', image: '/legacy/img/polygon-case.png', link: '/cases/polygon-case' },
  { id: 'madeo', title: 'MADEO', year: '2020', type: 'кейс по разработке САЙТа', image: '/legacy/img/madeo-case.png', link: '/cases/madeo-case' },
  { id: 'straumann', title: 'STRAUMANN GROUP', year: '2019', type: 'кейс по разработке САЙТа', image: '/legacy/img/straumann-case.png', link: '/cases/straumann-case' },
  { id: 'alaska', title: 'ALASKA FIREWOOD', year: '2022', type: 'кейс по редизайну сайта', image: '/legacy/img/alaska-case.png', link: '/cases/alaska-case' },
  { id: 'ursus', title: 'УРСУС', year: '2019', type: 'кейс по продвижению САЙТа', image: '/legacy/img/ursus-case.png', link: '/cases/ursus-case' },
  { id: 'straumann-mobile', title: 'STRAUMANN GROUP', year: '2021', type: 'кейс по МОБИЛЬНОму ПРИЛОЖЕНИю', image: '/legacy/img/mobile-straumann-case.png', link: '/cases/straumann-mobile-case' },
  { id: 'leta', title: 'LETA', year: '2017', type: 'кейс по разработке САЙТа', image: '/legacy/img/leta-case.png', link: '/cases/leta-case' },
  { id: 'winwin', title: 'WINWIN CHINA', year: '2019', type: 'кейс по разработке САЙТа', image: '/legacy/img/winwin-case.png', link: '/cases/winwin-case' },
];

/**
 * Секция кейсов/портфолио
 */
export function CasesSection() {
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const { data: apiCases = [] } = useQuery({
    queryKey: ['homeCases'],
    queryFn: listHomeCases,
    staleTime: 60_000,
  });

  const cases = apiCases.length > 0 ? apiCases : FALLBACK_CASES;

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
              <Box
                className={`caeses-content ${expandedCase === caseItem.id ? '' : 'hidden'}`}
                sx={{
                  width: '100%',
                  ...(expandedCase === caseItem.id ? CAESES_CONTENT_OPEN_SX : {}),
                }}
              >
                {caseItem.link ? (
                  <Link to={caseItem.link} style={previewLinkStyle}>
                    <SafeImage
                      src={caseItem.image}
                      alt={`Кейс ${caseItem.title} — ${caseItem.type}`}
                      sx={PREVIEW_IMG_SX}
                    />
                  </Link>
                ) : (
                  <Box sx={{ display: 'block', width: '100%', height: '100%' }}>
                    <SafeImage
                      src={caseItem.image}
                      alt={`Кейс ${caseItem.title} — ${caseItem.type}`}
                      sx={PREVIEW_IMG_SX}
                    />
                  </Box>
                )}
              </Box>
            </div>
          </div>
        ))}
      </div>
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Button
            component={Link}
            to="/portfolio"
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              letterSpacing: '0.05em',
              '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
            }}
          >
            Смотреть все кейсы
          </Button>
        </Box>
      </section>
    </div>
  );
}

