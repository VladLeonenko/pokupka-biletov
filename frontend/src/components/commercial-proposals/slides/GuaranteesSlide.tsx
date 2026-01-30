import { Box, Typography, Container, Grid, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';

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

const GuaranteeCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  height: '100%',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1d1d1d 0%, #252525 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(76, 175, 80, 0.15)'
      : '0 12px 40px rgba(76, 175, 80, 0.1)',
    borderColor: '#4caf50',
  },
}));

const GuaranteeTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  '& .icon': {
    color: '#4caf50',
    fontSize: '2rem',
  },
}));

const GuaranteeDescription = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  lineHeight: 1.7,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
}));

const GuaranteeList = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  '& li': {
    padding: theme.spacing(0.75, 0),
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
    position: 'relative',
    paddingLeft: theme.spacing(3),
    '&::before': {
      content: '"✓"',
      position: 'absolute',
      left: 0,
      color: '#4caf50',
      fontWeight: 'bold',
    },
  },
}));

interface Guarantee {
  title: string;
  description: string;
  items?: string[];
}

interface GuaranteesSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    guarantees?: Guarantee[];
  };
}

export function GuaranteesSlide({ content }: GuaranteesSlideProps) {
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
        {content.guarantees && content.guarantees.length > 0 && (
          <Grid container spacing={4}>
            {content.guarantees.map((guarantee, index) => (
              <Grid item xs={12} md={6} key={index}>
                <GuaranteeCard>
                  <GuaranteeTitle>
                    <VerifiedIcon className="icon" />
                    {guarantee.title}
                  </GuaranteeTitle>
                  {guarantee.description && (
                    <GuaranteeDescription>{guarantee.description}</GuaranteeDescription>
                  )}
                  {guarantee.items && guarantee.items.length > 0 && (
                    <GuaranteeList>
                      {guarantee.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </GuaranteeList>
                  )}
                </GuaranteeCard>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </SlideContainer>
  );
}

