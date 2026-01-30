import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';

/**
 * Секция "О проекте" согласно дизайну Figma
 * Заголовок справа с линиями, текст в рамке с белой границей
 */
export function CasesAboutNew() {
  const { slug } = useParams<{ slug?: string }>();
  
  if (!slug) {
    return null;
  }
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  if (!caseData) {
    return null;
  }

  // Получаем текст "О проекте" из contentJson или используем summary
  const aboutText = caseData.contentJson?.about?.text || 
    caseData.summary || 
    'Описание проекта будет добавлено позже.';

  return (
    <Box
      sx={{
        width: '100%',
        py: { xs: 6, md: 8 },
        backgroundColor: '#141414',
      }}
    >
      <Box
        sx={{
          maxWidth: '1170px',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            alignItems: 'flex-end',
            position: 'relative',
          }}
        >
          {/* Заголовок справа с линиями */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 2, md: 3 },
              width: '100%',
              mb: '-37px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, #fff 100%)',
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
              }}
            >
              О проекте
            </Typography>
            <Box
              sx={{
                width: { xs: '40px', md: '70px' },
                height: '1px',
                backgroundColor: '#fff',
              }}
            />
          </Box>

          {/* Текст в рамке */}
          <Box
            sx={{
              border: '1px solid #fff',
              borderTop: 'none',
              p: { xs: 3, md: '50px' },
              width: '100%',
              mt: '-37px',
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.25rem', lg: '1.5rem' },
                fontWeight: 300,
                color: '#fff',
                lineHeight: 1.5,
              }}
            >
              {aboutText}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
