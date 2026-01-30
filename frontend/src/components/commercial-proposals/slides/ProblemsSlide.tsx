import { Box, Typography, Container, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SlideContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(8, 0),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1a1a1a 0%, #141414 100%)'
    : 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
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

const ProblemCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(4),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1d1d1d 0%, #252525 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#ff4444' : '#ff6b6b'}`,
  borderRadius: '16px',
  position: 'relative',
}));

const ProblemTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.75rem',
  fontWeight: 700,
  marginBottom: theme.spacing(2),
  color: theme.palette.mode === 'dark' ? '#ff6b6b' : '#d32f2f',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  '& .icon': {
    fontSize: '2rem',
  },
}));

const ProblemList = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  marginBottom: theme.spacing(3),
  '& li': {
    padding: theme.spacing(1, 0),
    color: theme.palette.text.secondary,
    fontSize: '1rem',
    position: 'relative',
    paddingLeft: theme.spacing(3),
    '&::before': {
      content: '"✗"',
      position: 'absolute',
      left: 0,
      color: '#ff4444',
      fontWeight: 'bold',
      fontSize: '1.2rem',
    },
  },
}));

const SolutionBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  background: theme.palette.mode === 'dark' 
    ? 'rgba(76, 175, 80, 0.1)'
    : 'rgba(76, 175, 80, 0.05)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  '& .icon': {
    color: '#4caf50',
    flexShrink: 0,
    marginTop: theme.spacing(0.5),
  },
}));

const SolutionText = styled(Typography)(({ theme }) => ({
  fontSize: '1.1rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  '& .highlight': {
    color: '#4caf50',
  },
}));

interface Problem {
  title: string;
  items: string[];
  solution?: string;
}

interface ProblemsSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    problems?: Problem[];
  };
}

export function ProblemsSlide({ content }: ProblemsSlideProps) {
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
        {content.problems && content.problems.map((problem, index) => (
          <ProblemCard key={index}>
            <ProblemTitle>
              <WarningIcon className="icon" />
              {problem.title}
            </ProblemTitle>
            {problem.items && problem.items.length > 0 && (
              <ProblemList>
                {problem.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ProblemList>
            )}
            {problem.solution && (
              <SolutionBox>
                <CheckCircleIcon className="icon" />
                <SolutionText>
                  <span className="highlight">РЕШЕНИЕ:</span> {problem.solution}
                </SolutionText>
              </SolutionBox>
            )}
          </ProblemCard>
        ))}
      </Container>
    </SlideContainer>
  );
}

