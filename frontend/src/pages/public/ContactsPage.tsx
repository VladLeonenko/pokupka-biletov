import { Box, Container } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { ContactsInfoSection } from '@/components/contacts/ContactsInfoSection';
import { SocialNetworkSection } from '@/components/contacts/SocialNetworkSection';
import { ContactFormSection } from '@/components/contacts/ContactFormSection';

export function ContactsPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/contacts';

  return (
    <>
      <SeoMetaTags
        title="Контакты PrimeCoder — заказать разработку сайта"
        description="Свяжитесь с нами: телефон, email, мессенджеры. Консультация и расчёт стоимости бесплатно. Работаем по Москве и всей России."
        keywords="контакты PrimeCoder, заказать сайт, веб-студия Москва телефон, связаться с разработчиком"
        url={currentUrl}
      />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Контакты" title="Свяжитесь с нами" description="Москва, ул. Земляной Вал, 50Ас5. Пн–Пт 9:00–22:00." decoText="CONTACT" />
          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }} data-anim="fade-up">
            <Box sx={{ flex: 1 }}>
              <ContactsInfoSection />
              <SocialNetworkSection />
            </Box>
            <Box sx={{ flex: 1 }}>
              <ContactFormSection />
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
