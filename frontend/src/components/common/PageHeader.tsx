import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  overline?: string;
  title: string;
  description?: string;
  /** Large decorative background text (follow.art style) */
  decoText?: string;
  align?: 'left' | 'center';
}

export function PageHeader({ overline, title, description, decoText, align = 'left' }: PageHeaderProps) {
  return (
    <Box sx={{ position: 'relative', mb: { xs: 4, md: 6 }, textAlign: align }} data-anim="fade-up">
      {/* Deco text — placed top-right, never overlaps real content */}
      {decoText && (
        <Typography
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: '-1.5rem', md: '-2.5rem' },
            right: { xs: '-0.5rem', md: '-1rem' },
            fontSize: 'clamp(3.5rem, 10vw, 8rem)',
            fontWeight: 900,
            color: '#fff',
            opacity: 0.02,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            zIndex: 0,
          }}
        >
          {decoText}
        </Typography>
      )}

      {overline && (
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1, position: 'relative', zIndex: 1 }}
        >
          {overline}
        </Typography>
      )}

      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '2rem', md: '3rem' },
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          mb: description ? 2 : 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          sx={{
            fontSize: { xs: '1rem', md: '1.15rem' },
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65,
            maxWidth: align === 'center' ? 600 : 540,
            mx: align === 'center' ? 'auto' : 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}
