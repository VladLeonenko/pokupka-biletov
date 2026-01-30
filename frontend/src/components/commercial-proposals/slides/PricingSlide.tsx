import { Box, Typography, Container, Grid, Paper, useTheme } from '@mui/material';
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

const PackageCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  height: '100%',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1d1d1d 0%, #252525 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  borderRadius: '20px',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(255, 187, 0, 0.15)'
      : '0 12px 40px rgba(255, 187, 0, 0.1)',
    borderColor: '#ffbb00',
  },
}));

const PackageName = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
}));

const PackageDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.95rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3),
  fontStyle: 'italic',
}));

const PriceBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
}));

const PriceAmount = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  lineHeight: 1.2,
  marginBottom: theme.spacing(0.5),
}));

const PricePeriod = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));

const FeaturesList = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  '& li': {
    padding: theme.spacing(1.25, 0),
    color: theme.palette.text.primary,
    fontSize: '1rem',
    position: 'relative',
    paddingLeft: theme.spacing(4),
    '&::before': {
      content: '"✓"',
      position: 'absolute',
      left: 0,
      color: '#ffbb00',
      fontWeight: 'bold',
      fontSize: '1.3rem',
    },
  },
}));

interface Package {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
}

interface PricingSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    packages?: Package[];
  };
}

export function PricingSlide({ content }: PricingSlideProps) {
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
        {content.packages && content.packages.length > 0 && (
          <Grid container spacing={4}>
            {content.packages.map((pkg, index) => (
              <Grid item xs={12} md={6} key={index}>
                <PackageCard>
                  <PackageName>{pkg.name}</PackageName>
                  {pkg.description && (
                    <PackageDescription>{pkg.description}</PackageDescription>
                  )}
                  <PriceBox>
                    <PriceAmount>
                      {pkg.price}
                      {pkg.period && (
                        <span style={{ fontSize: '0.4em', marginLeft: '0.5em' }}>
                          {pkg.period}
                        </span>
                      )}
                    </PriceAmount>
                  </PriceBox>
                  {pkg.features && pkg.features.length > 0 && (
                    <FeaturesList>
                      {pkg.features.map((feature, featureIndex) => (
                        <li key={featureIndex}>{feature}</li>
                      ))}
                    </FeaturesList>
                  )}
                </PackageCard>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </SlideContainer>
  );
}

