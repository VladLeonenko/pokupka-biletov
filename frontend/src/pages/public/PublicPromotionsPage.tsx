import { useQuery } from '@tanstack/react-query';
import { listPublicPromotions } from '@/services/publicApi';
import { Box, CircularProgress, Container } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { PromotionsList } from '@/components/promotions/PromotionsList';

export function PublicPromotionsPage() {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: listPublicPromotions,
    staleTime: 30000,
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/promotion';

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  }

  return (
    <>
      <SeoMetaTags
        title="Акции и скидки — PrimeCoder"
        description="Выгодные акции на разработку сайтов, дизайн, SEO и рекламу."
        keywords="акции, скидки, PrimeCoder, разработка, SEO"
        url={currentUrl}
      />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Акции" title="Акции и скидки" description="Выгодные предложения на разработку, дизайн и продвижение." decoText="PROMO" />
          <Box data-anim="fade-up">
            <PromotionsList promotions={promotions} />
          </Box>
        </Container>
      </Box>
    </>
  );
}
