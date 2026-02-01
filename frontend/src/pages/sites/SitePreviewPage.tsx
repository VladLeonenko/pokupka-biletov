import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, AppBar, Toolbar, IconButton, Typography, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getSite, getSitePage } from '@/services/sitesApi';
import { SectionRenderer } from '@/components/pageBuilder/SectionRenderer';

export default function SitePreviewPage() {
  const { siteId, pageId } = useParams<{ siteId: string; pageId: string }>();
  const navigate = useNavigate();

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(Number(siteId)),
    enabled: !!siteId,
  });

  const { data: page } = useQuery({
    queryKey: ['sitePage', siteId, pageId],
    queryFn: () => getSitePage(Number(siteId), Number(pageId)),
    enabled: !!siteId && !!pageId,
  });

  if (!page) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#1a1a1a' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate(`/admin/sites/${siteId}/pages/${pageId}`)}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, ml: 2 }}>
            Предпросмотр: {page.title} • {site?.domain}
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate(`/admin/sites/${siteId}/pages/${pageId}`)}
          >
            Вернуться к редактору
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f5f5f5' }}>
        <Box>
          {/* Рендерим секции страницы */}
          {page.content?.sections?.map((section: any) => (
            <SectionRenderer key={section.id} section={section} />
          ))}

          {/* Обратная совместимость со старыми блоками */}
          {page.content?.blocks && (!page.content?.sections || page.content.sections.length === 0) && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Старая версия страницы. Пожалуйста, обновите страницу, используя новую систему секций.
              </Typography>
            </Box>
          )}

          {(!page.content?.sections || page.content.sections.length === 0) &&
           (!page.content?.blocks || page.content.blocks.length === 0) && (
            <Box
              sx={{
                p: 8,
                textAlign: 'center',
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Typography variant="h5" color="text.secondary">
                Страница пуста
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Добавьте секции в редакторе для построения страницы
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
