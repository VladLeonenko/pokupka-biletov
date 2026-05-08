import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { CircularProgress, Box } from '@mui/material';

// Lazy load всех админских страниц для уменьшения main bundle
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PagesListPage = lazy(() => import('@/pages/pages/PagesListPage').then(m => ({ default: m.PagesListPage })));
const PageEditorPage = lazy(() => import('@/pages/pages/PageEditorPage').then(m => ({ default: m.PageEditorPage })));
const PagePageBuilderPage = lazy(() => import('@/pages/pages/PagePageBuilderPage').then(m => ({ default: m.PagePageBuilderPage })));
const PagePreviewPage = lazy(() => import('@/pages/pages/PagePreviewPage').then(m => ({ default: m.PagePreviewPage })));
const BlogListPage = lazy(() => import('@/pages/blog/BlogListPage').then(m => ({ default: m.BlogListPage })));
const BlogEditorPage = lazy(() => import('@/pages/blog/BlogEditorPage').then(m => ({ default: m.BlogEditorPage })));
const BlogBlockEditorPage = lazy(() => import('@/pages/blog/BlogBlockEditorPage').then(m => ({ default: m.BlogBlockEditorPage })));
const BlogPageBuilderPage = lazy(() => import('@/pages/blog/BlogPageBuilderPage').then(m => ({ default: m.BlogPageBuilderPage })));
const BlogCategoriesPage = lazy(() => import('@/pages/blog/BlogCategoriesPage').then(m => ({ default: m.BlogCategoriesPage })));
const SeoPage = lazy(() => import('@/pages/seo/SeoPage').then(m => ({ default: m.SeoPage })));
const ProductCategoriesPage = lazy(() => import('@/pages/products/ProductCategoriesPage').then(m => ({ default: m.ProductCategoriesPage })));
const PromotionsListPage = lazy(() => import('@/pages/promotions/PromotionsListPage').then(m => ({ default: m.PromotionsListPage })));
const PromotionEditorPage = lazy(() => import('@/pages/promotions/PromotionEditorPage').then(m => ({ default: m.PromotionEditorPage })));
const FormsManagementPage = lazy(() => import('@/pages/forms/FormsManagementPage').then(m => ({ default: m.FormsManagementPage })));
const FunnelsListPage = lazy(() => import('@/pages/funnels/FunnelsListPage').then(m => ({ default: m.FunnelsListPage })));
const FunnelViewPage = lazy(() => import('@/pages/funnels/FunnelViewPage').then(m => ({ default: m.FunnelViewPage })));
import { HomePage } from '@/pages/public/HomePage';
const EventsSearchPage = lazy(() =>
  import('@/pages/public/EventsSearchPage').then((m) => ({ default: m.EventsSearchPage }))
);
const TicketCheckoutPage = lazy(() =>
  import('@/pages/public/TicketCheckoutPage').then((m) => ({ default: m.TicketCheckoutPage }))
);
const LuzhnikiCupFinalSchemeTestPage = lazy(() =>
  import('@/pages/test/LuzhnikiCupFinalSchemeTestPage').then((m) => ({ default: m.LuzhnikiCupFinalSchemeTestPage }))
);
import { LoginPage } from '@/pages/auth/LoginPage';
import { MagicLinkPage } from '@/pages/auth/MagicLinkPage';
import { RequestMagicLinkPage } from '@/pages/auth/RequestMagicLinkPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

// Lazy load публичных страниц — не загружаются при первом визите на главную
const PublicHomePageAI = lazy(() => import('@/pages/public/PublicHomePageAI').then(m => ({ default: m.default })));
const PublicHomePageAI_Noomo = lazy(() => import('@/pages/public/PublicHomePageAI_Noomo').then(m => ({ default: m.default })));
const CartPage = lazy(() => import('@/pages/public/CartPage').then(m => ({ default: m.CartPage })));
const WishlistPage = lazy(() => import('@/pages/public/WishlistPage').then(m => ({ default: m.WishlistPage })));
const SearchPage = lazy(() => import('@/pages/public/SearchPage').then(m => ({ default: m.SearchPage })));
const AccountPage = lazy(() => import('@/pages/public/AccountPage').then(m => ({ default: m.AccountPage })));
const AccountAiTeamPage = lazy(() => import('@/pages/public/AccountAiTeamPage').then(m => ({ default: m.AccountAiTeamPage })));
const AccountProjectsPage = lazy(() => import('@/pages/public/AccountProjectsPage').then(m => ({ default: m.AccountProjectsPage })));
const UserFinancePlannerPage = lazy(() => import('@/pages/public/UserFinancePlannerPage').then(m => ({ default: m.UserFinancePlannerPage })));
const UserPersonalDevelopmentPage = lazy(() => import('@/pages/public/UserPersonalDevelopmentPage').then(m => ({ default: m.UserPersonalDevelopmentPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const PublicOfferPage = lazy(() =>
  import('@/pages/public/PublicOfferPage').then((m) => ({ default: m.PublicOfferPage }))
);
const CookiesPolicyPage = lazy(() =>
  import('@/pages/public/CookiesPolicyPage').then((m) => ({ default: m.CookiesPolicyPage }))
);
const RequisitesPage = lazy(() =>
  import('@/pages/public/RequisitesPage').then((m) => ({ default: m.RequisitesPage }))
);
const PrivacySettingsPage = lazy(() => import('@/pages/public/PrivacySettingsPage').then(m => ({ default: m.PrivacySettingsPage })));
const PublicAIChatPage = lazy(() => import('@/pages/public/PublicAIChatPage').then(m => ({ default: m.PublicAIChatPage })));
const ContactsPage = lazy(() => import('@/pages/public/ContactsPage').then(m => ({ default: m.ContactsPage })));
const ReturnsExchangePage = lazy(() =>
  import('@/pages/public/ReturnsExchangePage').then((m) => ({ default: m.ReturnsExchangePage }))
);
const TicketsFaqPage = lazy(() =>
  import('@/pages/public/TicketsFaqPage').then((m) => ({ default: m.TicketsFaqPage }))
);
const OrderDetailPage = lazy(() => import('@/pages/public/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage').then(m => ({ default: m.RegisterPage })));
const CharityPage = lazy(() => import('@/pages/public/CharityPage').then(m => ({ default: m.CharityPage })));
const SeoPositionCheckerPage = lazy(() => import('@/pages/public/SeoPositionCheckerPage').then(m => ({ default: m.SeoPositionCheckerPage })));
const TechnicalAuditPage = lazy(() => import('@/pages/public/TechnicalAuditPage').then(m => ({ default: m.TechnicalAuditPage })));
const ReputationMonitorPage = lazy(() => import('@/pages/public/ReputationMonitorPage').then(m => ({ default: m.ReputationMonitorPage })));
const RoiCalculatorPage = lazy(() => import('@/pages/public/RoiCalculatorPage').then(m => ({ default: m.RoiCalculatorPage })));
const PublicPageView = lazy(() => import('@/pages/public/PublicPageView').then(m => ({ default: m.PublicPageView })));
const ProposalViewPage = lazy(() => import('@/pages/commercial-proposals/ProposalViewPage').then(m => ({ default: m.ProposalViewPage })));

// Lazy load остальных админских страниц
const ClientsListPage = lazy(() => import('@/pages/clients/ClientsListPage').then(m => ({ default: m.ClientsListPage })));
const ClientEditorPage = lazy(() => import('@/pages/clients/ClientEditorPage').then(m => ({ default: m.ClientEditorPage })));
const ChatsListPage = lazy(() => import('@/pages/chat/ChatsListPage').then(m => ({ default: m.ChatsListPage })));
const ChatViewPage = lazy(() => import('@/pages/chat/ChatViewPage').then(m => ({ default: m.ChatViewPage })));
const ChatbotSettingsPage = lazy(() => import('@/pages/chatbot/ChatbotSettingsPage').then(m => ({ default: m.ChatbotSettingsPage })));
const ReviewsManagePage = lazy(() => import('@/pages/admin/ReviewsManagePage').then(m => ({ default: m.ReviewsManagePage })));
const AwardsManagePage = lazy(() => import('@/pages/admin/AwardsManagePage').then(m => ({ default: m.AwardsManagePage })));
const TeamListPage = lazy(() => import('@/pages/team/TeamListPage'));
const TeamEditorPage = lazy(() => import('@/pages/team/TeamEditorPage'));
const AIChatPage = lazy(() => import('@/pages/admin/AIChatPage').then(m => ({ default: m.AIChatPage })));
const AiTeamDashboardPage = lazy(() => import('@/pages/admin/AiTeamDashboardPage'));
const ProjectsDashboardPage = lazy(() => import('@/pages/admin/ProjectsDashboardPage'));
const QuizManagementPage = lazy(() => import('@/pages/admin/QuizManagementPage').then(m => ({ default: m.QuizManagementPage })));
const OrdersAdminPage = lazy(() => import('@/pages/admin/OrdersAdminPage').then(m => ({ default: m.default })));
const AdminsManagePage = lazy(() => import('@/pages/admin/AdminsManagePage').then(m => ({ default: m.AdminsManagePage })));
const SalesAnalyticsPage = lazy(() => import('@/pages/admin/SalesAnalyticsPage').then(m => ({ default: m.SalesAnalyticsPage })));
const GetbiletEventsListPage = lazy(() =>
  import('@/pages/getbilet/GetbiletEventsListPage').then(m => ({ default: m.GetbiletEventsListPage }))
);
const GetbiletEventEditPage = lazy(() =>
  import('@/pages/getbilet/GetbiletEventEditPage').then(m => ({ default: m.GetbiletEventEditPage }))
);
const GetbiletMarkupPage = lazy(() =>
  import('@/pages/getbilet/GetbiletMarkupPage').then(m => ({ default: m.GetbiletMarkupPage }))
);
const GetbiletPromosPage = lazy(() =>
  import('@/pages/getbilet/GetbiletPromosPage').then(m => ({ default: m.GetbiletPromosPage }))
);
const GetbiletStageMapsPage = lazy(() =>
  import('@/pages/getbilet/GetbiletStageMapsPage').then(m => ({ default: m.GetbiletStageMapsPage }))
);
const TicketsVitrinePage = lazy(() =>
  import('@/pages/admin/TicketsVitrinePage').then(m => ({ default: m.TicketsVitrinePage }))
);

// Loading fallback для lazy компонентов
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <CircularProgress />
  </Box>
);

function Protected({ children }: { children: JSX.Element }) {
  const { token, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsChecking(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!token) return <Navigate to="/admin/login" replace />;
  if (isChecking || (token && !user)) return null;

  if (!['admin', 'sales_manager'].includes(user?.role ?? '')) {
    return <Navigate to="/account" replace />;
  }

  return children;
}

function ProtectedAdmin({ children }: { children: JSX.Element }) {
  const { token, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsChecking(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!token) return <Navigate to="/admin/login" replace />;
  if (isChecking || (token && !user)) return null;

  if (user?.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

const PageFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
    <CircularProgress size={32} />
  </Box>
);

export function AppRoutes() {
  const { token, user } = useAuth();
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      {/* Public routes - must come before admin routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/afisha" element={<HomePage />} />
      <Route path="/events" element={<EventsSearchPage />} />
      <Route path="/events/city/:citySlug" element={<EventsSearchPage />} />
      <Route path="/events/genre/:genreSlug" element={<EventsSearchPage />} />
      <Route path="/events/venue/:venueSlug" element={<EventsSearchPage />} />
      <Route path="/ticket/:eventSlug" element={<TicketCheckoutPage />} />
      <Route path="/ticket/:repertoireId/:slug/:sessionCompact" element={<TicketCheckoutPage />} />
      <Route path="/ticket/:repertoireId/:slug" element={<TicketCheckoutPage />} />
      <Route path="/ticket/:repertoireId" element={<TicketCheckoutPage />} />
      <Route path="/test/luzhniki-cup-final-scheme" element={<LuzhnikiCupFinalSchemeTestPage />} />
      <Route path="/ai-team" element={<PublicHomePageAI />} />
      <Route path="/ai-team-v2" element={<PublicHomePageAI_Noomo />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/account/ai-team" element={<AccountAiTeamPage />} />
      <Route path="/account/projects" element={<AccountProjectsPage />} />
      <Route path="/account/personal-development" element={<UserPersonalDevelopmentPage />} />
      <Route path="/account/finance-planner" element={<UserFinancePlannerPage />} />
      <Route path="/account/privacy-settings" element={<PrivacySettingsPage />} />
      <Route path="/politic" element={<PrivacyPolicyPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/offer" element={<PublicOfferPage />} />
      <Route path="/cookies" element={<CookiesPolicyPage />} />
      <Route path="/requisites" element={<RequisitesPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/magic" element={<MagicLinkPage />} />
      <Route path="/auth/request-link" element={<RequestMagicLinkPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/tools/position-checker" element={<SeoPositionCheckerPage />} />
      <Route path="/tools/technical-audit" element={<TechnicalAuditPage />} />
      <Route path="/tools/reputation-monitor" element={<ReputationMonitorPage />} />
      <Route path="/tools/roi-calculator" element={<RoiCalculatorPage />} />
      <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
      <Route path="/charity" element={<CharityPage />} />
      <Route path="/ai-chat" element={<PublicAIChatPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/returns" element={<ReturnsExchangePage />} />
      <Route path="/faq" element={<TicketsFaqPage />} />
      
      {/* Admin routes — ДОЛЖНЫ быть до /:slug, иначе /admin матчится как slug */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<Protected><Suspense fallback={<LoadingFallback />}><DashboardPage /></Suspense></Protected>} />
      <Route path="/admin/sales-academy/*" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/sales-analytics" element={<ProtectedAdmin><SalesAnalyticsPage /></ProtectedAdmin>} />
      <Route path="/admin/pages" element={<ProtectedAdmin><PagesListPage /></ProtectedAdmin>} />
      <Route path="/admin/pages/:id" element={<ProtectedAdmin><PageEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/pages/:id/builder" element={<ProtectedAdmin><PagePageBuilderPage /></ProtectedAdmin>} />
      <Route path="/admin/pages/:id/preview" element={<ProtectedAdmin><PagePreviewPage /></ProtectedAdmin>} />
      <Route path="/admin/blog" element={<ProtectedAdmin><BlogListPage /></ProtectedAdmin>} />
      <Route path="/admin/blog/:id" element={<ProtectedAdmin><BlogBlockEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/blog/:id/html" element={<ProtectedAdmin><BlogEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/blog/:id/builder" element={<ProtectedAdmin><BlogPageBuilderPage /></ProtectedAdmin>} />
      <Route path="/admin/blog/categories" element={<ProtectedAdmin><BlogCategoriesPage /></ProtectedAdmin>} />
      <Route path="/admin/seo" element={<ProtectedAdmin><SeoPage /></ProtectedAdmin>} />
      <Route path="/admin/carousels/*" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/cases/*" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/product-categories" element={<ProtectedAdmin><ProductCategoriesPage /></ProtectedAdmin>} />
      <Route path="/admin/products/*" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/orders" element={<Protected><Suspense fallback={<LoadingFallback />}><OrdersAdminPage /></Suspense></Protected>} />
      <Route path="/admin/parsing" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/promotions" element={<Protected><PromotionsListPage /></Protected>} />
      <Route path="/admin/quiz" element={<ProtectedAdmin><QuizManagementPage /></ProtectedAdmin>} />
      <Route path="/admin/promotions/:id" element={<Protected><PromotionEditorPage /></Protected>} />
      <Route path="/admin/forms/:formId/submissions/:submissionId" element={<Protected><FormsManagementPage /></Protected>} />
      <Route path="/admin/forms" element={<Protected><FormsManagementPage /></Protected>} />
      <Route path="/admin/funnels" element={<Protected><FunnelsListPage /></Protected>} />
      <Route path="/admin/funnels/:id" element={<Protected><FunnelViewPage /></Protected>} />
      <Route path="/admin/tasks/*" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/planner/*" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/test-auth" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/task-executor" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/clients" element={<Protected><ClientsListPage /></Protected>} />
      <Route path="/admin/clients/:id" element={<Protected><ClientEditorPage /></Protected>} />
      <Route path="/admin/chat" element={<Protected><ChatsListPage /></Protected>} />
      <Route path="/admin/chat/:chatId" element={<Protected><ChatViewPage /></Protected>} />
      <Route path="/admin/chatbot" element={<ProtectedAdmin><ChatbotSettingsPage /></ProtectedAdmin>} />
      <Route path="/admin/reviews" element={<Protected><ReviewsManagePage /></Protected>} />
      <Route path="/admin/awards" element={<ProtectedAdmin><AwardsManagePage /></ProtectedAdmin>} />
      <Route path="/admin/team" element={<ProtectedAdmin><TeamListPage /></ProtectedAdmin>} />
      <Route path="/admin/admins" element={<ProtectedAdmin><AdminsManagePage /></ProtectedAdmin>} />
      <Route path="/admin/team/:id" element={<ProtectedAdmin><TeamEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/email/*" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/sales-pipeline" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/admin/sites/*" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/exercise-images" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/ai-chat" element={<Protected><AIChatPage /></Protected>} />
      <Route path="/admin/ai-team" element={<Protected><AiTeamDashboardPage /></Protected>} />
      <Route path="/admin/projects-dashboard" element={<Protected><ProjectsDashboardPage /></Protected>} />
      <Route path="/admin/commercial-proposals/*" element={<Protected><Navigate to="/admin" replace /></Protected>} />
      <Route path="/commercial-proposals/:id" element={<ProposalViewPage />} />
      <Route path="/admin/donors" element={<ProtectedAdmin><Navigate to="/admin" replace /></ProtectedAdmin>} />
      <Route path="/admin/getbilet/events" element={<Protected><GetbiletEventsListPage /></Protected>} />
      <Route path="/admin/getbilet/events/:id" element={<Protected><GetbiletEventEditPage /></Protected>} />
      <Route path="/admin/getbilet/stage-maps" element={<Protected><GetbiletStageMapsPage /></Protected>} />
      <Route path="/admin/getbilet/markup" element={<Protected><GetbiletMarkupPage /></Protected>} />
      <Route path="/admin/getbilet/promos" element={<Protected><GetbiletPromosPage /></Protected>} />
      <Route path="/admin/tickets-vitrine" element={<Protected><TicketsVitrinePage /></Protected>} />
      {/* Redirect old admin routes to new /admin routes */}
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/pages" element={<Navigate to="/admin/pages" replace />} />
      <Route path="/seo" element={<Navigate to="/admin/seo" replace />} />
      <Route path="/carousels" element={<Navigate to="/admin" replace />} />
      <Route path="/cases" element={<Navigate to="/admin" replace />} />
      <Route path="/products" element={<Navigate to="/admin" replace />} />
      {/* /promotion is a public route, so don't redirect it */}
      <Route path="/promotions" element={<Navigate to="/admin/promotions" replace />} />
      <Route path="/forms" element={<Navigate to="/admin/forms" replace />} />
      <Route path="/funnels" element={<Navigate to="/admin/funnels" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/:slug" element={<PublicPageView />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}


