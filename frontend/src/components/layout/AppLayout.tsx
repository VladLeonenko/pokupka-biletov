import { PropsWithChildren, useEffect, useState } from 'react';
import { Box, CssBaseline, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Toolbar, AppBar, Typography, useTheme, useMediaQuery, Tooltip, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import SeoIcon from '@mui/icons-material/Tag';
import { useNavigate, useLocation } from 'react-router-dom';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import PriceIcon from '@mui/icons-material/PriceChange';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LaunchIcon from '@mui/icons-material/Launch';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MapIcon from '@mui/icons-material/Map';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NotificationsBell } from '@/components/common/NotificationsBell';
import { useAuth } from '@/auth/AuthProvider';

const drawerWidth = 260;

type NavItem = { label: string; icon: React.ReactNode; path: string; group: string; roles?: ('admin' | 'sales_manager')[] };

const NAV_ITEMS: NavItem[] = [
  { label: 'Обзор', icon: <DashboardIcon />, path: '/admin', group: 'Главное', roles: ['admin', 'sales_manager'] },
  { label: 'Аналитика продаж', icon: <AssessmentIcon />, path: '/admin/sales-analytics', group: 'Главное', roles: ['admin'] },

  { label: 'GetBilet: мероприятия', icon: <ConfirmationNumberIcon />, path: '/admin/getbilet/events', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: схемы залов', icon: <MapIcon />, path: '/admin/getbilet/stage-maps', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: наценка', icon: <PriceIcon />, path: '/admin/getbilet/markup', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'Цены конкурентов (Афиша…)', icon: <TrendingDownIcon />, path: '/admin/getbilet/competitor-prices', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: промокоды', icon: <LocalOfferIcon />, path: '/admin/getbilet/promos', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'Витрина билетов (контент)', icon: <StorefrontIcon />, path: '/admin/tickets-vitrine', group: 'Билеты', roles: ['admin', 'sales_manager'] },
  { label: 'Снайпер мест', icon: <GpsFixedIcon />, path: '/admin/sniper', group: 'Билеты', roles: ['admin'] },

  { label: 'Страницы', icon: <DescriptionIcon />, path: '/admin/pages', group: 'Контент', roles: ['admin'] },
  { label: 'Блог', icon: <ArticleIcon />, path: '/admin/blog', group: 'Контент', roles: ['admin'] },
  { label: 'SEO', icon: <SeoIcon />, path: '/admin/seo', group: 'Контент', roles: ['admin'] },
  { label: 'Категории продуктов', icon: <CategoryIcon />, path: '/admin/product-categories', group: 'Контент', roles: ['admin'] },
  { label: 'Акции', icon: <LocalOfferIcon />, path: '/admin/promotions', group: 'Контент', roles: ['admin', 'sales_manager'] },

  { label: 'Заказы', icon: <ReceiptLongIcon />, path: '/admin/orders', group: 'Продажи', roles: ['admin', 'sales_manager'] },
  { label: 'Формы', icon: <AssignmentIcon />, path: '/admin/forms', group: 'Продажи', roles: ['admin', 'sales_manager'] },
  { label: 'Воронки', icon: <AccountTreeIcon />, path: '/admin/funnels', group: 'Продажи', roles: ['admin', 'sales_manager'] },
  { label: 'Клиенты', icon: <PeopleIcon />, path: '/admin/clients', group: 'Продажи', roles: ['admin', 'sales_manager'] },

  { label: 'Чаты', icon: <ChatIcon />, path: '/admin/chat', group: 'CRM', roles: ['admin', 'sales_manager'] },
  { label: 'Настройки чат-бота', icon: <SmartToyIcon />, path: '/admin/chatbot', group: 'CRM', roles: ['admin'] },
  { label: 'Отзывы', icon: <RateReviewIcon />, path: '/admin/reviews', group: 'CRM', roles: ['admin', 'sales_manager'] },
  { label: 'Команда', icon: <PeopleIcon />, path: '/admin/team', group: 'CRM', roles: ['admin'] },

  { label: 'Админы', icon: <AdminPanelSettingsIcon />, path: '/admin/admins', group: 'Система', roles: ['admin'] },
];

function isNavSelected(path: string, pathname: string) {
  if (path === '/admin') return pathname === '/admin';
  return pathname === path || pathname.startsWith(path + '/');
}

export function AppLayout({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggle } = useThemeMode();
  const { token, user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_fav_nav') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('admin_fav_nav', JSON.stringify(favorites)); } catch { /* ignore */ }
  }, [favorites]);
  const toggleFavorite = (path: string) =>
    setFavorites((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const current = NAV_ITEMS.find((item) => isNavSelected(item.path, location.pathname))?.group;
    return new Set(current ? ['Главное', current] : ['Главное']);
  });
  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });

  useEffect(() => {
    const current = NAV_ITEMS.find((item) => isNavSelected(item.path, location.pathname))?.group;
    if (!current) return;
    setOpenGroups((prev) => (prev.has(current) ? prev : new Set(prev).add(current)));
  }, [location.pathname]);

  if (!token) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    const roles = item.roles ?? ['admin'];
    return roles.includes((user?.role as 'admin' | 'sales_manager') ?? 'admin');
  });
  const favItems = visibleItems.filter((i) => favorites.includes(i.path));
  const groupedItems = new Map<string, NavItem[]>();
  for (const item of visibleItems) {
    if (favorites.includes(item.path)) continue;
    if (!groupedItems.has(item.group)) groupedItems.set(item.group, []);
    groupedItems.get(item.group)!.push(item);
  }

  const renderItem = (item: NavItem) => (
    <ListItemButton
      key={item.path}
      dense
      sx={{ py: 0.4 }}
      selected={isNavSelected(item.path, location.pathname)}
      onClick={() => {
        navigate(item.path);
        setMobileOpen(false);
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(item.path); }} aria-label={favorites.includes(item.path) ? 'Убрать из избранного' : 'В избранное'}>
        {favorites.includes(item.path) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>
    </ListItemButton>
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>Admin CMS</Typography>
      </Toolbar>
      <Divider />
      <List>
        {favItems.length > 0 && (
          <>
            <ListSubheader>Избранное</ListSubheader>
            {favItems.map(renderItem)}
          </>
        )}
        {[...groupedItems.entries()].map(([group, items]) => (
          <Box key={group}>
            <ListItemButton onClick={() => toggleGroup(group)} sx={{ py: 0.5 }}>
              <ListItemText primary={group} primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }} />
              {openGroups.has(group) ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={openGroups.has(group)} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {items.map(renderItem)}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <style>{`
        body[data-admin="true"],
        body[data-admin="true"] *,
        .MuiBox-root,
        .MuiPaper-root,
        .MuiTypography-root,
        .MuiTableCell-root,
        .MuiListItemText-primary,
        .MuiListItemText-secondary,
        .MuiTextField-root input,
        .MuiTextField-root textarea {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }

        .MuiButton-root,
        .MuiIconButton-root,
        .MuiChip-root,
        .MuiTab-root,
        .MuiMenuItem-root,
        .MuiListItemButton-root {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}</style>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar
          disableGutters={isMobile}
          sx={{
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 52, sm: 64 },
            gap: { xs: 0.25, sm: 0.5 },
            overflow: 'hidden',
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, flexShrink: 0 }}
            aria-label="Меню"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            noWrap
            component="div"
            sx={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700 }}
          >
            {isMobile ? 'Панель' : 'Панель управления'}
          </Typography>
          <Tooltip title="Открыть главную в новой вкладке">
            {isCompact ? (
              <IconButton color="inherit" onClick={() => window.open('/', '_blank')} aria-label="Продакшен" sx={{ flexShrink: 0 }}>
                <LaunchIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button
                color="inherit"
                size="small"
                startIcon={<LaunchIcon />}
                onClick={() => window.open('/', '_blank')}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                Продакшен
              </Button>
            )}
          </Tooltip>
          <Tooltip title="Открыть каталог услуг в новой вкладке">
            {isCompact ? (
              <IconButton color="inherit" onClick={() => window.open('/catalog', '_blank')} aria-label="Каталог" sx={{ flexShrink: 0 }}>
                <CategoryIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button
                color="inherit"
                size="small"
                onClick={() => window.open('/catalog', '_blank')}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                Каталог
              </Button>
            )}
          </Tooltip>
          <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <NotificationsBell />
            <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              <IconButton color="inherit" onClick={toggle} aria-label="Тема">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: theme.palette.mode === 'dark' ? '1px solid #434343' : '1px solid #e6e6e6' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 52, sm: 64 } }} />
        {children}
      </Box>
    </Box>
  );
}
