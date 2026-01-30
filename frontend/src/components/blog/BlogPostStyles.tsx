import { GlobalStyles, keyframes } from '@mui/material';

const shimmer = keyframes`
  0% { transform: translateX(-60%); }
  100% { transform: translateX(110%); }
`;

/**
 * Глобальные стили для страницы статьи блога
 */
export function BlogPostStyles() {
  return (
    <GlobalStyles
      styles={{
        '.blog-post': {
          maxWidth: 'min(960px, 100%)',
          margin: 0,
          padding: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '48px',
          color: '#F3F4FF',
        },
        '.blog-post-header': {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        },
        '.will-reveal': {
          opacity: 0,
          transform: 'translate3d(0, 42px, 0)',
          filter: 'blur(14px)',
          willChange: 'opacity, transform',
          transitionProperty: 'opacity, transform, filter',
          transitionDuration: '0.9s',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          transitionDelay: 'var(--reveal-delay, 0ms)',
        },
        '.will-reveal.is-visible': {
          opacity: 1,
          transform: 'translate3d(0, 0, 0)',
          filter: 'blur(0)',
        },
        // Убеждаемся, что сам контейнер blog-post-content всегда виден
        '.blog-post-content:not(.will-reveal)': {
          opacity: 1,
          visibility: 'visible',
        },
        '.blog-post-header h1': {
          fontFamily: '"Manrope","Inter","Roboto","Helvetica",sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
          lineHeight: 1.1,
          color: '#ffffff',
          margin: 0,
        },
        '.blog-post-date, .blog-post-category': {
          textTransform: 'uppercase',
          letterSpacing: '0.28em',
          fontSize: '0.7rem',
          color: 'rgba(192, 198, 255, 0.75)',
          fontWeight: 600,
        },
        '.blog-post-image': {
          position: 'relative',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 45px 120px -60px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(18px)',
          isolation: 'isolate',
        },
        '.blog-post-image::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(122, 108, 255, 0.24), rgba(255, 120, 150, 0.22))',
          mixBlendMode: 'screen',
          opacity: 0.65,
          pointerEvents: 'none',
        },
        '.blog-post-image img': {
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          aspectRatio: '16 / 9',
          transform: 'scale(1.002)',
        },
        '.blog-post-content': {
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gap: '40px',
          fontSize: '1.08rem',
          lineHeight: 1.85,
          color: 'rgba(241,244,255,0.84)',
          opacity: 1,
          visibility: 'visible',
          minHeight: '1px',
        },
        '@media (min-width: 960px)': {
          '.blog-post-content': {
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            rowGap: '56px',
          },
          '.blog-post-content > *': {
            gridColumn: '2 / span 10',
          },
          '.blog-post-content blockquote, .blog-post-content figure, .blog-post-content .wide': {
            gridColumn: '1 / span 12',
          },
        },
        '.blog-post-content h2, .blog-post-content h3, .blog-post-content h4': {
          fontFamily: '"Manrope","Inter","Roboto","Helvetica",sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          position: 'relative',
          color: '#ffffff',
          marginTop: 0,
          marginBottom: 0,
        },
        '.blog-post-content h2::before, .blog-post-content h3::before': {
          content: '""',
          position: 'absolute',
          inset: '-20px auto auto 0',
          width: '64px',
          height: '3px',
          borderRadius: '999px',
          background:
            'linear-gradient(120deg, rgba(121,108,255,0.8), rgba(255,143,168,0.8))',
        },
        '.blog-post-content h2': {
          fontSize: 'clamp(1.6rem, 2.6vw, 2.3rem)',
          marginTop: '48px',
          marginBottom: '20px',
          lineHeight: 1.3,
        },
        '.blog-post-content h2:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content h3': {
          fontSize: 'clamp(1.35rem, 2.1vw, 1.85rem)',
          marginTop: '40px',
          marginBottom: '18px',
          lineHeight: 1.35,
        },
        '.blog-post-content h3:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content h4': {
          fontSize: 'clamp(1.2rem, 1.8vw, 1.5rem)',
          marginTop: '32px',
          marginBottom: '16px',
          lineHeight: 1.4,
        },
        '.blog-post-content p': {
          margin: '0 0 24px 0',
          color: 'rgba(225,229,255,0.82)',
          lineHeight: 1.85,
        },
        '.blog-post-content p:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content img': {
          width: '100%',
          borderRadius: '24px',
          boxShadow: '0 35px 80px -48px rgba(0, 0, 0, 0.85)',
          objectFit: 'cover',
          display: 'block',
          margin: '32px 0',
        },
        '.blog-post-content figure': {
          margin: '36px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        },
        '.blog-post-content figure:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content figure:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content figure img': {
          margin: 0,
        },
        '.blog-post-content figure figcaption': {
          textAlign: 'center',
          fontSize: '0.95rem',
          color: 'rgba(199,203,255,0.72)',
          fontStyle: 'italic',
          paddingTop: '8px',
          lineHeight: 1.6,
        },
        '.blog-post-content blockquote': {
          margin: '40px 0',
          padding: '36px 40px',
          borderRadius: '24px',
          backdropFilter: 'blur(10px)',
          background: 'linear-gradient(135deg, rgba(139,118,255,0.18), rgba(255,120,150,0.14))',
          border: '1px solid rgba(195,188,255,0.18)',
          position: 'relative',
          color: '#F4F5FF',
          fontSize: '1.15rem',
          lineHeight: 1.85,
        },
        '.blog-post-content blockquote:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content blockquote:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content blockquote p': {
          margin: '0 0 16px 0',
        },
        '.blog-post-content blockquote p:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content blockquote::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: '4px',
          background: 'linear-gradient(180deg, rgba(121,108,255,1), rgba(255,143,168,1))',
          borderRadius: '999px',
        },
        '.blog-post-content ul, .blog-post-content ol': {
          margin: '24px 0',
          paddingLeft: '28px',
          display: 'grid',
          gap: '14px',
        },
        '.blog-post-content ul:first-of-type, .blog-post-content ol:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content ul:last-child, .blog-post-content ol:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content li': {
          lineHeight: 1.85,
          color: 'rgba(225,229,255,0.82)',
          paddingLeft: '8px',
        },
        '.blog-post-content li::marker': {
          color: '#9D8CFF',
        },
        '.blog-post-content li p': {
          margin: '0 0 12px 0',
        },
        '.blog-post-content li p:last-child': {
          marginBottom: 0,
        },
        '.article-callout': {
          gridColumn: '1 / span 12',
          background: 'rgba(28, 32, 54, 0.8)',
          borderRadius: '28px',
          padding: '36px 40px',
          margin: '40px 0',
          border: '1px solid rgba(153, 140, 255, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden',
        },
        '.article-callout:first-of-type': {
          marginTop: 0,
        },
        '.article-callout:last-child': {
          marginBottom: 0,
        },
        '.article-callout::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(127, 103, 255, 0.18), rgba(255, 133, 168, 0.16))',
          opacity: 0.9,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        },
        '.article-callout strong': {
          fontSize: '1.13rem',
          fontWeight: 700,
          color: '#F7F7FF',
        },
        '.blog-post-content .grid': {
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        },
        '.blog-post-content .grid-item': {
          borderRadius: '22px',
          background: 'rgba(25, 28, 46, 0.85)',
          border: '1px solid rgba(143, 137, 255, 0.16)',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        },
        '.blog-post-content .grid-item::after': {
          content: '""',
          position: 'absolute',
          inset: '-40% -60% auto auto',
          width: '120%',
          height: '120%',
          background: 'linear-gradient(120deg, rgba(129,108,255,0.16), rgba(255,143,168,0.15))',
          opacity: 0,
          transform: 'skewX(-18deg)',
          animation: `${shimmer} 8s ease-in-out infinite`,
        },
        '.blog-post-content table': {
          width: '100%',
          borderCollapse: 'collapse',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'rgba(24, 27, 44, 0.85)',
          border: '1px solid rgba(153, 140, 255, 0.18)',
          margin: '36px 0',
        },
        '.blog-post-content table:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content table:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content th, .blog-post-content td': {
          padding: '18px 20px',
          borderBottom: '1px solid rgba(144, 136, 255, 0.14)',
        },
        '.blog-post-content th': {
          paddingTop: '20px',
          paddingBottom: '20px',
        },
        '.blog-post-content th': {
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontSize: '0.75rem',
          color: 'rgba(203,210,255,0.72)',
        },
        '.blog-post-content code': {
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '8px',
          background: 'rgba(33, 37, 57, 0.9)',
          color: '#FFDDEE',
          fontSize: '0.92rem',
          fontFamily: '"JetBrains Mono","Fira Code",monospace',
          lineHeight: 1.6,
        },
        '.blog-post-content p code, .blog-post-content li code': {
          margin: '0 2px',
        },
        '.blog-post-content pre': {
          margin: '32px 0',
          padding: '28px',
          borderRadius: '22px',
          background: 'rgba(22, 24, 40, 0.88)',
          border: '1px solid rgba(140, 136, 255, 0.18)',
          overflowX: 'auto',
          fontSize: '0.95rem',
          lineHeight: 1.7,
        },
        '.blog-post-content pre:first-of-type': {
          marginTop: 0,
        },
        '.blog-post-content pre:last-child': {
          marginBottom: 0,
        },
        '.blog-post-content pre code': {
          display: 'block',
          padding: 0,
          background: 'transparent',
          color: '#FFDDEE',
          fontSize: 'inherit',
          margin: 0,
        },
        // Стили для интерактивных элементов статьи
        '.article-table': {
          margin: '48px 0',
          borderRadius: '28px',
          overflow: 'hidden',
          background: 'rgba(24, 27, 44, 0.95)',
          border: '1px solid rgba(153, 140, 255, 0.25)',
          boxShadow: '0 35px 80px -48px rgba(0, 0, 0, 0.85)',
          position: 'relative',
          animation: 'slideInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.article-table h3': {
          padding: '28px 32px 20px',
          margin: 0,
          background: 'linear-gradient(135deg, rgba(139,118,255,0.2), rgba(255,120,150,0.18))',
          borderBottom: '1px solid rgba(153, 140, 255, 0.2)',
          color: '#ffffff',
          fontSize: '1.5rem',
        },
        '.article-table table': {
          margin: 0,
          background: 'transparent',
          border: 'none',
        },
        '.article-table th': {
          background: 'rgba(139,118,255,0.15)',
          color: '#E8E9FF',
          fontWeight: 700,
        },
        '.article-table tbody tr': {
          transition: 'background 0.3s ease, transform 0.2s ease',
        },
        '.article-table tbody tr:hover': {
          background: 'rgba(153, 140, 255, 0.12)',
          transform: 'translateX(4px)',
        },
        '.article-table td': {
          color: 'rgba(225,229,255,0.9)',
        },
        // Чек-листы
        '.article-checklist': {
          margin: '48px 0',
          padding: '32px 40px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(139,118,255,0.18), rgba(255,120,150,0.14))',
          border: '1px solid rgba(195,188,255,0.25)',
          boxShadow: '0 35px 80px -48px rgba(0, 0, 0, 0.85)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInScale 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.article-checklist::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: '4px',
          background: 'linear-gradient(180deg, rgba(121,108,255,1), rgba(255,143,168,1))',
          borderRadius: '999px',
        },
        '.article-checklist h3': {
          marginTop: 0,
          marginBottom: '24px',
          color: '#ffffff',
          fontSize: '1.5rem',
        },
        '.article-checklist ul': {
          margin: 0,
          paddingLeft: 0,
          listStyle: 'none',
        },
        '.article-checklist .checklist-item': {
          padding: '14px 16px 14px 48px',
          marginBottom: '12px',
          borderRadius: '16px',
          background: 'rgba(25, 28, 46, 0.6)',
          border: '1px solid rgba(153, 140, 255, 0.15)',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          color: 'rgba(225,229,255,0.9)',
          cursor: 'pointer',
        },
        '.article-checklist .checklist-item::before': {
          content: '"☐"',
          position: 'absolute',
          left: '16px',
          fontSize: '1.4rem',
          color: '#9D8CFF',
          transition: 'transform 0.3s ease',
        },
        '.article-checklist .checklist-item:hover': {
          background: 'rgba(139,118,255,0.2)',
          borderColor: 'rgba(153, 140, 255, 0.4)',
          transform: 'translateX(6px)',
        },
        '.article-checklist .checklist-item:hover::before': {
          transform: 'scale(1.2)',
        },
        // Опросники
        '.article-poll': {
          margin: '48px 0',
          padding: '32px 40px',
          borderRadius: '28px',
          background: 'rgba(24, 27, 44, 0.95)',
          border: '2px solid rgba(153, 140, 255, 0.3)',
          boxShadow: '0 35px 80px -48px rgba(0, 0, 0, 0.85)',
          position: 'relative',
          animation: 'slideInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.article-poll h3': {
          marginTop: 0,
          marginBottom: '24px',
          color: '#ffffff',
          fontSize: '1.5rem',
        },
        '.article-poll ul': {
          margin: 0,
          paddingLeft: 0,
          listStyle: 'none',
        },
        '.article-poll .poll-item': {
          padding: '18px 24px',
          marginBottom: '16px',
          borderRadius: '18px',
          background: 'rgba(33, 37, 57, 0.7)',
          border: '1px solid rgba(153, 140, 255, 0.2)',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          color: 'rgba(225,229,255,0.9)',
          lineHeight: 1.7,
        },
        '.article-poll .poll-item:hover': {
          background: 'rgba(139,118,255,0.25)',
          borderColor: 'rgba(153, 140, 255, 0.5)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -8px rgba(121,108,255,0.4)',
        },
        // Блоки с важной информацией
        '.article-tip': {
          margin: '48px 0',
          padding: '32px 40px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(139,118,255,0.22), rgba(255,120,150,0.18))',
          border: '2px solid rgba(195,188,255,0.35)',
          boxShadow: '0 35px 80px -48px rgba(0, 0, 0, 0.85)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInScale 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.article-tip::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: '4px',
          background: 'linear-gradient(180deg, rgba(121,108,255,1), rgba(255,143,168,1))',
          borderRadius: '999px',
        },
        '.article-tip h3': {
          marginTop: 0,
          marginBottom: '20px',
          color: '#ffffff',
          fontSize: '1.5rem',
        },
        '.article-tip p': {
          marginBottom: '16px',
          color: 'rgba(241,244,255,0.95)',
          lineHeight: 1.8,
        },
        '.article-tip p:last-child': {
          marginBottom: 0,
        },
        // Анимации
        '@keyframes slideInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        '@keyframes fadeInScale': {
          '0%': {
            opacity: 0,
            transform: 'scale(0.96)',
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1)',
          },
        },
      }}
    />
  );
}

