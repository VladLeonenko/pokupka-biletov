import { Box, Typography, Container, Grid, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SlideContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(8, 0),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(180deg, #141414 0%, #1a1a1a 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
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

const PhaseCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  height: '100%',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1d1d1d 0%, #252525 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  borderRadius: '16px',
  position: 'relative',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(255, 187, 0, 0.15)'
      : '0 12px 40px rgba(0, 0, 0, 0.1)',
    borderColor: '#ffbb00',
  },
}));

const PhaseNumber = styled(Box)(({ theme }) => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
  color: '#141414',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: theme.spacing(2),
}));

const PhaseTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
}));

const PhasePeriod = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: '#ffbb00',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  textTransform: 'uppercase',
  letterSpacing: '1px',
}));

const ActionsList = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  marginBottom: theme.spacing(3),
  '& li': {
    padding: theme.spacing(1, 0),
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
    position: 'relative',
    paddingLeft: theme.spacing(4),
    '&::before': {
      content: '"•"',
      position: 'absolute',
      left: theme.spacing(2),
      color: '#ffbb00',
      fontSize: '1.5rem',
      lineHeight: '1',
    },
  },
}));

const ResultBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '12px',
  background: theme.palette.mode === 'dark' 
    ? 'rgba(255, 187, 0, 0.1)'
    : 'rgba(255, 187, 0, 0.05)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.3)' : 'rgba(255, 187, 0, 0.2)'}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  '& .icon': {
    color: '#ffbb00',
    flexShrink: 0,
  },
}));

const ResultText = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

interface Phase {
  title: string;
  period: string;
  actions: string[];
  result: string;
}

interface RoadmapSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    phases?: Phase[];
  };
}

export function RoadmapSlide({ content }: RoadmapSlideProps) {
  const theme = useTheme();

  return (
    <SlideContainer>
      <Container maxWidth="lg">
        {content.title && (
          <SectionTitle variant="h2">{content.title}</SectionTitle>
        )}
        {content.subtitle && (
          <SectionSubtitle>{content.subtitle}</SectionSubtitle>
        )}
        {content.phases && content.phases.length > 0 && (
          <Grid container spacing={4}>
            {content.phases.map((phase, index) => (
              <Grid item xs={12} md={4} key={index}>
                <PhaseCard>
                  <PhaseNumber>{index + 1}</PhaseNumber>
                  <PhaseTitle>{phase.title}</PhaseTitle>
                  <PhasePeriod>{phase.period}</PhasePeriod>
                  {phase.actions && phase.actions.length > 0 && (
                    <ActionsList>
                      {phase.actions.map((action, actionIndex) => (
                        <li key={actionIndex}>{action}</li>
                      ))}
                    </ActionsList>
                  )}
                  {phase.result && (
                    <ResultBox>
                      <CheckCircleIcon className="icon" />
                      <ResultText>{phase.result}</ResultText>
                    </ResultBox>
                  )}
                </PhaseCard>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </SlideContainer>
  );
}

