import type { ReactNode } from 'react';
import { Box, Container } from '@mui/material';

interface PageLayoutProps {
  children: ReactNode;
  withSphere?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false;
  contained?: boolean;
}

/** Public page shell — GSAP scroll-reveal removed (agency leftover). */
export function PageLayout({ children, maxWidth = 'lg', contained = true }: PageLayoutProps) {
  const inner = contained ? <Container maxWidth={maxWidth}>{children}</Container> : children;

  return (
    <Box
      component="main"
      sx={{
        minHeight: { xs: 'auto', md: '100vh' },
        color: '#fff',
        pt: { xs: 6.25, md: 6.25 },
        pb: { xs: 6, md: 10 },
      }}
    >
      {inner}
    </Box>
  );
}
