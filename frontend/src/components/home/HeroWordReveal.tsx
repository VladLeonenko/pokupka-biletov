/**
 * Заголовок с побуквенной/пословной анимацией появления.
 * Каждое слово появляется с задержкой — wow-эффект.
 */
import { useEffect, useRef } from 'react';
import { Typography } from '@mui/material';
import gsap from 'gsap';

interface HeroWordRevealProps {
  text: string;
  className?: string;
  sx?: object;
}

export function HeroWordReveal({ text, className, sx }: HeroWordRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const inners = containerRef.current.querySelectorAll('.ai-hero-word-inner');
    if (!inners.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        inners,
        {
          y: 90,
          opacity: 0,
          rotationX: -30,
          transformOrigin: '50% 100%',
          force3D: true,
        },
        {
          y: 0,
          opacity: 1,
          rotationX: 0,
          duration: 0.9,
          stagger: 0.05,
          ease: 'power3.out',
          delay: 0.4,
          overwrite: true,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [text]);

  const words = text.split(/(\s+)/);
  return (
    <Typography
      component="h1"
      ref={containerRef}
      className={className}
      sx={{
        fontSize: { xs: 'clamp(2rem, 6vw, 4rem)', md: 'clamp(2.8rem, 5vw, 4.5rem)' },
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: '-0.04em',
        color: 'inherit',
        maxWidth: 920,
        perspective: 1000,
        '& .ai-hero-word': {
          display: 'inline-block',
          overflow: 'hidden',
          verticalAlign: 'bottom',
          paddingRight: '0.25em',
        },
        '& .ai-hero-word-inner': {
          display: 'inline-block',
          willChange: 'transform',
        },
        ...sx,
      }}
    >
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}>{w}</span>
        ) : (
          <span key={i} className="ai-hero-word">
            <span className="ai-hero-word-inner">{w}</span>
          </span>
        )
      )}
    </Typography>
  );
}
