/**
 * Hero-заголовок: печать при появлении + часть букв «парит» в невесомости.
 */
import { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';
import { keyframes } from '@emotion/react';

const HERO_TEXT = 'В Prime Coder мы создаём AI-команды, где технологии и бизнес-результат становятся единым целым.';

// Индексы букв, которые «парят»
const FLOAT_INDICES = new Set([3, 8, 15, 22, 30, 38, 45, 52, 60, 68]);

const floatKeyframes = keyframes`
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(-5px) }
`;

interface HeroTypewriterFloatProps {
  sx?: object;
}

export function HeroTypewriterFloat({ sx }: HeroTypewriterFloatProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const chars = HERO_TEXT.split('');
    const duration = 70;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleLength(i);
      if (i >= chars.length) clearInterval(t);
    }, duration);

    return () => clearInterval(t);
  }, []);

  return (
    <Typography
      component="h1"
      sx={{
        fontSize: { xs: 'clamp(1.5rem, 4.5vw, 2.8rem)', md: 'clamp(2rem, 4vw, 3.2rem)' },
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.02em',
        color: '#f5f5f5',
        maxWidth: 800,
        '& .hero-float-char': {
          animation: `${floatKeyframes} 2.8s ease-in-out infinite`,
          display: 'inline-block',
        },
        ...sx,
      }}
    >
      {HERO_TEXT.split('').map((char, i) => {
        const visible = i < visibleLength;
        const isSpace = /\s/.test(char);
        const shouldFloat = FLOAT_INDICES.has(i) && !isSpace;
        const floatDelay = Array.from(FLOAT_INDICES).indexOf(i) * 0.25;
        return (
          <span
            key={i}
            className={shouldFloat ? 'hero-float-char' : undefined}
            style={{
              opacity: visible ? 1 : 0,
              display: 'inline-block',
              transition: 'opacity 0.05s',
              ...(shouldFloat && { animationDelay: `${floatDelay}s` }),
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </Typography>
  );
}
