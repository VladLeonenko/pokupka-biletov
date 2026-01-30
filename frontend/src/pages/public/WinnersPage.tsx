import { useQuery } from '@tanstack/react-query';
import { getPublicAwards } from '@/services/awardsApi';
import { listPublicCases } from '@/services/publicApi';
import { Box, Container, Typography, CircularProgress, Grid, Card, CardMedia, CardContent, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';

export function WinnersPage() {
  const { data: awards = [], isLoading: awardsLoading } = useQuery({
    queryKey: ['public-awards'],
    queryFn: getPublicAwards,
  });

  const caseSlugs = awards
    .filter(award => award.caseSlug)
    .map(award => award.caseSlug!);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['public-cases-winners', caseSlugs],
    queryFn: async () => {
      if (caseSlugs.length === 0) return [];
      const allCases = await listPublicCases();
      return allCases.filter(c => caseSlugs.includes(c.slug));
    },
    enabled: caseSlugs.length > 0,
  });

  const isLoading = awardsLoading || casesLoading;

  return (
    <>
      <SeoMetaTags
        title="Кейсы-победители Awwwards - PrimeCoder"
        description="Наши проекты, получившие признание на Awwwards. Лучшие работы веб-студии PrimeCoder."
        url={typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/cases/winners'}
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Container>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h1" sx={{ fontSize: '3rem', fontWeight: 300, mb: 2, color: '#fff' }}>
              Кейсы-победители
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>
              Наши проекты, получившие признание на Awwwards
            </Typography>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#ffbb00' }} />
            </Box>
          ) : cases.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Кейсы-победители пока не добавлены
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {cases.map((caseItem) => {
                const award = awards.find(a => a.caseSlug === caseItem.slug);
                return (
                  <Grid item xs={12} sm={6} md={4} key={caseItem.slug}>
                    <Card
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        transition: 'all 0.3s',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          borderColor: 'rgba(255,187,0,0.3)',
                          boxShadow: '0 8px 32px rgba(255,187,0,0.1)',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      {caseItem.heroImageUrl && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={caseItem.heroImageUrl}
                          alt={caseItem.title}
                          sx={{ objectFit: 'cover' }}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {award && (
                          <Box sx={{ mb: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: 'rgba(255,187,0,0.1)',
                                color: '#ffbb00',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                display: 'inline-block',
                              }}
                            >
                              Awwwards {award.year}
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 600 }}>
                          {caseItem.title}
                        </Typography>
                        {caseItem.summary && (
                          <Typography
                            variant="body2"
                            sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, flexGrow: 1 }}
                          >
                            {caseItem.summary}
                          </Typography>
                        )}
                        <Button
                          component={Link}
                          to={`/cases/${caseItem.slug}`}
                          variant="outlined"
                          sx={{
                            borderColor: '#ffbb00',
                            color: '#ffbb00',
                            '&:hover': {
                              borderColor: '#ffbb00',
                              bgcolor: 'rgba(255,187,0,0.1)',
                            },
                          }}
                        >
                          Подробнее
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </div>
    </>
  );
}

