import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { getApiBase } from '@/utils/apiBase';

interface PositionResult {
  keyword: string;
  position: number | null;
  url: string | null;
  status: 'found' | 'not_found' | 'checking';
  searchEngine?: string;
}

export function SeoPositionCheckerPage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [searchEngine, setSearchEngine] = useState<'google' | 'yandex'>('google');
  const [results, setResults] = useState<PositionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');

  const checkPositions = async () => {
    // Валидация
    const urlTrimmed = websiteUrl.trim();
    const keywordsTrimmed = keywords.trim();
    
    if (!urlTrimmed || !keywordsTrimmed) {
      setError('Заполните все поля');
      return;
    }

    // Валидация URL
    try {
      new URL(urlTrimmed);
    } catch (e) {
      setError('Некорректный URL. Используйте формат: https://example.com');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]); // Очищаем предыдущие результаты
    
    const keywordList = keywordsTrimmed.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywordList.length === 0) {
      setError('Введите хотя бы одно ключевое слово');
      setLoading(false);
      return;
    }

    // Устанавливаем начальные результаты со статусом 'checking'
    const initialResults: PositionResult[] = keywordList.map(keyword => ({
      keyword: keyword.trim(),
      position: null,
      url: null,
      status: 'checking' as const
    }));
    setResults(initialResults);

    // Делаем запрос к API
    try {
      const apiBase = getApiBase();
      
      const response = await fetch(`${apiBase}/api/public/seo/check-positions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          websiteUrl: urlTrimmed,
          keywords: keywordList,
          searchEngine: searchEngine
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Ошибка сервера' };
        }
        
        console.error('[SeoPositionChecker] Error response:', errorData);
        setError(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
        // Обновляем все результаты на 'not_found'
        setResults(initialResults.map(r => ({ ...r, status: 'not_found' as const })));
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data && data.results && Array.isArray(data.results)) {
        // Валидируем результаты
        const validResults: PositionResult[] = data.results.map((r: any) => ({
          keyword: r.keyword || '',
          position: r.position !== null && r.position !== undefined ? Number(r.position) : null,
          url: r.url || null,
          status: r.status === 'found' ? 'found' : r.status === 'not_found' ? 'not_found' : 'checking',
          searchEngine: r.searchEngine || searchEngine
        }));
        
        setResults(validResults);
        setDisclaimer(data.disclaimer || '');
      } else {
        console.error('[SeoPositionChecker] Invalid response format:', data);
        setError('Неверный формат ответа от сервера');
        setResults(initialResults.map(r => ({ ...r, status: 'not_found' as const })));
      }
    } catch (err) {
      console.error('[SeoPositionChecker] Request error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(`Ошибка при проверке позиций: ${errorMessage}`);
      // Обновляем все результаты на 'not_found'
      setResults(initialResults.map(r => ({ ...r, status: 'not_found' as const })));
    } finally {
      setLoading(false);
    }
  };

  // Экспорт результатов в CSV
  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvHeader = 'Ключевое слово,Позиция,URL,Статус\n';
    const csvRows = results.map(r => {
      const keyword = r.keyword.replace(/"/g, '""');
      const position = r.position || 'Не найдено';
      const url = r.url || '—';
      const status = r.status === 'found' ? 'Найдено' : r.status === 'not_found' ? 'Не найдено' : 'Проверяется';
      return `"${keyword}",${position},"${url}","${status}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seo-positions-${websiteUrl.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Расчет статистики
  const stats = results.length > 0 ? {
    total: results.length,
    found: results.filter(r => r.status === 'found').length,
    notFound: results.filter(r => r.status === 'not_found').length,
    avgPosition: results.filter(r => r.position !== null).length > 0
      ? results.filter(r => r.position !== null).reduce((sum, r) => sum + (r.position || 0), 0) / results.filter(r => r.position !== null).length
      : 0,
    top10: results.filter(r => r.position !== null && r.position <= 10).length,
    top30: results.filter(r => r.position !== null && r.position <= 30).length
  } : null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Проверка позиций сайта в поиске — бесплатный инструмент"
        description="Узнайте позиции вашего сайта по ключевым запросам в Яндексе и Google. Введите ключи — получите отчёт. Без регистрации."
        keywords="проверка позиций сайта, SEO мониторинг, позиции в выдаче, бесплатный инструмент"
        url={currentUrl}
      />
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', pt: { xs: 6.25, md: 6.25 } }}>
        <Typography variant="overline" sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>SEO</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>Проверка позиций</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Мониторинг позиций вашего сайта по ключевым запросам в поисковых системах
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL сайта"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Поисковая система
                  </Typography>
                  <ToggleButtonGroup
                    value={searchEngine}
                    exclusive
                    onChange={(_, value) => value && setSearchEngine(value)}
                    aria-label="Выбор поисковой системы"
                    fullWidth
                  >
                    <ToggleButton value="google" aria-label="Google">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img 
                          src="https://www.google.com/favicon.ico" 
                          alt="Google" 
                          style={{ width: 20, height: 20 }} 
                        />
                        <span>Google</span>
                      </Box>
                    </ToggleButton>
                    <ToggleButton value="yandex" aria-label="Yandex">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img 
                          src="https://yandex.ru/favicon.ico" 
                          alt="Яндекс" 
                          style={{ width: 20, height: 20 }} 
                        />
                        <span>Яндекс</span>
                      </Box>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Ключевые слова"
                  placeholder="Введите ключевые слова, каждое с новой строки"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  variant="outlined"
                  helperText="Введите одно ключевое слово на строку (поддерживается кириллица и латиница)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  onClick={checkPositions}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Проверка позиций...' : `Проверить позиции в ${searchEngine === 'google' ? 'Google' : 'Яндекс'}`}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {disclaimer && results.length > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">{disclaimer}</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
              <Button 
                size="small" 
                href="https://search.google.com/search-console" 
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Search Console →
              </Button>
              <Button 
                size="small" 
                href="https://webmaster.yandex.ru/" 
                target="_blank"
                rel="noopener noreferrer"
              >
                Яндекс.Вебмастер →
              </Button>
            </Box>
          </Alert>
        )}

        {results.length > 0 && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">Результаты проверки</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Поисковая система: {searchEngine === 'google' ? 'Google' : 'Яндекс'}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={exportToCSV}
                >
                  Экспорт в CSV
                </Button>
              </Box>

              {/* Статистика */}
              {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <Typography variant="h6">{stats.total}</Typography>
                      <Typography variant="caption">Всего</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography variant="h6">{stats.found}</Typography>
                      <Typography variant="caption">Найдено</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="h6">{stats.notFound}</Typography>
                      <Typography variant="caption">Не найдено</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <Typography variant="h6">{stats.avgPosition > 0 ? stats.avgPosition.toFixed(1) : '—'}</Typography>
                      <Typography variant="caption">Средняя позиция</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                      <Typography variant="h6">{stats.top10}</Typography>
                      <Typography variant="caption">Топ-10</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                      <Typography variant="h6">{stats.top30}</Typography>
                      <Typography variant="caption">Топ-30</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Ключевое слово</strong></TableCell>
                      <TableCell><strong>Позиция</strong></TableCell>
                      <TableCell><strong>URL</strong></TableCell>
                      <TableCell><strong>Статус</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.keyword}</TableCell>
                        <TableCell>
                          {result.status === 'checking' ? (
                            <CircularProgress size={20} />
                          ) : result.position ? (
                            <Typography color={result.position <= 10 ? 'success.main' : 'warning.main'}>
                              {result.position}
                            </Typography>
                          ) : (
                            'Не найдено'
                          )}
                        </TableCell>
                        <TableCell>
                          {result.url ? (
                            <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
                              {result.url}
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === 'checking' && <Chip label="Проверяется..." size="small" color="default" />}
                          {result.status === 'found' && <Chip label="Найдено" size="small" color="success" />}
                          {result.status === 'not_found' && <Chip label="Не найдено" size="small" color="error" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
      <style>{`
        /* Стили для меню - скрыто по умолчанию */
        .menu {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          opacity: 0 !important;
          visibility: hidden !important;
          z-index: 50 !important;
          pointer-events: none !important;
          transition: opacity 0.3s ease, visibility 0.3s ease !important;
        }

        #burger-toggle:checked ~ .menu {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          z-index: 52 !important;
        }

        body {
          position: relative !important;
        }
      `}</style>
    </>
  );
}

