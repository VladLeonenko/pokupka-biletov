import { LegalDocumentFromVitrine } from './LegalDocumentFromVitrine';

export function CookiesPolicyPage() {
  return (
    <LegalDocumentFromVitrine
      field="cookiesPolicyHtml"
      h1="Политика в отношении cookie"
      title="Политика cookie"
      description="Использование файлов cookie и аналогичных технологий на сайте."
      emptyHint="Текст можно задать в админке: «Витрина билетов» → «Документы (HTML)» → политика cookie."
      dataPage="/cookies"
    />
  );
}
