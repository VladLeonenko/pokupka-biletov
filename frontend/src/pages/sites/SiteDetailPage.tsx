import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getSite, getSitePages, listSiteLeads } from '@/services/sitesApi';

export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const id = siteId;
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => getSite(Number(id)),
    enabled: !!id,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['sitePages', id],
    queryFn: () => getSitePages(Number(id)),
    enabled: !!id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['siteLeads', id],
    queryFn: () => listSiteLeads(Number(id)),
    enabled: !!id,
  });

  if (siteLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!site) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Сайт не найден</Typography>
        <Button onClick={() => navigate('/admin/sites')} sx={{ mt: 2 }}>
          Назад к списку
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/sites')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{site.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {site.domain}
          </Typography>
        </Box>
        <Chip label={site.status} color={site.status === 'active' ? 'success' : 'default'} />
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Страниц
              </Typography>
              <Typography variant="h3">{pages.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Лидов (30 дней)
              </Typography>
              <Typography variant="h3">{leads.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Новых лидов
              </Typography>
              <Typography variant="h3">
                {leads.filter(l => l.status === 'new').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Страницы" />
          <Tab label="Лиды" />
          <Tab label="Настройки" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Страницы сайта</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => navigate(`/admin/sites/${id}/pages/new`)}
            >
              Создать страницу
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата создания</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">Нет страниц</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>{page.title}</TableCell>
                      <TableCell>
                        <code>/{page.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={page.isPublished ? 'Опубликована' : 'Черновик'}
                          size="small"
                          color={page.isPublished ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(page.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small"
                          onClick={() => navigate(`/admin/sites/${id}/pages/${page.id}`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small"
                          onClick={() => window.open(`/${page.slug}`, '_blank')}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Лиды</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Компания</TableCell>
                  <TableCell>UTM Source</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">Нет лидов</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{lead.name || '—'}</TableCell>
                      <TableCell>{lead.email || '—'}</TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>{lead.company || '—'}</TableCell>
                      <TableCell>{lead.utmSource || '—'}</TableCell>
                      <TableCell>
                        <Chip label={lead.status} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Настройки сайта</Typography>
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Домен</Typography>
                <Typography>{site.domain}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Тип</Typography>
                <Typography>{site.type}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Шаблон</Typography>
                <Typography>{site.template}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined">Редактировать настройки</Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

