import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Typography } from '@mui/material';
import { BlockLibrary } from './library/BlockLibrary';
import { CanvasEditor } from './canvas/CanvasEditor';
import { SettingsPanel } from './panels/SettingsPanel';
import { SEOPanel } from './panels/SEOPanel';
import { TeamPanel } from './panels/TeamPanel';
import { Toolbar } from './Toolbar';
import { PageBlock, DeviceType, PageSettings, PageSection, SectionLayout, BlockType } from '@/types/pageBuilder';
import { SectionEditor } from './sections/SectionEditor';

interface PageBuilderProps {
  pageId?: string;
  initialPage?: any;
  onSave?: (page: any) => void;
  onPublish?: (page: any) => void;
}

export function PageBuilder({ pageId, initialPage, onSave, onPublish }: PageBuilderProps) {
  const [blocks, setBlocks] = useState<PageBlock[]>(initialPage?.blocks || []);
  const [sections, setSections] = useState<PageSection[]>(initialPage?.sections || []);
  const [viewMode, setViewMode] = useState<'blocks' | 'sections'>('blocks');
  
  // Инициализация pageSettings из initialPage
  useEffect(() => {
    if (initialPage?.settings) {
      setPageSettings(initialPage.settings);
    }
    if (initialPage?.sections) {
      setSections(initialPage.sections);
    }
  }, [initialPage]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isPreview, setIsPreview] = useState(false);
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [pageSettings, setPageSettings] = useState<PageSettings>(
    initialPage?.settings || {
      id: '',
      title: '',
      slug: '',
      description: '',
      keywords: '',
      robotsIndex: true,
      robotsFollow: true,
    }
  );
  const historyRef = useRef<PageBlock[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleAddBlock = useCallback((blockTemplate: Partial<PageBlock>) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockTemplate.type || 'content',
      name: blockTemplate.name || 'Block',
      category: blockTemplate.category || 'content',
      content: blockTemplate.content || {},
      styles: blockTemplate.styles || {},
      position: {
        x: 0,
        y: blocks.length * 200,
        width: 1200,
        height: 200,
      },
      order: blocks.length,
      ...blockTemplate,
    } as PageBlock;

    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    setSelectedBlockId(newBlock.id);
  }, [blocks]);

  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<PageBlock>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  }, [blocks]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [blocks, selectedBlockId]);

  const handleReorderBlocks = useCallback((blockIds: string[]) => {
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    const newBlocks = blockIds.map((id, index) => ({
      ...blockMap.get(id)!,
      order: index,
    }));
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  }, [blocks]);

  const saveToHistory = (newBlocks: PageBlock[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newBlocks)));
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  };

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  // Функции для работы с секциями
  const handleAddSection = useCallback((layout: SectionLayout = 'full-width') => {
    const columnCount = layout === 'full-width' ? 1 : 
                       layout.startsWith('two-') ? 2 : 
                       layout.startsWith('three-') ? 3 : 4;
    
    const newSection: PageSection = {
      id: `section-${Date.now()}`,
      layout,
      columns: Array.from({ length: columnCount }, (_, i) => ({
        id: `column-${Date.now()}-${i}`,
        blocks: [],
      })),
      order: sections.length,
    };
    setSections([...sections, newSection]);
  }, [sections]);

  const handleUpdateSection = useCallback((sectionId: string, updates: Partial<PageSection>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  }, [sections]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  }, [sections]);

  const handleAddBlockToSection = useCallback((columnId: string, blockType: BlockType) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType,
      name: 'Block',
      category: 'content',
      content: {},
      styles: {},
      position: { x: 0, y: 0, width: 100, height: 100 },
      order: 0,
    };
    
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col => 
        col.id === columnId 
          ? { ...col, blocks: [...col.blocks, newBlock] }
          : col
      ),
    })));
  }, [sections]);

  const handleUpdateBlockInSection = useCallback((columnId: string, blockId: string, updates: Partial<PageBlock>) => {
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              blocks: col.blocks.map(block =>
                block.id === blockId ? { ...block, ...updates } : block
              ),
            }
          : col
      ),
    })));
  }, [sections]);

  const handleDeleteBlockFromSection = useCallback((columnId: string, blockId: string) => {
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col =>
        col.id === columnId
          ? { ...col, blocks: col.blocks.filter(b => b.id !== blockId) }
          : col
      ),
    })));
  }, [sections]);

  const handleMoveBlockInSection = useCallback((columnId: string, blockId: string, direction: 'up' | 'down') => {
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col => {
        if (col.id !== columnId) return col;
        
        const index = col.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return col;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= col.blocks.length) return col;
        
        const newBlocks = [...col.blocks];
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        return { ...col, blocks: newBlocks };
      }),
    })));
  }, [sections]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave({
        title: initialPage?.title || 'Новая страница',
        slug: initialPage?.slug || `page-${Date.now()}`,
        blocks,
        sections,
        settings: initialPage?.settings || {},
        theme: initialPage?.theme || {},
      });
    }
  }, [blocks, sections, deviceType, onSave, initialPage]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Toolbar
        deviceType={deviceType}
        onDeviceChange={setDeviceType}
        isPreview={isPreview}
        onPreviewToggle={() => setIsPreview(!isPreview)}
        onSave={handleSave}
        onPublish={() => onPublish?.({
          title: initialPage?.title || 'Новая страница',
          slug: initialPage?.slug || `page-${Date.now()}`,
          blocks,
          sections,
          settings: initialPage?.settings || {},
          theme: initialPage?.theme || {},
        })}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
      />

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Block Library или Секции */}
        <Paper
          elevation={2}
          sx={{
            width: 350,
            flexShrink: 0,
            overflow: 'auto',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)}>
            <Tab label="Блоки" value="blocks" />
            <Tab label="Секции" value="sections" />
          </Tabs>
          {viewMode === 'blocks' ? (
            <BlockLibrary onAddBlock={handleAddBlock} />
          ) : (
            <Box sx={{ p: 2 }}>
              <Button
                variant="contained"
                fullWidth
                sx={{ mb: 2 }}
                onClick={() => handleAddSection('full-width')}
              >
                Добавить секцию (1 колонка)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => handleAddSection('two-50-50')}
              >
                2 колонки (50/50)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => handleAddSection('three-equal')}
              >
                3 колонки
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => handleAddSection('four-equal')}
              >
                4 колонки
              </Button>
            </Box>
          )}
        </Paper>

        {/* Center - Canvas */}
        <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
          {viewMode === 'blocks' ? (
            <CanvasEditor
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              deviceType={deviceType}
              isPreview={isPreview}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onReorderBlocks={handleReorderBlocks}
            />
          ) : (
            <Box sx={{ p: 3 }}>
              {sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  onUpdate={(updated) => handleUpdateSection(section.id, updated)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onMoveUp={() => {
                    if (index > 0) {
                      const newSections = [...sections];
                      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
                      setSections(newSections);
                    }
                  }}
                  onMoveDown={() => {
                    if (index < sections.length - 1) {
                      const newSections = [...sections];
                      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
                      setSections(newSections);
                    }
                  }}
                  canMoveUp={index > 0}
                  canMoveDown={index < sections.length - 1}
                  onAddBlock={handleAddBlockToSection}
                  onUpdateBlock={handleUpdateBlockInSection}
                  onDeleteBlock={handleDeleteBlockFromSection}
                  onMoveBlock={handleMoveBlockInSection}
                />
              ))}
              {sections.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Добавьте секции для построения страницы
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </Box>

        {/* Right Panel - Settings */}
        {selectedBlock && !isPreview && (
          <Paper
            elevation={2}
            sx={{
              width: 400,
              flexShrink: 0,
              overflow: 'auto',
              borderLeft: 1,
              borderColor: 'divider',
            }}
          >
            <SettingsPanel
              block={selectedBlock}
              deviceType={deviceType}
              onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
            />
          </Paper>
        )}
      </Box>

      {/* SEO Dialog */}
      <Dialog open={showSEOPanel} onClose={() => setShowSEOPanel(false)} maxWidth="md" fullWidth>
        <DialogTitle>SEO Настройки</DialogTitle>
        <DialogContent>
          <SEOPanel
            settings={pageSettings}
            onUpdate={(updates) => setPageSettings({ ...pageSettings, ...updates })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSEOPanel(false)}>Закрыть</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleSave();
              setShowSEOPanel(false);
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={showThemePanel} onClose={() => setShowThemePanel(false)} maxWidth="md" fullWidth>
        <DialogTitle>Настройки темы</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Настройки темы будут добавлены в следующей версии
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowThemePanel(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={showTeamPanel} onClose={() => setShowTeamPanel(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Команда</DialogTitle>
        <DialogContent>
          <TeamPanel
            pageId={pageId || ''}
            members={[]}
            onAddMember={(email, role) => {
              // TODO: Добавить участника через API
              console.log('Add member:', email, role);
            }}
            onRemoveMember={(id) => {
              // TODO: Удалить участника через API
              console.log('Remove member:', id);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamPanel(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
