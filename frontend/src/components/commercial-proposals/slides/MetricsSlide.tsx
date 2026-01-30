import { Box, Typography, Container, Grid, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const SlideContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(8, 0),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)'
    : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
  position: 'relative',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  color: '#ffffff',
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(6),
  maxWidth: '800px',
  marginLeft: 'auto',
  marginRight: 'auto',
}));

const MetricCard = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  borderRadius: '24px',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, rgba(255, 187, 0, 0.1) 0%, rgba(255, 140, 0, 0.05) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 249, 249, 0.95) 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.3)' : 'rgba(255, 187, 0, 0.2)'}`,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #ffbb00 0%, #ff8c00 100%)',
    opacity: 0,
    transition: 'opacity 0.4s ease',
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    borderColor: '#ffbb00',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 16px 48px rgba(255, 187, 0, 0.3)'
      : '0 16px 48px rgba(255, 187, 0, 0.2)',
    '&::before': {
      opacity: 1,
    },
  },
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: theme.spacing(1),
  lineHeight: 1.2,
}));

const MetricLabel = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

const MetricChange = styled(Typography)(({ theme }) => ({
  fontSize: '0.95rem',
  color: '#4caf50',
  fontWeight: 500,
  marginBottom: theme.spacing(1),
}));

const MetricDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: theme.palette.text.secondary,
  lineHeight: 1.6,
}));

interface Metric {
  value: string;
  label: string;
  change?: string;
  description?: string;
}

interface MetricsSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    metrics?: Metric[];
  };
}

export function MetricsSlide({ content }: MetricsSlideProps) {
  const theme = useTheme();

  return (
    <SlideContainer>
      <Container maxWidth="xl">
        {content.title && (
          <SectionTitle variant="h2">{content.title}</SectionTitle>
        )}
        {content.subtitle && (
          <SectionSubtitle>{content.subtitle}</SectionSubtitle>
        )}
        {content.metrics && content.metrics.length > 0 && (
          <Grid container spacing={4}>
            {content.metrics.map((metric, index) => {
              // Для 4 метрик используем более компактный дизайн
              const isFourMetrics = content.metrics!.length === 4;
              return (
                <Grid 
                  item 
                  xs={12} 
                  sm={isFourMetrics ? 6 : content.metrics!.length === 2 ? 6 : 4} 
                  md={isFourMetrics ? 3 : content.metrics!.length === 2 ? 6 : 4}
                  key={index}
                >
                  <MetricCard sx={isFourMetrics ? { padding: (theme) => theme.spacing(3, 2) } : {}}>
                    <MetricValue sx={isFourMetrics ? { fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: (theme) => theme.spacing(0.5) } : {}}>
                      {metric.value}
                    </MetricValue>
                    <MetricLabel sx={isFourMetrics ? { fontSize: '1rem', marginBottom: (theme) => theme.spacing(1) } : {}}>
                      {metric.label}
                    </MetricLabel>
                    {metric.change && (
                      <MetricChange sx={isFourMetrics ? { fontSize: '0.85rem', marginBottom: (theme) => theme.spacing(0.5) } : {}}>
                        ▲ {metric.change}
                      </MetricChange>
                    )}
                    {metric.description && (
                      <MetricDescription sx={isFourMetrics ? { fontSize: '0.8rem', lineHeight: 1.4 } : {}}>
                        {metric.description}
                      </MetricDescription>
                    )}
                  </MetricCard>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </SlideContainer>
  );
}
