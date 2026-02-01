import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { getSite, getSitePages, createSitePage, updateSitePage, getSitePage, SitePage } from '@/services/sitesApi';
import { SectionEditor } from '@/components/pageBuilder/SectionEditor';
import { BlockTypeSelector } from '@/components/pageBuilder/BlockTypeSelector';
import { PageSection, PageContent, SectionLayout, PageBlock, BlockType } from '@/types/pageBuilder';

export default function SitePageEditorPage() {
  const { siteId, pageId } = useParams<{ siteId: string; pageId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  
  const [pageData, setPageData] = useState({
    slug: '',
    title: '',
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
    isPublished: false,
  });

  const [sections, setSections] = useState<PageSection[]>([]);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(Number(siteId)),
    enabled: !!siteId,
  });

  const { data: page } = useQuery({
    queryKey: ['sitePage', siteId, pageId],
    queryFn: () => getSitePage(Number(siteId), Number(pageId)),
    enabled: !!siteId && !!pageId && pageId !== 'new',
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['sitePages', siteId],
    queryFn: () => getSitePages(Number(siteId)),
    enabled: !!siteId,
  });

  // Загружаем данные страницы при редактировании
  useEffect(() => {
    if (page) {
      setPageData({
        slug: page.slug || '',
        title: page.title || '',
        metaTitle: page.seo_title || '',
        metaDescription: page.seo_description || '',
        ogImage: page.og_image || '',
        isPublished: page.is_published || false,
      });

      // Загружаем секции из content
      if (page.content?.sections) {
        setSections(page.content.sections);
      } else if (page.content?.blocks) {
        // Миграция старых блоков в секции
        const migratedSections: PageSection[] = (page.content.blocks || []).map((block: any, index: number) => ({
          id: `section-${index}`,
          layout: 'full-width' as SectionLayout,
          columns: [{
            id: `column-${index}`,
            blocks: [{
              id: block.id || `block-${index}`,
              type: block.type as BlockType,
              title: block.title || '',
              content: block.content || {},
            }],
          }],
        }));
        setSections(migratedSections);
      }
    }
  }, [page]);

  const savePageMutation = useMutation({
    mutationFn: (data: Partial<SitePage>) => {
      if (pageId === 'new') {
        return createSitePage(Number(siteId), data);
      } else {
        return updateSitePage(Number(siteId), Number(pageId), data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePages'] });
      queryClient.invalidateQueries({ queryKey: ['sitePage', siteId, pageId] });
      if (pageId === 'new') {
        navigate(`/admin/sites/${siteId}`);
      }
    },
  });

  const handleSave = () => {
    const content: PageContent = {
      sections,
    };
    
    savePageMutation.mutate({
      ...pageData,
      content,
      seo_title: pageData.metaTitle,
      seo_description: pageData.metaDescription,
      og_image: pageData.ogImage,
      is_published: pageData.isPublished,
    });
  };

  const addSection = (layout: SectionLayout = 'full-width') => {
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
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<PageSection>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const addBlock = (columnId: string, blockType: BlockType) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      title: '',
      content: {},
    };
    
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col => 
        col.id === columnId 
          ? { ...col, blocks: [...col.blocks, newBlock] }
          : col
      ),
    })));
  };

  const updateBlock = (columnId: string, blockId: string, updates: Partial<PageBlock>) => {
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
  };

  const deleteBlock = (columnId: string, blockId: string) => {
    setSections(sections.map(section => ({
      ...section,
      columns: section.columns.map(col =>
        col.id === columnId
          ? { ...col, blocks: col.blocks.filter(b => b.id !== blockId) }
          : col
      ),
    })));
  };

  const moveBlock = (columnId: string, blockId: string, direction: 'up' | 'down') => {
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
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/admin/sites/${siteId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">
            {pageId === 'new' ? 'Создать страницу' : 'Редактировать страницу'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {site?.name} • {site?.domain}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          disabled={!pageData.slug || pageId === 'new'}
          onClick={() => navigate(`/admin/sites/${siteId}/pages/${pageId}/preview`)}
        >
          Предпросмотр
        </Button>
        <Button
          variant="outlined"
          disabled={pageId === 'new'}
          onClick={() => navigate(`/admin/sites/${siteId}/pages/${pageId}/builder`)}
        >
          Page Builder
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={savePageMutation.isPending}
        >
          {savePageMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Основное" />
          <Tab label="Блоки контента" />
          <Tab label="SEO" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="URL (slug)"
                value={pageData.slug}
                onChange={(e) => setPageData({ ...pageData, slug: e.target.value })}
                placeholder="boost-ai"
                helperText="Без /, только название"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название страницы"
                value={pageData.title}
                onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pageData.isPublished}
                    onChange={(e) => setPageData({ ...pageData, isPublished: e.target.checked })}
                  />
                }
                label="Опубликовано"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabValue === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Добавьте секции с разными типами колонок для построения страницы. Внутри каждой секции можно добавлять блоки контента.
          </Alert>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>Добавить секцию:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('full-width')}>
                Одна колонка
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('two-50-50')}>
                2 колонки (50/50)
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('two-33-67')}>
                2 колонки (33/67)
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('two-67-33')}>
                2 колонки (67/33)
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('three-equal')}>
                3 колонки
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addSection('four-equal')}>
                4 колонки
              </Button>
            </Box>
          </Paper>

          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              onUpdate={(updated) => updateSection(section.id, updated)}
              onDelete={() => deleteSection(section.id)}
              onMoveUp={() => moveSection(section.id, 'up')}
              onMoveDown={() => moveSection(section.id, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < sections.length - 1}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
              onMoveBlock={moveBlock}
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

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SEO заголовок"
                value={pageData.metaTitle}
                onChange={(e) => setPageData({ ...pageData, metaTitle: e.target.value })}
                helperText={`${pageData.metaTitle.length}/60 символов`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="SEO описание"
                value={pageData.metaDescription}
                onChange={(e) => setPageData({ ...pageData, metaDescription: e.target.value })}
                helperText={`${pageData.metaDescription.length}/160 символов`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="OG Image URL"
                value={pageData.ogImage}
                onChange={(e) => setPageData({ ...pageData, ogImage: e.target.value })}
                placeholder="/uploads/images/og-image.jpg"
              />
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

