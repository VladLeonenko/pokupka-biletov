import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Paper, LinearProgress, Chip, Alert, Divider, CircularProgress } from '@mui/material';
import { Search as SearchIcon, CheckCircle, Error, Warning } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { getApiBase } from '@/utils/apiBase';

interface AuditResult {
  speed: {
    score: number;
    mobileScore: number;
    desktopScore: number;
    loadTime?: number;
    htmlSize?: number;
  };
  mobile: {
    isResponsive: boolean;
    viewport: string | null;
  };
  errors: {
    count: number;
    items: Array<{ type: string; message: string; url: string }>;
  };
  seo: {
    score: number;
    issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }>;
  };
}

export function TechnicalAuditPage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!websiteUrl.trim()) {
      setError('Введите URL сайта');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/public/seo/technical-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: websiteUrl.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.speed && data.mobile && data.errors && data.seo) {
          setAuditResult(data);
        } else {
          setError('Неверный формат ответа от сервера');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
        setError(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError('Ошибка при проведении аудита. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Технический аудит сайта - Primecoder"
        description="Инструмент для аудита SEO: скорость загрузки, ошибки, мобильная адаптация"
        url={currentUrl}
      />
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', pt: { xs: 10, md: 12 } }}>
        <Typography variant="overline" sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>Инструменты</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>Технический аудит</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Аудит SEO: скорость загрузки, ошибки, мобильная адаптация
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
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  onClick={runAudit}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Проведение аудита...' : 'Запустить аудит'}
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

        {auditResult && (
          <Grid container spacing={3}>
            {/* Скорость */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Скорость загрузки</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Общий балл</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={auditResult.speed.score}
                      color={getScoreColor(auditResult.speed.score)}
                      sx={{ height: 10, borderRadius: 1, mb: 1 }}
                    />
                    <Typography variant="h4" color={`${getScoreColor(auditResult.speed.score)}.main`}>
                      {auditResult.speed.score}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Мобильная версия</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={auditResult.speed.mobileScore}
                      color={getScoreColor(auditResult.speed.mobileScore)}
                      sx={{ height: 8, borderRadius: 1, mb: 1 }}
                    />
                    <Typography>{auditResult.speed.mobileScore}</Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Десктоп версия</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={auditResult.speed.desktopScore}
                      color={getScoreColor(auditResult.speed.desktopScore)}
                      sx={{ height: 8, borderRadius: 1, mb: 1 }}
                    />
                    <Typography>{auditResult.speed.desktopScore}</Typography>
                  </Box>
                  {auditResult.speed.loadTime && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Время загрузки: {auditResult.speed.loadTime} мс
                      </Typography>
                    </Box>
                  )}
                  {auditResult.speed.htmlSize && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Размер HTML: {(auditResult.speed.htmlSize / 1024).toFixed(2)} КБ
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Мобильная адаптация */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Мобильная адаптация</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {auditResult.mobile.isResponsive ? (
                      <>
                        <CheckCircle color="success" />
                        <Typography>Сайт адаптирован для мобильных устройств</Typography>
                      </>
                    ) : (
                      <>
                        <Error color="error" />
                        <Typography>Сайт не адаптирован для мобильных устройств</Typography>
                      </>
                    )}
                  </Box>
                  {auditResult.mobile.viewport && (
                    <Typography variant="body2" color="text.secondary">
                      Viewport: {auditResult.mobile.viewport}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Ошибки */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ошибки ({auditResult.errors.count})
                  </Typography>
                  {auditResult.errors.items.length > 0 ? (
                    <Box>
                      {auditResult.errors.items.map((error, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                          <Chip label={error.type} size="small" color="error" sx={{ mb: 1 }} />
                          <Typography variant="body2" sx={{ mb: 1 }}>{error.message}</Typography>
                          <Typography variant="caption" color="text.secondary">{error.url}</Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">Ошибок не найдено</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* SEO */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>SEO Аудит</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Общий балл</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={auditResult.seo.score}
                      color={getScoreColor(auditResult.seo.score)}
                      sx={{ height: 10, borderRadius: 1, mb: 1 }}
                    />
                    <Typography variant="h4" color={`${getScoreColor(auditResult.seo.score)}.main`}>
                      {auditResult.seo.score}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Проблемы:</Typography>
                  {auditResult.seo.issues.map((issue, index) => (
                    <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'start', gap: 1 }}>
                      {issue.type === 'error' && <Error color="error" fontSize="small" />}
                      {issue.type === 'warning' && <Warning color="warning" fontSize="small" />}
                      {issue.type === 'info' && <CheckCircle color="info" fontSize="small" />}
                      <Typography variant="body2">{issue.message}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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

