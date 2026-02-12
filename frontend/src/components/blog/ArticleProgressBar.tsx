import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

/**
 * Тонкий индикатор прогресса чтения вверху страницы статьи.
 * Показывается после небольшого скролла, в стилистике сайта.
 */
export function ArticleProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight <= 0 ? 100 : Math.min(100, (scrollTop / docHeight) * 100);
      const show = scrollTop > 60;

      if (barRef.current) {
        barRef.current.style.setProperty('--progress', String(pct));
      }

      if (show !== visibleRef.current) {
        visibleRef.current = show;
        setVisible(show);
      }
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };

    update(); // init
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <Box
      ref={barRef}
      component="div"
      sx={{
        '--progress': 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 1100,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        component="div"
        sx={{
          height: '100%',
          width: 'calc(var(--progress) * 1%)',
          background: 'rgba(255,187,0,0.85)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </Box>
  );
}
