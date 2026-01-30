import { Box, Typography, Container, useTheme } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

const SlideContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #141414 0%, #1a1a1a 50%, #141414 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #ffffff 100%)',
  position: 'relative',
  overflow: 'hidden',
  padding: theme.spacing(8, 2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 50% 50%, ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.08)' : 'rgba(255, 187, 0, 0.05)'} 0%, transparent 70%)`,
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    right: '-20%',
    width: '600px',
    height: '600px',
    background: `radial-gradient(circle, ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.1)' : 'rgba(255, 187, 0, 0.08)'} 0%, transparent 70%)`,
    borderRadius: '50%',
    pointerEvents: 'none',
    animation: `${pulse} 8s ease-in-out infinite`,
  },
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  textAlign: 'center',
  maxWidth: '900px',
  margin: '0 auto',
}));

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
  fontWeight: 700,
  lineHeight: 1.2,
  marginBottom: theme.spacing(3),
  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  position: 'relative',
  animation: `${fadeInUp} 0.8s ease-out`,
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
}));

const Description = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
  lineHeight: 1.7,
  color: theme.palette.text.secondary,
  maxWidth: '700px',
  margin: '0 auto',
  animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
}));

interface HeroSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
  };
}

export function HeroSlide({ content }: HeroSlideProps) {
  const theme = useTheme();
  
  return (
    <SlideContainer
      sx={{
        backgroundImage: content.backgroundImage 
          ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${content.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container maxWidth="lg">
        <ContentWrapper>
          {content.title && (
            <Title variant="h1">{content.title}</Title>
          )}
          {content.subtitle && (
            <Subtitle variant="h2">{content.subtitle}</Subtitle>
          )}
          {content.description && (
            <Description>{content.description}</Description>
          )}
        </ContentWrapper>
      </Container>
    </SlideContainer>
  );
}

