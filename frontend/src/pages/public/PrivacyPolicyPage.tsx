import { LegalDocumentFromVitrine } from './LegalDocumentFromVitrine';

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentFromVitrine
      field="privacyHtml"
      h1="Политика конфиденциальности"
      title="Политика конфиденциальности"
      description="Обработка персональных данных при использовании сервиса покупки билетов."
      emptyHint="Текст политики можно задать в админ-панели: «Витрина билетов» → «Документы (HTML)» → политика конфиденциальности."
      dataPage="/politic"
    />
  );
}
