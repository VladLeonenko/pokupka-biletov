import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Container, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem,
  Toolbar,
  Paper,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getCommercialProposal } from '@/services/cmsApi';
import { ProposalViewer } from '@/components/commercial-proposals/ProposalViewer';
import { exportProposalToPDF, exportProposalToPNG, exportProposalToHTML } from '@/utils/exportProposal';
import { useToast } from '@/components/common/ToastProvider';

export function ProposalViewPage() {
  const { id } = useParams<{ id: string }>();
  const { searchParams } = new URL(window.location.href);
  const shareToken = searchParams.get('token') || undefined;
  const { showToast } = useToast();
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['commercial-proposal', id, shareToken],
    queryFn: () => getCommercialProposal(Number(id!), shareToken),
    enabled: !!id,
  });

  const handleExportPDF = async () => {
    setExportMenuAnchor(null);
    setIsExporting(true);
    try {
      console.log('Начало экспорта в PDF...');
      const filename = `${proposal?.title || 'commercial-proposal'}.pdf`.replace(/[^a-z0-9._-]/gi, '-');
      console.log('Имя файла:', filename);
      
      // Небольшая задержка для закрытия меню
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Поиск контейнера с ID: proposal-export-container');
      const container = document.getElementById('proposal-export-container');
      if (!container) {
        throw new Error('Контейнер с ID "proposal-export-container" не найден на странице');
      }
      console.log('Контейнер найден, начинаю экспорт...');
      await exportProposalToPDF('proposal-export-container', filename);
      console.log('Экспорт завершен успешно');
      showToast('PDF экспортирован успешно', 'success');
    } catch (err) {
      console.error('Ошибка при экспорте в PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showToast(`Ошибка при экспорте в PDF: ${errorMessage}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    setExportMenuAnchor(null);
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const filename = `${proposal?.title || 'commercial-proposal'}.png`.replace(/[^a-z0-9._-]/gi, '-');
      await exportProposalToPNG('proposal-export-container', filename);
      showToast('PNG экспортирован успешно', 'success');
    } catch (err) {
      showToast('Ошибка при экспорте в PNG', 'error');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = () => {
    setExportMenuAnchor(null);
    try {
      const filename = `${proposal?.title || 'commercial-proposal'}.html`.replace(/[^a-z0-9._-]/gi, '-');
      exportProposalToHTML('proposal-export-container', filename);
      showToast('HTML экспортирован успешно', 'success');
    } catch (err) {
      showToast('Ошибка при экспорте в HTML', 'error');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !proposal) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" color="error">
          Ошибка загрузки коммерческого предложения
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          {error instanceof Error ? error.message : 'Предложение не найдено'}
        </Typography>
      </Container>
    );
  }

  return (
    <Box>
      <Paper 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 1000, 
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>{proposal.title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isExporting && (
              <CircularProgress size={24} />
            )}
            <IconButton
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              aria-label="Экспорт"
              disabled={isExporting}
            >
              <GetAppIcon />
            </IconButton>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
            >
              <MenuItem onClick={handleExportPDF}>
                <PictureAsPdfIcon sx={{ mr: 1 }} />
                Экспорт в PDF
              </MenuItem>
              <MenuItem onClick={handleExportPNG}>
                <ImageIcon sx={{ mr: 1 }} />
                Экспорт в PNG
              </MenuItem>
              <MenuItem onClick={handleExportHTML}>
                <CodeIcon sx={{ mr: 1 }} />
                Экспорт в HTML
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Paper>
      <ProposalViewer proposal={proposal} />
    </Box>
  );
}

