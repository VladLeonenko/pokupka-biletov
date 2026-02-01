import { useState } from 'react';
import { Box, TextField, Typography, Switch, FormControlLabel, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PageSettings } from '@/types/pageBuilder';

interface SEOPanelProps {
  settings: PageSettings;
  onUpdate: (updates: Partial<PageSettings>) => void;
}

export function SEOPanel({ settings, onUpdate }: SEOPanelProps) {
  const [h1Count, setH1Count] = useState(0);
  const [h2Count, setH2Count] = useState(0);
  const [h3Count, setH3Count] = useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Typography variant="h6">SEO Настройки</Typography>

      {/* Основные настройки */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Основные</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={settings.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              helperText={`${(settings.title || '').length}/60 символов`}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={settings.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              helperText={`${(settings.description || '').length}/160 символов`}
            />
            <TextField
              label="Keywords (через запятую)"
              fullWidth
              value={settings.keywords || ''}
              onChange={(e) => onUpdate({ keywords: e.target.value })}
            />
            <TextField
              label="Canonical URL"
              fullWidth
              value={settings.canonicalUrl || ''}
              onChange={(e) => onUpdate({ canonicalUrl: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.robotsIndex !== false}
                    onChange={(e) => onUpdate({ robotsIndex: e.target.checked })}
                  />
                }
                label="Index"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.robotsFollow !== false}
                    onChange={(e) => onUpdate({ robotsFollow: e.target.checked })}
                  />
                }
                label="Follow"
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Open Graph */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Open Graph</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="OG Title"
              fullWidth
              value={settings.ogTitle || ''}
              onChange={(e) => onUpdate({ ogTitle: e.target.value })}
            />
            <TextField
              label="OG Description"
              multiline
              rows={2}
              fullWidth
              value={settings.ogDescription || ''}
              onChange={(e) => onUpdate({ ogDescription: e.target.value })}
            />
            <TextField
              label="OG Image URL"
              fullWidth
              value={settings.ogImage || ''}
              onChange={(e) => onUpdate({ ogImage: e.target.value })}
              helperText="Рекомендуемый размер: 1200x630px"
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (settings.ogImage) {
                  window.open(settings.ogImage, '_blank');
                }
              }}
              disabled={!settings.ogImage}
            >
              Предпросмотр OG изображения
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Schema.org */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Schema.org</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Schema JSON"
              multiline
              rows={8}
              fullWidth
              value={settings.schema ? JSON.stringify(settings.schema, null, 2) : ''}
              onChange={(e) => {
                try {
                  const schema = JSON.parse(e.target.value);
                  onUpdate({ schema });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"@context": "https://schema.org", "@type": "WebPage", ...}'
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // Генерация базового Schema.org для страницы
                const basicSchema = {
                  '@context': 'https://schema.org',
                  '@type': 'WebPage',
                  name: settings.title || '',
                  description: settings.description || '',
                  url: settings.canonicalUrl || '',
                };
                onUpdate({ schema: basicSchema });
              }}
            >
              Сгенерировать базовый Schema
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Анализ */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Анализ</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              H1: {h1Count} {h1Count === 1 ? '✓' : h1Count === 0 ? '⚠️ Добавьте H1' : '⚠️ Слишком много H1'}
            </Typography>
            <Typography variant="body2">
              H2: {h2Count} {h2Count >= 2 ? '✓' : '⚠️ Рекомендуется 2+ H2'}
            </Typography>
            <Typography variant="body2">
              H3: {h3Count} {h3Count >= 1 ? '✓' : '⚠️ Рекомендуется 1+ H3'}
            </Typography>
            <Typography variant="body2" color={settings.title && settings.title.length <= 60 ? 'success.main' : 'error.main'}>
              Title: {settings.title?.length || 0}/60 символов
            </Typography>
            <Typography variant="body2" color={settings.description && settings.description.length <= 160 ? 'success.main' : 'error.main'}>
              Description: {settings.description?.length || 0}/160 символов
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
