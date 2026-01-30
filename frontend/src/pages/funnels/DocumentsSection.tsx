import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Grid, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useState } from 'react';
import { uploadDocument, deleteDocument } from '@/services/cmsApi';
import { DealDocument } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

export function DocumentsSection({ dealId, documents }: { dealId: number; documents: DealDocument[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<DealDocument['documentType']>('other');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const uploadMut = useMutation({
    mutationFn: (data: { file: File; name: string; type: DealDocument['documentType']; description?: string }) =>
      uploadDocument(dealId, data.file, data.name, data.type, data.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dealId] });
      showToast('Документ загружен', 'success');
      setDialogOpen(false);
      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('other');
      setDescription('');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при загрузке документа', 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dealId] });
      showToast('Документ удален', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при удалении документа', 'error');
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const getDocumentTypeLabel = (type: DealDocument['documentType']) => {
    switch (type) {
      case 'contract': return 'Договор';
      case 'invoice': return 'Счет';
      case 'agreement': return 'Соглашение';
      default: return 'Другое';
    }
  };

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Документы</Typography>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Загрузить документ
          </Button>
        </Box>
        {documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Нет документов</Typography>
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.id} divider>
                <ListItemText
                  primary={doc.name}
                  secondary={
                    <>
                      {getDocumentTypeLabel(doc.documentType)} • {formatFileSize(doc.fileSize)}
                      {doc.description && ` • ${doc.description}`}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    href={doc.filePath}
                    target="_blank"
                    sx={{ mr: 1 }}
                  >
                    <GetAppIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => {
                      if (window.confirm('Удалить документ?')) {
                        deleteMut.mutate(doc.id);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Загрузить документ</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth>
                Выбрать файл
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      if (!documentName) {
                        setDocumentName(file.name);
                      }
                    }
                  }}
                />
              </Button>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Выбран: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название документа"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Тип документа</InputLabel>
                <Select
                  value={documentType}
                  label="Тип документа"
                  onChange={(e) => setDocumentType(e.target.value as DealDocument['documentType'])}
                >
                  <MenuItem value="contract">Договор</MenuItem>
                  <MenuItem value="invoice">Счет</MenuItem>
                  <MenuItem value="agreement">Соглашение</MenuItem>
                  <MenuItem value="other">Другое</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!selectedFile || !documentName) {
                showToast('Выберите файл и укажите название', 'warning');
                return;
              }
              uploadMut.mutate({
                file: selectedFile,
                name: documentName,
                type: documentType,
                description: description || undefined,
              });
            }}
            disabled={!selectedFile || !documentName || uploadMut.isPending}
          >
            {uploadMut.isPending ? 'Загрузка...' : 'Загрузить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}



