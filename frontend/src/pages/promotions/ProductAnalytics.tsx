import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyzeProducts, listProducts, listPromotions, ProductAnalysis, PromotionItem } from '@/services/cmsApi';
import { getProductAnalytics } from '@/services/ecommerceApi';
import { ProductItem } from '@/types/cms';
import { useAuth } from '@/auth/AuthProvider';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { useToast } from '@/components/common/ToastProvider';

export function ProductAnalytics({ realAnalytics: realAnalyticsProp }: { realAnalytics?: any }) {
  const { showToast } = useToast();
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<ProductItem[]>({ 
    queryKey: ['products'], 
    queryFn: listProducts,
    retry: 1,
    enabled: !!token,
  });
  const { data: promotions = [], isLoading: promotionsLoading, error: promotionsError } = useQuery<PromotionItem[]>({ 
    queryKey: ['promotions'], 
    queryFn: listPromotions,
    retry: 1,
    enabled: !!token,
  });

  const { data: realAnalyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['productAnalytics'],
    queryFn: () => getProductAnalytics(undefined, 30),
    enabled: !!token,
  });

  // Используем переданные данные или данные из запроса
  const realAnalytics = realAnalyticsProp || realAnalyticsData;

  useEffect(() => {
    if (productsError) {
      console.error('Failed to load products:', productsError);
    }
    if (promotionsError) {
      console.error('Failed to load promotions:', promotionsError);
    }
  }, [productsError, promotionsError]);

  const handleAnalyze = async () => {
    if (products.length === 0) {
      showToast('Нет продуктов для анализа. Добавьте продукты в разделе "Продукты и стоимость"', 'warning');
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeProducts(products, promotions || []);
      setAnalysis(result);
      showToast('Анализ завершен', 'success');
    } catch (err: any) {
      console.error('Analysis error:', err);
      showToast(err?.message || 'Ошибка анализа. Проверьте, что OpenAI API ключ настроен.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDemandColor = (demand: string) => {
    if (demand === 'high') return 'success';
    if (demand === 'medium') return 'warning';
    return 'default';
  };

  const getCompetitionColor = (competition: string) => {
    if (competition === 'high') return 'error';
    if (competition === 'medium') return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AnalyticsIcon sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            Аналитика продуктов и ассортимента
          </Typography>
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AnalyticsIcon />}
          >
            Запустить анализ
          </Button>
        </Box>

        {/* Реальная аналитика из базы данных */}
        {realAnalytics && realAnalytics.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статистика просмотров и кликов (за 30 дней)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Продукт</strong></TableCell>
                      <TableCell align="right"><strong>Просмотры</strong></TableCell>
                      <TableCell align="right"><strong>Клики</strong></TableCell>
                      <TableCell align="right"><strong>В корзину</strong></TableCell>
                      <TableCell align="right"><strong>В избранное</strong></TableCell>
                      <TableCell align="right"><strong>Покупки</strong></TableCell>
                      <TableCell align="right"><strong>Просмотры кейсов</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {realAnalytics.slice(0, 10).map((item: any) => (
                      <TableRow key={item.productSlug}>
                        <TableCell>{item.productTitle}</TableCell>
                        <TableCell align="right">{item.views}</TableCell>
                        <TableCell align="right">{item.clicks}</TableCell>
                        <TableCell align="right">{item.addToCart}</TableCell>
                        <TableCell align="right">{item.addToWishlist}</TableCell>
                        <TableCell align="right">{item.purchases}</TableCell>
                        <TableCell align="right">{item.caseViews}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {!analysis && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Нажмите "Запустить анализ" для получения рекомендаций по оптимизации ассортимента продуктов и акций.
            Анализ учитывает конкурентную среду и формирует продуктовую матрицу.
            {products.length === 0 && (
              <Box sx={{ mt: 1 }}>
                <strong>Внимание:</strong> Для анализа необходимо добавить хотя бы один продукт в разделе "Продукты и стоимость".
              </Box>
            )}
          </Alert>
        )}

        {(loading || productsLoading || promotionsLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              {loading ? 'Анализируем продукты и конкурентов...' : 'Загрузка данных...'}
            </Typography>
          </Box>
        )}

        {analysis && (
          <Box>
            {/* Продуктовая матрица */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Продуктовая матрица (Цена vs Спрос vs Конкуренция)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Продукт</strong></TableCell>
                        <TableCell align="right"><strong>Цена</strong></TableCell>
                        <TableCell align="center"><strong>Спрос</strong></TableCell>
                        <TableCell align="center"><strong>Конкуренция</strong></TableCell>
                        <TableCell><strong>Рекомендация</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.matrix.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Нет данных для отображения
                          </TableCell>
                        </TableRow>
                      ) : (
                        analysis.matrix.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">
                              {item.price > 0 ? `${item.price.toLocaleString()} руб.` : 'По запросу'}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={item.demand === 'high' ? 'Высокий' : item.demand === 'medium' ? 'Средний' : 'Низкий'}
                                color={getDemandColor(item.demand)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={item.competition === 'high' ? 'Высокая' : item.competition === 'medium' ? 'Средняя' : 'Низкая'}
                                color={getCompetitionColor(item.competition)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{item.recommendation}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Ключевые выводы */}
            {analysis.insights && analysis.insights.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ключевые выводы
                  </Typography>
                  <Box component="ul" sx={{ pl: 3 }}>
                    {analysis.insights.map((insight, idx) => (
                      <Typography component="li" key={idx} sx={{ mb: 1 }}>
                        {insight}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Рекомендации */}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Рекомендации по ассортименту
                  </Typography>
                  <Grid container spacing={2}>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            {suggestion.action}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Продукт:</strong> {suggestion.product}
                          </Typography>
                          <Typography variant="body2">
                            {suggestion.reason}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Конкурентный анализ */}
            {analysis.competitiveAnalysis && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Конкурентный анализ (SWOT)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {analysis.competitiveAnalysis.strengths && analysis.competitiveAnalysis.strengths.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Сильные стороны</strong>
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {analysis.competitiveAnalysis.strengths.map((item, idx) => (
                              <Typography component="li" key={idx} variant="body2">
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                    {analysis.competitiveAnalysis.weaknesses && analysis.competitiveAnalysis.weaknesses.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Слабые стороны</strong>
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {analysis.competitiveAnalysis.weaknesses.map((item, idx) => (
                              <Typography component="li" key={idx} variant="body2">
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                    {analysis.competitiveAnalysis.opportunities && analysis.competitiveAnalysis.opportunities.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Возможности</strong>
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {analysis.competitiveAnalysis.opportunities.map((item, idx) => (
                              <Typography component="li" key={idx} variant="body2">
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                    {analysis.competitiveAnalysis.threats && analysis.competitiveAnalysis.threats.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Угрозы</strong>
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {analysis.competitiveAnalysis.threats.map((item, idx) => (
                              <Typography component="li" key={idx} variant="body2">
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                  {analysis.timestamp && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Анализ выполнен: {new Date(analysis.timestamp).toLocaleString('ru-RU')}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

