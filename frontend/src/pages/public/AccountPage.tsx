import { useQuery } from '@tanstack/react-query';
import { getMyOrders } from '@/services/ecommerceApi';
import { Box, Typography, Card, CardContent, Grid, Button, Avatar, Divider, Chip, Accordion, AccordionSummary, AccordionDetails, Link, List, ListItem, ListItemText, ListItemIcon, Container } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ForumIcon from '@mui/icons-material/Forum';
import ArticleIcon from '@mui/icons-material/Article';
import LaunchIcon from '@mui/icons-material/Launch';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import WorkspacesIcon from '@mui/icons-material/Workspaces';

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: ordersData } = useQuery({
    queryKey: ['myOrders'],
    queryFn: getMyOrders,
    enabled: !!user,
  });

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Войдите, чтобы просмотреть личный кабинет</Typography>
          <Button variant="contained" onClick={() => navigate('/admin/login')}>
            Войти
          </Button>
        </Box>
      </Container>
    );
  }

  const orders = ordersData?.orders || [];

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Личный кабинет - Primecoder"
        description="Личный кабинет пользователя"
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Личный кабинет</Typography>

      <Grid container spacing={3}>
        {/* Профиль */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 80, height: 80, mb: 2 }}>
                  {(user as any)?.name?.[0] || user.email?.[0] || <PersonIcon />}
                </Avatar>
                <Typography variant="h6">{(user as any)?.name || 'Пользователь'}</Typography>
                {user.email && <Typography variant="body2" color="text.secondary">{user.email}</Typography>}
                {(user as any)?.phone && <Typography variant="body2" color="text.secondary">{(user as any).phone}</Typography>}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Button variant="outlined" fullWidth onClick={logout} sx={{ mb: 1 }}>
                Выйти
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Основной контент */}
        <Grid item xs={12} md={8}>
          {/* Быстрые действия */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Быстрые действия</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => navigate('/cart')}
                  >
                    Корзина
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<FavoriteIcon />}
                    onClick={() => navigate('/wishlist')}
                  >
                    Избранное
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => navigate('/catalog')}
                  >
                    Каталог
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<SmartToyIcon />}
                    onClick={() => navigate('/account/ai-team')}
                  >
                    AI Boost Team
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<WorkspacesIcon />}
                    onClick={() => navigate('/account/projects')}
                  >
                    Проектные услуги
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SmartToyIcon />}
                    onClick={() => navigate('/ai-chat')}
                    sx={{
                      bgcolor: '#1976d2',
                      '&:hover': { bgcolor: '#1565c0' },
                    }}
                  >
                    AI Ассистент
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Заказы */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Мои заказы</Typography>
              {orders.length === 0 ? (
                <Typography color="text.secondary">У вас пока нет заказов</Typography>
              ) : (
                <Box>
                  {orders.map((order) => (
                    <Card key={order.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle1">Заказ #{order.orderNumber}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {order.createdAt && new Date(order.createdAt).toLocaleDateString('ru-RU')}
                            </Typography>
                          </Box>
                          <Chip
                            label={
                              order.status === 'pending' ? 'Ожидает оплаты' :
                              order.status === 'paid' ? 'Оплачен' :
                              order.status === 'processing' ? 'В обработке' :
                              order.status === 'shipped' ? 'Отправлен' :
                              order.status === 'delivered' ? 'Доставлен' :
                              'Отменен'
                            }
                            color={
                              order.status === 'pending' ? 'warning' :
                              order.status === 'paid' || order.status === 'processing' ? 'info' :
                              order.status === 'delivered' ? 'success' :
                              'error'
                            }
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2">
                          Товаров: {order.items?.length || 0} | Сумма: {order.totalCents ? `${(order.totalCents / 100).toFixed(2)} ${order.currency}` : '—'}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => navigate(`/orders/${order.orderNumber}`)}
                          sx={{ mt: 1 }}
                        >
                          Подробнее
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Полезные инструменты */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Полезные инструменты</Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon />
                    <Typography variant="subtitle1">Проверка видимости и позиций</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Мониторинг позиций сайта по ключевым запросам в поисковых системах
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/tools/position-checker')}
                    sx={{ mb: 2 }}
                  >
                    Открыть инструмент проверки позиций
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildIcon />
                    <Typography variant="subtitle1">Проверка технического состояния сайта</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Аудит SEO: скорость загрузки, ошибки, мобильная адаптация
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/tools/technical-audit')}
                    sx={{ mb: 2 }}
                  >
                    Открыть технический аудит
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon />
                    <Typography variant="subtitle1">🚀 Личное развитие</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Управляйте всеми аспектами личного развития: тренировки, питание, чтение, образование и финансы в одном месте
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/account/personal-development')}
                    sx={{
                      mb: 2,
                      background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 50%, #ff9800 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #8e24aa 0%, #d81b60 50%, #f57c00 100%)',
                      },
                    }}
                  >
                    Открыть центр личного развития
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RateReviewIcon />
                    <Typography variant="subtitle1">Мониторинг отзывов и репутации</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Управление отзывами и отслеживание упоминаний бренда
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/tools/reputation-monitor')}
                    sx={{ mb: 2 }}
                  >
                    Открыть мониторинг репутации
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalculateIcon />
                    <Typography variant="subtitle1">Прогноз бюджета и окупаемости</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Калькулятор ROI (возврат инвестиций) для рекламных кампаний
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/tools/roi-calculator')}
                    sx={{ mb: 2 }}
                  >
                    Открыть калькулятор ROI
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceWalletIcon />
                    <Typography variant="subtitle1">⚙️ Настройки конфиденциальности</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Управляйте согласиями на обработку персональных данных и настройками cookies
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/account/privacy-settings')}
                    sx={{
                      mb: 2,
                      background: 'linear-gradient(135deg, #2196f3 0%, #9c27b0 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e88e5 0%, #8e24aa 100%)',
                      },
                    }}
                  >
                    Открыть настройки конфиденциальности
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceWalletIcon />
                    <Typography variant="subtitle1">💰 Финансовый планировщик</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Персональный финансовый планировщик: управляйте бюджетом, отслеживайте цели по накоплениям и инвестициям
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/account/finance-planner')}
                    sx={{
                      mb: 2,
                      background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
                      },
                    }}
                  >
                    Открыть финансовый планировщик
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ForumIcon />
                    <Typography variant="subtitle1">Полезные ссылки</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Русскоязычные SEO-форумы
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><LaunchIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="SearchEngines"
                        secondary="Русскоязычный форум о поисковых системах и SEO"
                      />
                      <Link href="https://www.searchengines.ru" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LaunchIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Webmasters.ru"
                        secondary="Форум веб-мастеров и SEO-специалистов"
                      />
                      <Link href="https://webmasters.ru" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LaunchIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Maultalk"
                        secondary="Форум о интернет-маркетинге и SEO"
                      />
                      <Link href="https://maultalk.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Зарубежные форумы
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><LaunchIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="WarriorForum"
                        secondary="Форум о маркетинге и бизнесе в интернете"
                      />
                      <Link href="https://www.warriorforum.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LaunchIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Moz Community"
                        secondary="Сообщество SEO-специалистов от Moz"
                      />
                      <Link href="https://moz.com/community" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    SEO-блоги и обзоры
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="SEOnews"
                        secondary="Новости и статьи о SEO"
                      />
                      <Link href="https://www.seonews.ru" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Rookee блог"
                        secondary="Блог о SEO и интернет-маркетинге"
                      />
                      <Link href="https://rookee.ru/blog" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="SEMrush Blog"
                        secondary="Блог о SEO и контент-маркетинге от SEMrush"
                      />
                      <Link href="https://www.semrush.com/blog/" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Ahrefs Blog"
                        secondary="Статьи о SEO и контент-маркетинге от Ahrefs"
                      />
                      <Link href="https://ahrefs.com/blog" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Обзоры и рейтинги инструментов
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Zennolab"
                        secondary="Обзоры инструментов для автоматизации и SEO"
                      />
                      <Link href="https://zennolab.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="BlagoIT"
                        secondary="Обзоры IT-инструментов и сервисов"
                      />
                      <Link href="https://blagoit.ru" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="SearchIndustrial"
                        secondary="Обзоры и рейтинги SEO-инструментов"
                      />
                      <Link href="https://searchindustrial.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
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

