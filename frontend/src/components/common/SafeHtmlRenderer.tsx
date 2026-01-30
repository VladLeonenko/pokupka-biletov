import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';

interface SafeHtmlRendererProps {
  html: string;
  sx?: any;
}

/**
 * Безопасный рендерер HTML контента через React компоненты
 * Парсит простой HTML (h2, p, img) и рендерит через MUI компоненты
 */
export function SafeHtmlRenderer({ html, sx }: SafeHtmlRendererProps) {
  const parsedContent = useMemo(() => {
    if (!html) return null;

    // Простой парсер для базовых HTML тегов
    const parts: JSX.Element[] = [];
    let currentIndex = 0;
    let keyCounter = 0;

    // Регулярные выражения для поиска тегов (улучшенная версия для вложенных тегов)
    const tagRegex = /<(h1|h2|h3|p|div|img|br|strong|em|b|i|a|ul|ol|li|span)([^>]*)>(.*?)<\/\1>|<(h1|h2|h3|p|div|img|br|strong|em|b|i|a|ul|ol|li|span)([^>]*)\/>/gis;

    let match;
    let lastIndex = 0;

    while ((match = tagRegex.exec(html)) !== null) {
      // Добавляем текст перед тегом
      if (match.index > lastIndex) {
        const textBefore = html.substring(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push(
            <Typography key={`text-${keyCounter++}`} component="span" sx={{ display: 'block', mb: 2 }}>
              {textBefore}
            </Typography>
          );
        }
      }

      const tagName = (match[1] || match[4] || '').toLowerCase();
      const attributes = match[2] || match[5] || '';
      let content = match[3] || '';
      
      // Очищаем content от HTML тегов для простых тегов
      if (['strong', 'em', 'b', 'i', 'span'].includes(tagName)) {
        content = content.replace(/<[^>]+>/g, '');
      }

      // Парсим атрибуты
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      // Рендерим соответствующий компонент
      switch (tagName) {
        case 'h2':
          parts.push(
            <Typography
              key={`h2-${keyCounter++}`}
              variant="h2"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 500,
                color: '#fff',
                mb: 3,
                mt: 4,
              }}
            >
              {content}
            </Typography>
          );
          break;

        case 'p':
          parts.push(
            <Typography
              key={`p-${keyCounter++}`}
              component="p"
              sx={{
                mb: 2,
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.8,
              }}
            >
              {content}
            </Typography>
          );
          break;

        case 'img':
          parts.push(
            <Box
              key={`img-${keyCounter++}`}
              component="img"
              src={attrs.src}
              alt={attrs.alt || ''}
              sx={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '4px',
                mb: 3,
                display: 'block',
              }}
            />
          );
          break;

        case 'br':
          parts.push(<br key={`br-${keyCounter++}`} />);
          break;

        case 'strong':
        case 'b':
          parts.push(
            <Typography key={`strong-${keyCounter++}`} component="strong" sx={{ fontWeight: 600, display: 'inline' }}>
              {content}
            </Typography>
          );
          break;

        case 'em':
        case 'i':
          parts.push(
            <Typography key={`em-${keyCounter++}`} component="em" sx={{ fontStyle: 'italic', display: 'inline' }}>
              {content}
            </Typography>
          );
          break;
          
        case 'h1':
          parts.push(
            <Typography
              key={`h1-${keyCounter++}`}
              variant="h1"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                fontWeight: 500,
                color: '#fff',
                mb: 3,
                mt: 4,
              }}
            >
              {content.replace(/<[^>]+>/g, '')}
            </Typography>
          );
          break;
          
        case 'h3':
          parts.push(
            <Typography
              key={`h3-${keyCounter++}`}
              variant="h3"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 500,
                color: '#fff',
                mb: 2,
                mt: 3,
              }}
            >
              {content.replace(/<[^>]+>/g, '')}
            </Typography>
          );
          break;
          
        case 'div':
        case 'span':
          // Для div и span просто добавляем текст без тегов
          const cleanContent = content.replace(/<[^>]+>/g, '').trim();
          if (cleanContent) {
            parts.push(
              <Typography key={`${tagName}-${keyCounter++}`} component="span" sx={{ display: 'inline', mb: 1 }}>
                {cleanContent}
              </Typography>
            );
          }
          break;

        case 'a':
          parts.push(
            <Typography
              key={`a-${keyCounter++}`}
              component="a"
              href={attrs.href}
              target={attrs.target || '_self'}
              sx={{
                color: '#FFBB00',
                textDecoration: 'underline',
                '&:hover': {
                  textDecoration: 'none',
                },
              }}
            >
              {content}
            </Typography>
          );
          break;

        case 'ul':
        case 'ol':
          const listItems = content.match(/<li>(.*?)<\/li>/g) || [];
          parts.push(
            <Box
              key={`list-${keyCounter++}`}
              component={tagName}
              sx={{
                mb: 2,
                pl: 3,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {listItems.map((item, idx) => {
                const itemContent = item.replace(/<\/?li>/g, '');
                return (
                  <Typography key={`li-${keyCounter++}-${idx}`} component="li" sx={{ mb: 1 }}>
                    {itemContent}
                  </Typography>
                );
              })}
            </Box>
          );
          break;

        default:
          // Если тег не распознан, просто добавляем текст
          if (content) {
            parts.push(
              <Typography key={`unknown-${keyCounter++}`} component="span">
                {content}
              </Typography>
            );
          }
      }

      lastIndex = match.index + match[0].length;
    }

    // Добавляем оставшийся текст
    if (lastIndex < html.length) {
      const remainingText = html.substring(lastIndex).trim();
      if (remainingText) {
        parts.push(
          <Typography key={`text-end-${keyCounter++}`} component="span" sx={{ display: 'block', mb: 2 }}>
            {remainingText}
          </Typography>
        );
      }
    }

    // Если не было найдено тегов, просто возвращаем текст
    if (parts.length === 0) {
      return (
        <Typography component="div" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.8 }}>
          {html}
        </Typography>
      );
    }

    return parts;
  }, [html]);

  if (!html) return null;

  return (
    <Box 
      sx={{
        ...sx,
        maxWidth: '100%',
        overflow: 'hidden',
        '& > *': {
          maxWidth: '100%',
        },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
        },
      }}
    >
      {parsedContent}
    </Box>
  );
}

