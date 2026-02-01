import { useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Paper, Typography } from '@mui/material';
import { PageTemplate } from '@/types/pageBuilder';
import { pageTemplates } from '../templates/pageTemplates';

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PageTemplate) => void;
}

export function TemplateSelector({ open, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Выберите шаблон</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {pageTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Paper
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: selectedTemplate?.id === template.id ? 2 : 1,
                  borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={() => setSelectedTemplate(template)}
              >
                <Box
                  sx={{
                    aspectRatio: '16/9',
                    backgroundColor: '#f5f5f5',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {template.thumbnail ? (
                    <Box
                      component="img"
                      src={template.thumbnail}
                      alt={template.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography variant="h4">{template.name}</Typography>
                  )}
                </Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (selectedTemplate) {
              onSelect(selectedTemplate);
              onClose();
            }
          }}
          disabled={!selectedTemplate}
        >
          Использовать шаблон
        </Button>
      </DialogActions>
    </Dialog>
  );
}
