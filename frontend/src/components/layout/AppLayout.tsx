import { PropsWithChildren, useState, useEffect } from 'react';
import { Box, CssBaseline, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, useTheme, Tooltip, Button } from '@mui/material';
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
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MapIcon from '@mui/icons-material/Map';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { NotificationsBell } from '@/components/common/NotificationsBell';
import { useAuth } from '@/auth/AuthProvider';

const drawerWidth = 260;

type NavItem = { label: string; icon: React.ReactNode; path: string; roles?: ('admin' | 'sales_manager')[] };

const NAV_ITEMS: NavItem[] = [
  { label: 'Обзор', icon: <DashboardIcon />, path: '/admin', roles: ['admin', 'sales_manager'] },
  { label: 'Аналитика продаж', icon: <AssessmentIcon />, path: '/admin/sales-analytics', roles: ['admin'] },
  { label: 'Страницы', icon: <DescriptionIcon />, path: '/admin/pages', roles: ['admin'] },
  { label: 'Блог', icon: <ArticleIcon />, path: '/admin/blog', roles: ['admin'] },
  { label: 'SEO', icon: <SeoIcon />, path: '/admin/seo', roles: ['admin'] },
  { label: 'Заказы', icon: <ReceiptLongIcon />, path: '/admin/orders', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: мероприятия', icon: <ConfirmationNumberIcon />, path: '/admin/getbilet/events', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: схемы залов', icon: <MapIcon />, path: '/admin/getbilet/stage-maps', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: наценка', icon: <PriceIcon />, path: '/admin/getbilet/markup', roles: ['admin', 'sales_manager'] },
  { label: 'GetBilet: промокоды', icon: <LocalOfferIcon />, path: '/admin/getbilet/promos', roles: ['admin', 'sales_manager'] },
  { label: 'Витрина билетов (контент)', icon: <StorefrontIcon />, path: '/admin/tickets-vitrine', roles: ['admin', 'sales_manager'] },
  { label: 'Категории продуктов', icon: <CategoryIcon />, path: '/admin/product-categories', roles: ['admin'] },
  { label: 'Акции', icon: <LocalOfferIcon />, path: '/admin/promotions', roles: ['admin', 'sales_manager'] },
  { label: 'Формы', icon: <AssignmentIcon />, path: '/admin/forms', roles: ['admin', 'sales_manager'] },
  { label: 'Воронки', icon: <AccountTreeIcon />, path: '/admin/funnels', roles: ['admin', 'sales_manager'] },
  { label: 'Клиенты', icon: <PeopleIcon />, path: '/admin/clients', roles: ['admin', 'sales_manager'] },
  { label: 'Чаты', icon: <ChatIcon />, path: '/admin/chat', roles: ['admin', 'sales_manager'] },
  { label: 'Настройки чат-бота', icon: <SmartToyIcon />, path: '/admin/chatbot', roles: ['admin'] },
  { label: 'Отзывы', icon: <RateReviewIcon />, path: '/admin/reviews', roles: ['admin', 'sales_manager'] },
  { label: 'Команда', icon: <PeopleIcon />, path: '/admin/team', roles: ['admin'] },
  { label: 'Админы', icon: <AdminPanelSettingsIcon />, path: '/admin/admins', roles: ['admin'] },
];

export function AppLayout({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggle } = useThemeMode();
  const { token, user } = useAuth();
  
  // Redirect to login if no token (extra safety check)
  // Убираем этот useEffect - редирект уже обрабатывается в App.tsx
  // Это предотвращает бесконечные циклы редиректов
  
  // Don't render layout if no token (security: prevent menu from showing)
  if (!token) {
    return null;
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>Admin CMS</Typography>
      </Toolbar>
      <Divider />
      <List>
        {NAV_ITEMS.filter((item) => {
          const roles = item.roles ?? ['admin'];
          return roles.includes((user?.role as 'admin' | 'sales_manager') ?? 'admin');
        }).map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* Разрешаем копирование текста в админ панели */}
      <style>{`
        /* Разрешаем выделение и копирование текста в админ панели */
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
        
        /* Исключения - элементы управления не должны выделяться */
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
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Панель управления
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Открыть главную в новой вкладке">
            <Button
              color="inherit"
              startIcon={<LaunchIcon />}
              onClick={() => window.open('/', '_blank')}
              sx={{ mr: 1 }}
            >
              Продакшен
            </Button>
          </Tooltip>
          <Tooltip title="Открыть каталог услуг в новой вкладке">
            <Button color="inherit" size="small" onClick={() => window.open('/catalog', '_blank')} sx={{ mr: 1 }}>
              Каталог
            </Button>
          </Tooltip>
          <NotificationsBell />
          <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
            <IconButton color="inherit" onClick={toggle}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
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

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}


