import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { LoginPage } from '@/pages/auth/LoginPage';
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
const CarouselListPage = lazy(() => import('@/pages/carousels/CarouselListPage').then(m => ({ default: m.CarouselListPage })));
const CarouselEditorPage = lazy(() => import('@/pages/carousels/CarouselEditorPage').then(m => ({ default: m.CarouselEditorPage })));
const CasesListPage = lazy(() => import('@/pages/cases/CasesListPage').then(m => ({ default: m.CasesListPage })));
const CaseEditorPage = lazy(() => import('@/pages/cases/CaseEditorPage').then(m => ({ default: m.CaseEditorPage })));
const CasePageBuilderPage = lazy(() => import('@/pages/cases/CasePageBuilderPage').then(m => ({ default: m.CasePageBuilderPage })));
const CasePreviewPage = lazy(() => import('@/pages/cases/CasePreviewPage').then(m => ({ default: m.CasePreviewPage })));
const ProductsListPage = lazy(() => import('@/pages/products/ProductsListPage').then(m => ({ default: m.ProductsListPage })));
const ProductEditorPage = lazy(() => import('@/pages/products/ProductEditorPage').then(m => ({ default: m.ProductEditorPage })));
const ProductPageBuilderPage = lazy(() => import('@/pages/products/ProductPageBuilderPage').then(m => ({ default: m.ProductPageBuilderPage })));
const ProductCategoriesPage = lazy(() => import('@/pages/products/ProductCategoriesPage').then(m => ({ default: m.ProductCategoriesPage })));
const PromotionsListPage = lazy(() => import('@/pages/promotions/PromotionsListPage').then(m => ({ default: m.PromotionsListPage })));
const PromotionEditorPage = lazy(() => import('@/pages/promotions/PromotionEditorPage').then(m => ({ default: m.PromotionEditorPage })));
const FormsManagementPage = lazy(() => import('@/pages/forms/FormsManagementPage').then(m => ({ default: m.FormsManagementPage })));
const FunnelsListPage = lazy(() => import('@/pages/funnels/FunnelsListPage').then(m => ({ default: m.FunnelsListPage })));
const FunnelViewPage = lazy(() => import('@/pages/funnels/FunnelViewPage').then(m => ({ default: m.FunnelViewPage })));
const TasksListPage = lazy(() => import('@/pages/funnels/TasksListPage').then(m => ({ default: m.TasksListPage })));
const TaskExecutor = lazy(() => import('@/components/tasks/TaskExecutor').then(m => ({ default: m.TaskExecutor })));
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

// Lazy load публичных страниц — не загружаются при первом визите на главную
const PublicHomePageAI = lazy(() => import('@/pages/public/PublicHomePageAI').then(m => ({ default: m.default })));
const CatalogPage = lazy(() => import('@/pages/public/CatalogPage').then(m => ({ default: m.CatalogPage })));
const ProductPage = lazy(() => import('@/pages/public/ProductPage').then(m => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('@/pages/public/CartPage').then(m => ({ default: m.CartPage })));
const WishlistPage = lazy(() => import('@/pages/public/WishlistPage').then(m => ({ default: m.WishlistPage })));
const SearchPage = lazy(() => import('@/pages/public/SearchPage').then(m => ({ default: m.SearchPage })));
const AccountPage = lazy(() => import('@/pages/public/AccountPage').then(m => ({ default: m.AccountPage })));
const AccountAiTeamPage = lazy(() => import('@/pages/public/AccountAiTeamPage').then(m => ({ default: m.AccountAiTeamPage })));
const AccountProjectsPage = lazy(() => import('@/pages/public/AccountProjectsPage').then(m => ({ default: m.AccountProjectsPage })));
const UserFinancePlannerPage = lazy(() => import('@/pages/public/UserFinancePlannerPage').then(m => ({ default: m.UserFinancePlannerPage })));
const UserPersonalDevelopmentPage = lazy(() => import('@/pages/public/UserPersonalDevelopmentPage').then(m => ({ default: m.UserPersonalDevelopmentPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const PrivacySettingsPage = lazy(() => import('@/pages/public/PrivacySettingsPage').then(m => ({ default: m.PrivacySettingsPage })));
const PortfolioPage = lazy(() => import('@/pages/public/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const CasePage = lazy(() => import('@/pages/public/CasePage').then(m => ({ default: m.CasePage })));
const PublicBlogPage = lazy(() => import('@/pages/public/PublicBlogPage').then(m => ({ default: m.PublicBlogPage })));
const PublicBlogPostPage = lazy(() => import('@/pages/public/PublicBlogPostPage').then(m => ({ default: m.PublicBlogPostPage })));
const PublicPromotionsPage = lazy(() => import('@/pages/public/PublicPromotionsPage').then(m => ({ default: m.PublicPromotionsPage })));
const ReviewsPage = lazy(() => import('@/pages/public/ReviewsPage').then(m => ({ default: m.ReviewsPage })));
const WinnersPage = lazy(() => import('@/pages/public/WinnersPage').then(m => ({ default: m.WinnersPage })));
const PublicAIChatPage = lazy(() => import('@/pages/public/PublicAIChatPage').then(m => ({ default: m.PublicAIChatPage })));
const AboutPage = lazy(() => import('@/pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactsPage = lazy(() => import('@/pages/public/ContactsPage').then(m => ({ default: m.ContactsPage })));
const NewClientPage = lazy(() => import('@/pages/public/NewClientPage').then(m => ({ default: m.NewClientPage })));
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
const ParsingPage = lazy(() => import('@/pages/parsing/ParsingPage').then(m => ({ default: m.ParsingPage })));
const ClientsListPage = lazy(() => import('@/pages/clients/ClientsListPage').then(m => ({ default: m.ClientsListPage })));
const ClientEditorPage = lazy(() => import('@/pages/clients/ClientEditorPage').then(m => ({ default: m.ClientEditorPage })));
const ChatsListPage = lazy(() => import('@/pages/chat/ChatsListPage').then(m => ({ default: m.ChatsListPage })));
const ChatViewPage = lazy(() => import('@/pages/chat/ChatViewPage').then(m => ({ default: m.ChatViewPage })));
const ChatbotSettingsPage = lazy(() => import('@/pages/chatbot/ChatbotSettingsPage').then(m => ({ default: m.ChatbotSettingsPage })));
const ReviewsManagePage = lazy(() => import('@/pages/admin/ReviewsManagePage').then(m => ({ default: m.ReviewsManagePage })));
const AwardsManagePage = lazy(() => import('@/pages/admin/AwardsManagePage').then(m => ({ default: m.AwardsManagePage })));
const TeamListPage = lazy(() => import('@/pages/team/TeamListPage'));
const TeamEditorPage = lazy(() => import('@/pages/team/TeamEditorPage'));
const SubscribersPage = lazy(() => import('@/pages/email/SubscribersPage'));
const CampaignsPage = lazy(() => import('@/pages/email/CampaignsPage'));
const SitesListPage = lazy(() => import('@/pages/sites/SitesListPage'));
const SiteDetailPage = lazy(() => import('@/pages/sites/SiteDetailPage'));
const SitePageEditorPage = lazy(() => import('@/pages/sites/SitePageEditorPage'));
const SitePreviewPage = lazy(() => import('@/pages/sites/SitePreviewPage'));
const SitePageBuilderPage = lazy(() => import('@/pages/sites/SitePageBuilderPage').then(m => ({ default: m.SitePageBuilderPage })));
const PlannerDashboard = lazy(() => import('@/pages/planner/PlannerDashboard'));
const PersonalDevelopment = lazy(() => import('@/pages/planner/PersonalDevelopment'));
const TestAuth = lazy(() => import('@/pages/planner/TestAuth'));
const ExerciseImagesPage = lazy(() => import('@/pages/admin/ExerciseImagesPage'));
const AIChatPage = lazy(() => import('@/pages/admin/AIChatPage').then(m => ({ default: m.AIChatPage })));
const AiTeamDashboardPage = lazy(() => import('@/pages/admin/AiTeamDashboardPage'));
const ProjectsDashboardPage = lazy(() => import('@/pages/admin/ProjectsDashboardPage'));
const ProposalsListPage = lazy(() => import('@/pages/commercial-proposals/ProposalsListPage').then(m => ({ default: m.ProposalsListPage })));
const ProposalEditorPage = lazy(() => import('@/pages/commercial-proposals/ProposalEditorPage').then(m => ({ default: m.ProposalEditorPage })));
const DonorsManagePage = lazy(() => import('@/pages/donors/DonorsManagePage').then(m => ({ default: m.DonorsManagePage })));
const QuizManagementPage = lazy(() => import('@/pages/admin/QuizManagementPage').then(m => ({ default: m.QuizManagementPage })));
const OrdersAdminPage = lazy(() => import('@/pages/admin/OrdersAdminPage').then(m => ({ default: m.default })));
const AdminsManagePage = lazy(() => import('@/pages/admin/AdminsManagePage').then(m => ({ default: m.AdminsManagePage })));

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
      <Route path="/ai-team" element={<PublicHomePageAI />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/products/:slug" element={<ProductPage />} />
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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/tools/position-checker" element={<SeoPositionCheckerPage />} />
      <Route path="/tools/technical-audit" element={<TechnicalAuditPage />} />
      <Route path="/tools/reputation-monitor" element={<ReputationMonitorPage />} />
      <Route path="/tools/roi-calculator" element={<RoiCalculatorPage />} />
      <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
      <Route path="/blog" element={<PublicBlogPage />} />
      <Route path="/blog/:slug" element={<PublicBlogPostPage />} />
      <Route path="/promotion" element={<PublicPromotionsPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/cases/winners" element={<WinnersPage />} />
      <Route path="/cases/:slug" element={<CasePage />} />
      <Route path="/charity" element={<CharityPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/ai-chat" element={<PublicAIChatPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/new-client" element={<NewClientPage />} />
      <Route path="/houses-case" element={<Navigate to="/cases/houses-case" replace />} />
      <Route path="/madeo-case" element={<Navigate to="/cases/madeo-case" replace />} />
      <Route path="/polygon" element={<Navigate to="/cases/polygon-case" replace />} />
      <Route path="/straumann-case" element={<Navigate to="/cases/straumann-case" replace />} />
      
      {/* Admin routes — ДОЛЖНЫ быть до /:slug, иначе /admin матчится как slug */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<Protected><Suspense fallback={<LoadingFallback />}><DashboardPage /></Suspense></Protected>} />
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
      <Route path="/admin/carousels" element={<ProtectedAdmin><CarouselListPage /></ProtectedAdmin>} />
      <Route path="/admin/carousels/:id" element={<ProtectedAdmin><CarouselEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/cases" element={<ProtectedAdmin><CasesListPage /></ProtectedAdmin>} />
      <Route path="/admin/cases/:id/preview" element={<ProtectedAdmin><CasePreviewPage /></ProtectedAdmin>} />
      <Route path="/admin/cases/:id" element={<ProtectedAdmin><CaseEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/cases/:id/builder" element={<ProtectedAdmin><CasePageBuilderPage /></ProtectedAdmin>} />
      <Route path="/admin/product-categories" element={<Protected><ProductCategoriesPage /></Protected>} />
      <Route path="/admin/products" element={<Protected><ProductsListPage /></Protected>} />
      <Route path="/admin/products/:id" element={<Protected><ProductEditorPage /></Protected>} />
      <Route path="/admin/products/:id/builder" element={<Protected><ProductPageBuilderPage /></Protected>} />
      <Route path="/admin/orders" element={<Protected><Suspense fallback={<LoadingFallback />}><OrdersAdminPage /></Suspense></Protected>} />
      <Route path="/admin/parsing" element={<ProtectedAdmin><ParsingPage /></ProtectedAdmin>} />
      <Route path="/admin/promotions" element={<Protected><PromotionsListPage /></Protected>} />
      <Route path="/admin/quiz" element={<ProtectedAdmin><QuizManagementPage /></ProtectedAdmin>} />
      <Route path="/admin/promotions/:id" element={<Protected><PromotionEditorPage /></Protected>} />
      <Route path="/admin/forms" element={<Protected><FormsManagementPage /></Protected>} />
      <Route path="/admin/funnels" element={<Protected><FunnelsListPage /></Protected>} />
      <Route path="/admin/funnels/:id" element={<Protected><FunnelViewPage /></Protected>} />
      <Route path="/admin/tasks" element={<Protected><TasksListPage /></Protected>} />
      <Route path="/admin/planner" element={<Protected><PlannerDashboard /></Protected>} />
      <Route path="/admin/planner/personal" element={<Protected><PersonalDevelopment /></Protected>} />
      <Route path="/admin/test-auth" element={<Protected><TestAuth /></Protected>} />
      <Route path="/admin/task-executor" element={<Protected><TaskExecutor /></Protected>} />
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
      <Route path="/admin/email/subscribers" element={<Protected><SubscribersPage /></Protected>} />
      <Route path="/admin/email/campaigns" element={<Protected><CampaignsPage /></Protected>} />
      <Route path="/admin/sites" element={<ProtectedAdmin><SitesListPage /></ProtectedAdmin>} />
      <Route path="/admin/sites/:siteId" element={<ProtectedAdmin><SiteDetailPage /></ProtectedAdmin>} />
      <Route path="/admin/sites/:siteId/pages/:pageId" element={<ProtectedAdmin><SitePageEditorPage /></ProtectedAdmin>} />
      <Route path="/admin/sites/:siteId/pages/:pageId/builder" element={<ProtectedAdmin><SitePageBuilderPage /></ProtectedAdmin>} />
      <Route path="/admin/sites/:siteId/pages/:pageId/preview" element={<ProtectedAdmin><SitePreviewPage /></ProtectedAdmin>} />
      <Route path="/admin/exercise-images" element={<ProtectedAdmin><ExerciseImagesPage /></ProtectedAdmin>} />
      <Route path="/admin/ai-chat" element={<Protected><AIChatPage /></Protected>} />
      <Route path="/admin/ai-team" element={<Protected><AiTeamDashboardPage /></Protected>} />
      <Route path="/admin/projects-dashboard" element={<Protected><ProjectsDashboardPage /></Protected>} />
      <Route path="/admin/commercial-proposals" element={<Protected><ProposalsListPage /></Protected>} />
      <Route path="/admin/commercial-proposals/new" element={<Protected><ProposalEditorPage /></Protected>} />
      <Route path="/admin/commercial-proposals/:id/edit" element={<Protected><ProposalEditorPage /></Protected>} />
      <Route path="/admin/commercial-proposals/:id" element={<Protected><ProposalViewPage /></Protected>} />
      <Route path="/commercial-proposals/:id" element={<ProposalViewPage />} />
      <Route path="/admin/donors" element={<ProtectedAdmin><DonorsManagePage /></ProtectedAdmin>} />
      {/* Redirect old admin routes to new /admin routes */}
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/pages" element={<Navigate to="/admin/pages" replace />} />
      <Route path="/seo" element={<Navigate to="/admin/seo" replace />} />
      <Route path="/carousels" element={<Navigate to="/admin/carousels" replace />} />
      <Route path="/cases" element={<Navigate to="/admin/cases" replace />} />
      <Route path="/products" element={<Navigate to="/admin/products" replace />} />
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


