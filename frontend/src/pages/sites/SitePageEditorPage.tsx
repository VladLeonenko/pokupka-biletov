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
import { getSite, getSitePages, createSitePage, SitePage } from '@/services/sitesApi';

interface PageBlock {
  id: string;
  type: 'hero' | 'features' | 'pricing' | 'calculator' | 'testimonials' | 'faq' | 'cta' | 'text';
  title: string;
  content: any;
}

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

  const [blocks, setBlocks] = useState<PageBlock[]>([]);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(Number(siteId)),
    enabled: !!siteId,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['sitePages', siteId],
    queryFn: () => getSitePages(Number(siteId)),
    enabled: !!siteId,
  });

  const createPageMutation = useMutation({
    mutationFn: (data: Partial<SitePage>) => createSitePage(Number(siteId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePages'] });
      navigate(`/admin/sites/${siteId}`);
    },
  });

  const handleSave = () => {
    createPageMutation.mutate({
      ...pageData,
      content: { blocks },
    });
  };

  const addBlock = (type: PageBlock['type']) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}`,
      type,
      title: '',
      content: {},
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<PageBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
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
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={createPageMutation.isPending}
        >
          {createPageMutation.isPending ? 'Сохранение...' : 'Сохранить'}
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
            Добавьте блоки для построения страницы. Блоки будут отображаться в том порядке, в котором вы их добавляете.
          </Alert>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Добавить блок:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" onClick={() => addBlock('hero')}>Hero</Button>
              <Button size="small" onClick={() => addBlock('features')}>Преимущества</Button>
              <Button size="small" onClick={() => addBlock('pricing')}>Тарифы</Button>
              <Button size="small" onClick={() => addBlock('calculator')}>Калькулятор</Button>
              <Button size="small" onClick={() => addBlock('testimonials')}>Отзывы</Button>
              <Button size="small" onClick={() => addBlock('faq')}>FAQ</Button>
              <Button size="small" onClick={() => addBlock('cta')}>Призыв к действию</Button>
              <Button size="small" onClick={() => addBlock('text')}>Текстовый блок</Button>
            </Box>
          </Paper>

          {blocks.map((block, index) => (
            <Card key={block.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {block.type} - {block.title || 'Без названия'}
                  </Typography>
                  <Box>
                    <Button size="small" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button size="small" onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1}>
                      ↓
                    </Button>
                    <Button size="small" color="error" onClick={() => removeBlock(block.id)}>
                      Удалить
                    </Button>
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  label="Заголовок блока"
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  sx={{ mb: 2 }}
                />
                {/* Здесь будут специфичные поля для каждого типа блока */}
              </CardContent>
            </Card>
          ))}

          {blocks.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Добавьте блоки для построения страницы
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

