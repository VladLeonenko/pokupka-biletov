import { Box, Typography, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый блок инструментов на зеленом фоне
 * Основан на дизайне из Figma
 */
export function CasesToolsNew() {
  const { slug } = useParams<{ slug?: string }>();
  
  // Ранний возврат если нет slug - компонент не должен рендериться
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

  const category = caseData.category || 'website';
  const tools = caseData.tools || [];
  const toolsText = tools.length > 0 
    ? tools.join(', ')
    : getDefaultToolsForCategory(category);

  // Получаем релевантные иконки инструментов на основе категории и tools
  const toolIcons = getRelevantToolIcons(category, tools);
  
  // Функция для получения дефолтных инструментов по категории
  function getDefaultToolsForCategory(cat: string): string {
    switch (cat) {
      case 'website':
        return 'React, TypeScript, Node.js, PostgreSQL';
      case 'mobile':
        return 'React Native, TypeScript, Firebase';
      case 'seo':
        return 'Google Analytics, Google Search Console, Yandex.Webmaster';
      case 'advertising':
        return 'Google Ads, Yandex.Direct, Facebook Ads';
      case 'design':
        return 'Figma, Adobe Photoshop, Adobe Illustrator';
      case 'ai':
        return 'Python, TensorFlow, OpenAI API';
      default:
        return '1С-Битрикс/HTML/CSS';
    }
  }
  
  // Функция для получения релевантных иконок инструментов
  function getRelevantToolIcons(cat: string, toolsList: string[]): Array<{ name: string; icon: string }> {
    const fallback = fallbackImageUrl();
    const allIcons: Record<string, string> = {
      'Figma': resolveImageUrl('/legacy/img/Figma.png', fallback),
      'Photoshop': resolveImageUrl('/legacy/img/Photoshop.png', fallback),
      'Illustrator': resolveImageUrl('/legacy/img/Illustrator.png', fallback),
      'XD': resolveImageUrl('/legacy/img/Xd.png', fallback),
      'JavaScript': resolveImageUrl('/legacy/img/JavaScript.png', fallback),
      'JS': resolveImageUrl('/legacy/img/JavaScript.png', fallback),
      'HTML': fallback, // HTML.png не существует, используем fallback
      'React': resolveImageUrl('/legacy/img/react.png', fallback),
      'TypeScript': resolveImageUrl('/legacy/img/typescript.png', fallback),
      'Node.js': fallback, // nodejs.png не существует, используем fallback
      'Node': fallback, // nodejs.png не существует, используем fallback
    };
    
    // Если есть tools, пытаемся найти соответствующие иконки
    if (toolsList.length > 0) {
      const foundIcons: Array<{ name: string; icon: string }> = [];
      for (const tool of toolsList.slice(0, 6)) {
        const toolLower = tool.toLowerCase();
        for (const [key, icon] of Object.entries(allIcons)) {
          if (toolLower.includes(key.toLowerCase()) && !foundIcons.find(i => i.name === key)) {
            foundIcons.push({ name: key, icon });
            break;
          }
        }
      }
      if (foundIcons.length > 0) return foundIcons;
    }
    
    // Дефолтные иконки по категории
    const fallbackIcon = fallbackImageUrl();
    switch (cat) {
      case 'website':
        return [
          { name: 'React', icon: resolveImageUrl('/legacy/img/react.png', fallbackIcon) },
          { name: 'TypeScript', icon: resolveImageUrl('/legacy/img/typescript.png', fallbackIcon) },
          { name: 'JS', icon: resolveImageUrl('/legacy/img/JavaScript.png', fallbackIcon) },
          { name: 'Figma', icon: resolveImageUrl('/legacy/img/Figma.png', fallbackIcon) },
        ];
      case 'mobile':
        return [
          { name: 'React', icon: resolveImageUrl('/legacy/img/react.png', fallbackIcon) },
          { name: 'TypeScript', icon: resolveImageUrl('/legacy/img/typescript.png', fallbackIcon) },
          { name: 'JS', icon: resolveImageUrl('/legacy/img/JavaScript.png', fallbackIcon) },
          { name: 'Figma', icon: resolveImageUrl('/legacy/img/Figma.png', fallbackIcon) },
        ];
      case 'design':
        return [
          { name: 'Figma', icon: resolveImageUrl('/legacy/img/Figma.png', fallbackIcon) },
          { name: 'Photoshop', icon: resolveImageUrl('/legacy/img/Photoshop.png', fallbackIcon) },
          { name: 'Illustrator', icon: resolveImageUrl('/legacy/img/Illustrator.png', fallbackIcon) },
          { name: 'XD', icon: resolveImageUrl('/legacy/img/Xd.png', fallbackIcon) },
        ];
      default:
        return [
          { name: 'Figma', icon: resolveImageUrl('/legacy/img/Figma.png', fallbackIcon) },
          { name: 'Photoshop', icon: resolveImageUrl('/legacy/img/Photoshop.png', fallbackIcon) },
          { name: 'JS', icon: resolveImageUrl('/legacy/img/JavaScript.png', fallbackIcon) },
        ];
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#FFFFFF',
        py: { xs: 6, md: 8 },
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
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 4, md: 6 },
            alignItems: { xs: 'center', lg: 'flex-start' },
          }}
        >
          {/* Левая часть - текст */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', lg: '0 0 60%' },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 3, md: 4 },
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                fontWeight: 700,
                color: '#141414',
                lineHeight: 1.2,
              }}
            >
              Инструменты
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#141414',
                  lineHeight: 1.5,
                }}
              >
                {toolsText}
              </Typography>
              {category === 'design' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Графические редакторы: Figma, Adobe Photoshop, Adobe After Effects
                </Typography>
              )}
              {category === 'website' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Технологии: React, TypeScript, Node.js, PostgreSQL
                </Typography>
              )}
              {category === 'mobile' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Технологии: React Native, TypeScript, Firebase
                </Typography>
              )}
              {category === 'seo' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Инструменты: Google Analytics, Google Search Console, Yandex.Webmaster
                </Typography>
              )}
              {category === 'advertising' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Платформы: Google Ads, Yandex.Direct, Facebook Ads
                </Typography>
              )}
              {category === 'ai' && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.6,
                  }}
                >
                  Технологии: Python, TensorFlow, OpenAI API
                </Typography>
              )}
            </Box>

            <Typography
              sx={{
                fontSize: { xs: '0.875rem', md: '1rem', lg: '1.5rem' },
                fontWeight: 300,
                color: '#141414',
                lineHeight: 1.5,
                mb: { xs: 2, md: 0 },
              }}
            >
              Понравился проект и хотите что-то подобное? Воспользуйтесь калькулятором стоимости и узнайте цену своего проекта.
            </Typography>

            <Button
              variant="contained"
              sx={{
                bgcolor: '#FD9C12',
                color: '#fff',
                px: { xs: 3, md: '25px' },
                py: { xs: 1.5, md: '17px' },
                fontSize: { xs: '0.875rem', md: '1.25rem' },
                fontWeight: 400,
                textTransform: 'none',
                borderRadius: '3px',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  bgcolor: '#e68a0f',
                },
              }}
            >
              Узнать стоимость
            </Button>
          </Box>

          {/* Правая часть - иконки инструментов */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 100px)', md: 'repeat(3, 120px)' },
              gap: { xs: 2, md: 3 },
              width: { xs: '100%', lg: 'auto' },
              flex: { xs: '1 1 100%', lg: '0 0 auto' },
            }}
          >
            {toolIcons.map((tool, index) => (
              <Box
                key={index}
                sx={{
                  bgcolor: '#fff',
                  borderRadius: '10px',
                  p: { xs: 2, md: '20px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '1 / 1',
                  width: { xs: '100%', sm: '120px' },
                  height: { xs: 'auto', sm: '120px' },
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
              <SafeImage
                src={tool.icon}
                alt={tool.name}
                fallback={fallbackImageUrl()}
                hideOnError={true}
                sx={{
                  width: { xs: '40px', md: '80px' },
                  height: { xs: '40px', md: '80px' },
                  objectFit: 'contain',
                }}
              />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

