import { LegalDocumentFromVitrine } from './LegalDocumentFromVitrine';

export function PublicOfferPage() {
  return (
    <LegalDocumentFromVitrine
      field="publicOfferHtml"
      h1="Публичная оферта"
      title="Публичная оферта"
      description="Условия оказания услуг по продаже билетов (оферта)."
      emptyHint="Текст оферты можно задать в админке: «Витрина билетов» → «Документы (HTML)» → публичная оферта."
      dataPage="/offer"
    />
  );
}
