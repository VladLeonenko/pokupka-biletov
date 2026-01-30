import { ReactNode } from 'react';
import { ContentSection, SectionHeader, TextBlock } from './ContentSection';

interface StructuredContentProps {
  content: {
    sections?: Array<{
      type: 'header' | 'text' | 'list' | 'image' | 'form';
      title?: string;
      subtitle?: string;
      text?: string | string[];
      items?: string[];
      imageUrl?: string;
      imageAlt?: string;
      formId?: string;
    }>;
  };
}

/**
 * Компонент для рендеринга структурированного контента из БД
 * БЕЗ использования dangerouslySetInnerHTML
 */
export function StructuredContent({ content }: StructuredContentProps) {
  if (!content?.sections || content.sections.length === 0) {
    return null;
  }

  return (
    <>
      {content.sections.map((section, index) => {
        switch (section.type) {
          case 'header':
            return (
              <ContentSection key={index}>
                <SectionHeader title={section.title || ''} subtitle={section.subtitle} />
              </ContentSection>
            );

          case 'text':
            return (
              <ContentSection key={index}>
                <TextBlock>
                  {Array.isArray(section.text) ? (
                    section.text.map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))
                  ) : (
                    <p>{section.text}</p>
                  )}
                </TextBlock>
              </ContentSection>
            );

          case 'list':
            return (
              <ContentSection key={index}>
                <TextBlock>
                  {section.title && <h3>{section.title}</h3>}
                  <ul>
                    {section.items?.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                </TextBlock>
              </ContentSection>
            );

          case 'image':
            return (
              <ContentSection key={index}>
                {section.imageUrl && (
                  <img 
                    src={section.imageUrl} 
                    alt={section.imageAlt || section.title || ''} 
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                )}
              </ContentSection>
            );

          default:
            return null;
        }
      })}
    </>
  );
}

