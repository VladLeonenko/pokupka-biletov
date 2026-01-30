import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, AppBar, Toolbar, IconButton, Typography, Button, Container, 
  Grid, Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
  TextField, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CheckCircle, Star } from '@mui/icons-material';
import { getSite, getSitePage } from '@/services/sitesApi';

// Рендер блоков в зависимости от типа
function BlockRenderer({ block }: { block: any }) {
  switch (block.type) {
    case 'hero':
      return (
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            py: 10,
            px: 4,
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2 }}>
            {block.content?.title || block.title || 'Hero заголовок'}
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            {block.content?.subtitle || 'Подзаголовок секции'}
          </Typography>
          <Button variant="contained" size="large" sx={{ bgcolor: '#fff', color: '#667eea' }}>
            {block.content?.ctaText || 'Призыв к действию'}
          </Button>
        </Box>
      );

    case 'features':
      return (
        <Box sx={{ py: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            {block.title || 'Преимущества'}
          </Typography>
          <Grid container spacing={3}>
            {(block.content?.features || [
              { title: 'Преимущество 1', description: 'Описание преимущества' },
              { title: 'Преимущество 2', description: 'Описание преимущества' },
              { title: 'Преимущество 3', description: 'Описание преимущества' },
            ]).map((feature: any, i: number) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ height: '100%', p: 3 }}>
                  <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      );

    case 'pricing':
      return (
        <Box sx={{ py: 6, bgcolor: '#f9f9f9', borderRadius: 3, px: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            {block.title || 'Тарифы'}
          </Typography>
          <Grid container spacing={3}>
            {(block.content?.plans || [
              { name: 'Базовый', price: '9 900 ₽', features: ['Функция 1', 'Функция 2', 'Функция 3'] },
              { name: 'Про', price: '19 900 ₽', features: ['Функция 1', 'Функция 2', 'Функция 3', 'Функция 4'] },
              { name: 'Энтерпрайз', price: 'По запросу', features: ['Всё из Про', 'Функция 5', 'Функция 6'] },
            ]).map((plan: any, i: number) => (
              <Grid item xs={12} md={4} key={i}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    p: 3, 
                    border: i === 1 ? '2px solid #667eea' : 'none',
                    position: 'relative'
                  }}
                >
                  {i === 1 && (
                    <Chip 
                      label="Популярный" 
                      sx={{ 
                        position: 'absolute', 
                        top: -12, 
                        right: 20, 
                        bgcolor: '#667eea', 
                        color: '#fff' 
                      }} 
                    />
                  )}
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 800, mb: 3 }}>
                    {plan.price}
                  </Typography>
                  {plan.features.map((feature: string, j: number) => (
                    <Box key={j} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                      <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  ))}
                  <Button variant={i === 1 ? 'contained' : 'outlined'} fullWidth sx={{ mt: 3 }}>
                    Выбрать
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      );

    case 'calculator':
      return (
        <Box 
          sx={{ 
            py: 6, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: 3,
            px: 4
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            {block.title || 'Калькулятор'}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth 
                label="Параметр 1" 
                variant="outlined"
                InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth 
                label="Параметр 2" 
                variant="outlined"
                InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                  Результат расчёта
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      );

    case 'testimonials':
      return (
        <Box sx={{ py: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            {block.title || 'Отзывы'}
          </Typography>
          <Grid container spacing={3}>
            {(block.content?.testimonials || [
              { name: 'Иван И.', company: 'Компания 1', text: 'Отличный сервис!', rating: 5 },
              { name: 'Мария С.', company: 'Компания 2', text: 'Рекомендую всем!', rating: 5 },
            ]).map((testimonial: any, i: number) => (
              <Grid item xs={12} md={6} key={i}>
                <Card sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {[...Array(testimonial.rating || 5)].map((_, j) => (
                      <Star key={j} sx={{ color: '#ffc107' }} />
                    ))}
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    "{testimonial.text}"
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {testimonial.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {testimonial.company}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      );

    case 'faq':
      return (
        <Box sx={{ py: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            {block.title || 'Частые вопросы'}
          </Typography>
          {(block.content?.questions || [
            { q: 'Вопрос 1?', a: 'Ответ 1' },
            { q: 'Вопрос 2?', a: 'Ответ 2' },
            { q: 'Вопрос 3?', a: 'Ответ 3' },
          ]).map((faq: any, i: number) => (
            <Accordion key={i} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{faq.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>{faq.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      );

    case 'cta':
      return (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: 3,
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            {block.content?.title || block.title || 'Готовы начать?'}
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            {block.content?.subtitle || 'Присоединяйтесь к нам сегодня'}
          </Typography>
          <Button variant="contained" size="large" sx={{ bgcolor: '#fff', color: '#667eea', px: 5 }}>
            {block.content?.ctaText || 'Начать'}
          </Button>
        </Box>
      );

    case 'text':
    default:
      return (
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
            {block.title || 'Текстовый блок'}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {block.content?.text || 'Содержимое текстового блока. Здесь может быть любой текст, изображения, списки и другой контент.'}
          </Typography>
        </Box>
      );
  }
}

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
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Рендерим блоки страницы */}
          {page.content?.blocks?.map((block: any) => (
            <Box key={block.id} sx={{ mb: 4 }}>
              <BlockRenderer block={block} />
            </Box>
          ))}

          {(!page.content?.blocks || page.content.blocks.length === 0) && (
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
                Добавьте блоки в редакторе для построения страницы
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
