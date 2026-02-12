import { Box, Container } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { NewClientSection } from '@/components/new-client/NewClientSection';
import { NewClientForm } from '@/components/new-client/NewClientForm';

export function NewClientPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/new-client';

  return (
    <>
      <SeoMetaTags
        title="Заявка на разработку сайта — бриф | PrimeCoder"
        description="Заполните короткий бриф — получите персональное КП и расчёт стоимости за 24 часа. Без обязательств. Разработка сайтов, SEO, реклама."
        keywords="заказать сайт, бриф на разработку, заявка веб-студия, расчёт стоимости сайта"
        url={currentUrl}
      />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Сотрудничество" title="Стать клиентом" description="Заполните мини-бриф — мы подберём оптимальное решение под ваш бюджет и задачи." decoText="CLIENT" />
          <Box data-anim="fade-up">
            <NewClientSection />
          </Box>
          <Box data-anim="fade-up" sx={{ mt: 4 }}>
            <NewClientForm />
          </Box>
        </Container>
      </Box>
    </>
  );
}
