import { useState, useEffect, useCallback } from 'react';
import { PageBuilder } from './PageBuilder';
import { PageBlock, PageSection, PageSettings } from '@/types/pageBuilder';

interface PageBuilderWrapperProps {
  // Исходные данные
  initialBlocks?: PageBlock[];
  initialSections?: PageSection[];
  initialSettings?: Partial<PageSettings>;
  
  // Callback для сохранения
  onSave: (data: {
    blocks?: PageBlock[];
    sections?: PageSection[];
    settings?: Partial<PageSettings>;
  }) => void | Promise<void>;
  
  // Callback для публикации (опционально)
  onPublish?: (data: {
    blocks?: PageBlock[];
    sections?: PageSection[];
    settings?: Partial<PageSettings>;
  }) => void | Promise<void>;
  
  // ID страницы (для предпросмотра)
  pageId?: string;
  pageSlug?: string;
}

export function PageBuilderWrapper({
  initialBlocks = [],
  initialSections = [],
  initialSettings = {},
  onSave,
  onPublish,
  pageId,
  pageSlug,
}: PageBuilderWrapperProps) {
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [sections, setSections] = useState<PageSection[]>(initialSections);
  const [settings, setSettings] = useState<PageSettings>({
    id: pageId || '',
    title: initialSettings.title || '',
    slug: pageSlug || initialSettings.slug || '',
    description: initialSettings.description || '',
    keywords: initialSettings.keywords || '',
    robotsIndex: initialSettings.robotsIndex !== undefined ? initialSettings.robotsIndex : true,
    robotsFollow: initialSettings.robotsFollow !== undefined ? initialSettings.robotsFollow : true,
    ...initialSettings,
  });

  // Обновляем состояние при изменении initial данных
  useEffect(() => {
    setBlocks(initialBlocks);
    setSections(initialSections);
    setSettings(prev => ({
      ...prev,
      ...initialSettings,
    }));
  }, [initialBlocks, initialSections, initialSettings]);

  const handleSave = useCallback((pageData: any) => {
    onSave({
      blocks: pageData.blocks || blocks,
      sections: pageData.sections || sections,
      settings: pageData.settings || settings,
    });
  }, [blocks, sections, settings, onSave]);

  const handlePublish = useCallback((pageData: any) => {
    if (onPublish) {
      onPublish({
        blocks: pageData.blocks || blocks,
        sections: pageData.sections || sections,
        settings: pageData.settings || settings,
      });
    }
  }, [blocks, sections, settings, onPublish]);

  const initialPage = {
    blocks,
    sections,
    settings,
    title: settings.title,
    slug: settings.slug,
  };

  return (
    <PageBuilder
      pageId={pageId}
      initialPage={initialPage}
      onSave={handleSave}
      onPublish={onPublish ? handlePublish : undefined}
    />
  );
}
