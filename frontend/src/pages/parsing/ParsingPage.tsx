import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, TextField, Typography, Paper, Grid, Card, CardContent, Alert, CircularProgress, Chip, IconButton } from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import { useToast } from '@/components/common/ToastProvider';
import { getApiBase } from '@/utils/apiBase';

interface ParsingResult {
  url: string;
  services: Array<{
    title: string;
    description?: string;
    price?: string;
    link?: string;
    image?: string;
  }>;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export function ParsingPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<ParsingResult[]>([]);

  const parseMutation = useMutation({
    mutationFn: async (parseUrl: string) => {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/admin/parsing/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({ url: parseUrl })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка парсинга');
      }
      
      return await response.json();
    },
    onSuccess: (data, parseUrl) => {
      setResults(prev => [...prev, {
        url: parseUrl,
        services: data.services || [],
        status: 'success'
      }]);
      showToast(`Парсинг завершен. Найдено услуг: ${data.services?.length || 0}`, 'success');
      setUrl('');
    },
    onError: (error: Error, parseUrl) => {
      setResults(prev => [...prev, {
        url: parseUrl,
        services: [],
        status: 'error',
        error: error.message
      }]);
      showToast(`Ошибка парсинга: ${error.message}`, 'error');
    }
  });

  const importMutation = useMutation({
    mutationFn: async (services: ParsingResult['services']) => {
      const API_BASE = getApiBase();
      const response = await fetch(`${API_BASE}/api/admin/parsing/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({ services })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка импорта');
      }
      
      return await response.json();
    },
    onSuccess: async (data) => {
      const message = data.saved > 0 
        ? `Импортировано товаров: ${data.saved}${data.skipped > 0 ? `, пропущено дубликатов: ${data.skipped}` : ''}`
        : `Все товары уже существуют в базе (пропущено: ${data.skipped})`;
      showToast(message, data.saved > 0 ? 'success' : 'info');
      // Обновляем список товаров
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      showToast(`Ошибка импорта: ${error.message}`, 'error');
    }
  });

  const handleParse = () => {
    if (!url.trim()) {
      showToast('Введите URL для парсинга', 'error');
      return;
    }
    
    // Добавляем результат со статусом pending
    setResults(prev => [...prev, {
      url: url.trim(),
      services: [],
      status: 'pending'
    }]);
    
    parseMutation.mutate(url.trim());
  };

  const handleImport = (services: ParsingResult['services']) => {
    if (services.length === 0) {
      showToast('Нет услуг для импорта', 'error');
      return;
    }
    importMutation.mutate(services);
  };

  const handleRemoveResult = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const allServices = results.flatMap(r => r.services);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Парсинг услуг</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Добавить сайт для парсинга</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="URL сайта"
              placeholder="https://example.com/services"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleParse();
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<PlayIcon />}
              onClick={handleParse}
              disabled={parseMutation.isPending || !url.trim()}
              sx={{ height: '56px' }}
            >
              {parseMutation.isPending ? 'Парсинг...' : 'Запустить парсинг'}
            </Button>
          </Grid>
        </Grid>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Введите URL страницы с услугами. Скрипт автоматически найдет и извлечет информацию об услугах.
        </Alert>
      </Paper>

      {/* Результаты парсинга */}
      {results.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Результаты парсинга ({results.length} сайтов)
            </Typography>
            {allServices.length > 0 && (
              <Button
                variant="contained"
                color="success"
                onClick={() => handleImport(allServices)}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? 'Импорт...' : `Импортировать все (${allServices.length})`}
              </Button>
            )}
          </Box>

          {results.map((result, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {result.url}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {result.status === 'success' && (
                      <Chip label={`${result.services.length} услуг`} color="success" size="small" />
                    )}
                    {result.status === 'error' && (
                      <Chip label="Ошибка" color="error" size="small" />
                    )}
                    {result.status === 'pending' && (
                      <CircularProgress size={20} />
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveResult(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {result.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {result.error}
                  </Alert>
                )}

                {result.status === 'success' && result.services.length > 0 && (
                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleImport(result.services)}
                      disabled={importMutation.isPending}
                      sx={{ mb: 2 }}
                    >
                      Импортировать эти услуги ({result.services.length})
                    </Button>
                    <Grid container spacing={1}>
                      {result.services.slice(0, 10).map((service, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={idx}>
                          <Card variant="outlined">
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                {service.title}
                              </Typography>
                              {service.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                  {service.description.substring(0, 100)}...
                                </Typography>
                              )}
                              {service.price && (
                                <Typography variant="caption" color="primary">
                                  {service.price}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                      {result.services.length > 10 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                            ... и еще {result.services.length - 10} услуг
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}

      {/* Быстрые ссылки для парсинга популярных сайтов */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Быстрый парсинг популярных сайтов</Typography>
        <Grid container spacing={2}>
          {[
            { url: 'https://requestdesign.ru/uslugi/', name: 'Request Design' },
            { url: 'https://prom8.ru', name: 'Prom8' },
            { url: 'https://veonix.ru/services/', name: 'Veonix' },
            { url: 'https://skobeeff.com', name: 'Skobeeff' },
            { url: 'https://kokocgroup.ru', name: 'Kokoc Group' },
          ].map((site) => (
            <Grid item xs={12} sm={6} md={4} key={site.url}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setUrl(site.url);
                  setTimeout(() => handleParse(), 100);
                }}
                disabled={parseMutation.isPending}
              >
                {site.name}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

