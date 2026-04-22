import { LegalDocumentFromVitrine } from './LegalDocumentFromVitrine';

export function RequisitesPage() {
  return (
    <LegalDocumentFromVitrine
      field="requisitesHtml"
      h1="Реквизиты и сведения об операторе"
      title="Реквизиты"
      description="Сведения о продавце/операторе, контакты для обращений."
      emptyHint="Реквизиты и юридический блок можно задать в админке: «Витрина билетов» → «Документы (HTML)»."
      dataPage="/requisites"
    />
  );
}
