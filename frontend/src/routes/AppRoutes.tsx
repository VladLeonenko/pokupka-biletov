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
import PublicHomePageAI from '@/pages/public/PublicHomePageAI';
import { PublicPageView } from '@/pages/public/PublicPageView';
import { PublicPromotionsPage } from '@/pages/public/PublicPromotionsPage';
import { PublicBlogPage } from '@/pages/public/PublicBlogPage';
import { PublicBlogPostPage } from '@/pages/public/PublicBlogPostPage';
import { CatalogPage } from '@/pages/public/CatalogPage';
import { ProductPage } from '@/pages/public/ProductPage';
import { CartPage } from '@/pages/public/CartPage';
import { WishlistPage } from '@/pages/public/WishlistPage';
import { SearchPage } from '@/pages/public/SearchPage';
import { AccountPage } from '@/pages/public/AccountPage';
import { AccountAiTeamPage } from '@/pages/public/AccountAiTeamPage';
import { AccountProjectsPage } from '@/pages/public/AccountProjectsPage';
import { UserFinancePlannerPage } from '@/pages/public/UserFinancePlannerPage';
import { UserPersonalDevelopmentPage } from '@/pages/public/UserPersonalDevelopmentPage';
import { PrivacyPolicyPage } from '@/pages/public/PrivacyPolicyPage';
import { PrivacySettingsPage } from '@/pages/public/PrivacySettingsPage';
import { PortfolioPage } from '@/pages/public/PortfolioPage';
import { CasePage } from '@/pages/public/CasePage';
import { SeoPositionCheckerPage } from '@/pages/public/SeoPositionCheckerPage';
import { TechnicalAuditPage } from '@/pages/public/TechnicalAuditPage';
import { ReputationMonitorPage } from '@/pages/public/ReputationMonitorPage';
import { RoiCalculatorPage } from '@/pages/public/RoiCalculatorPage';
// Публичные страницы остаются статическими импортами (не критичны для main bundle)
import { ParsingPage } from '@/pages/parsing/ParsingPage';
import { OrderDetailPage } from '@/pages/public/OrderDetailPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { CharityPage } from '@/pages/public/CharityPage';
import { ReviewsPage } from '@/pages/public/ReviewsPage';
import { WinnersPage } from '@/pages/public/WinnersPage';
import { PublicAIChatPage } from '@/pages/public/PublicAIChatPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ContactsPage } from '@/pages/public/ContactsPage';
import { NewClientPage } from '@/pages/public/NewClientPage';
import { HousesCasePage } from '@/pages/public/HousesCasePage';
import { MadeoCasePage } from '@/pages/public/MadeoCasePage';
import { PolygonCasePage } from '@/pages/public/PolygonCasePage';
import { StraumannCasePage } from '@/pages/public/StraumannCasePage';

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
const ProposalViewPage = lazy(() => import('@/pages/commercial-proposals/ProposalViewPage').then(m => ({ default: m.ProposalViewPage })));
const ProposalEditorPage = lazy(() => import('@/pages/commercial-proposals/ProposalEditorPage').then(m => ({ default: m.ProposalEditorPage })));
const DonorsManagePage = lazy(() => import('@/pages/donors/DonorsManagePage').then(m => ({ default: m.DonorsManagePage })));
const QuizManagementPage = lazy(() => import('@/pages/admin/QuizManagementPage').then(m => ({ default: m.QuizManagementPage })));

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
    // Даем время на загрузку user из localStorage или API
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Strict check: if no token, redirect immediately
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Если user еще не загружен, но есть token - показываем загрузку
  if (isChecking || (token && !user)) {
    return null; // Или можно показать <CircularProgress />
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/account" replace />;
  }
  
  return children;
}

export function AppRoutes() {
  const { token, user } = useAuth();
  return (
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
      <Route path="/houses-case" element={<HousesCasePage />} />
      <Route path="/madeo-case" element={<MadeoCasePage />} />
      <Route path="/polygon" element={<PolygonCasePage />} />
      <Route path="/straumann-case" element={<StraumannCasePage />} />
      
      {/* Admin routes — ДОЛЖНЫ быть до /:slug, иначе /admin матчится как slug */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<Protected><Suspense fallback={<LoadingFallback />}><DashboardPage /></Suspense></Protected>} />
      <Route path="/admin/pages" element={<Protected><PagesListPage /></Protected>} />
      <Route path="/admin/pages/:id" element={<Protected><PageEditorPage /></Protected>} />
      <Route path="/admin/pages/:id/builder" element={<Protected><PagePageBuilderPage /></Protected>} />
      <Route path="/admin/pages/:id/preview" element={<Protected><PagePreviewPage /></Protected>} />
      <Route path="/admin/blog" element={<Protected><BlogListPage /></Protected>} />
      <Route path="/admin/blog/:id" element={<Protected><BlogBlockEditorPage /></Protected>} />
      <Route path="/admin/blog/:id/html" element={<Protected><BlogEditorPage /></Protected>} />
      <Route path="/admin/blog/:id/builder" element={<Protected><BlogPageBuilderPage /></Protected>} />
      <Route path="/admin/blog/categories" element={<Protected><BlogCategoriesPage /></Protected>} />
      <Route path="/admin/seo" element={<Protected><SeoPage /></Protected>} />
      <Route path="/admin/carousels" element={<Protected><CarouselListPage /></Protected>} />
      <Route path="/admin/carousels/:id" element={<Protected><CarouselEditorPage /></Protected>} />
      <Route path="/admin/cases" element={<Protected><CasesListPage /></Protected>} />
      <Route path="/admin/cases/:id/preview" element={<Protected><CasePreviewPage /></Protected>} />
      <Route path="/admin/cases/:id" element={<Protected><CaseEditorPage /></Protected>} />
      <Route path="/admin/cases/:id/builder" element={<Protected><CasePageBuilderPage /></Protected>} />
      <Route path="/admin/product-categories" element={<Protected><ProductCategoriesPage /></Protected>} />
      <Route path="/admin/products" element={<Protected><ProductsListPage /></Protected>} />
      <Route path="/admin/products/:id" element={<Protected><ProductEditorPage /></Protected>} />
      <Route path="/admin/products/:id/builder" element={<Protected><ProductPageBuilderPage /></Protected>} />
      <Route path="/admin/parsing" element={<Protected><ParsingPage /></Protected>} />
      <Route path="/admin/promotions" element={<Protected><PromotionsListPage /></Protected>} />
      <Route path="/admin/quiz" element={<Protected><QuizManagementPage /></Protected>} />
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
      <Route path="/admin/chatbot" element={<Protected><ChatbotSettingsPage /></Protected>} />
      <Route path="/admin/reviews" element={<Protected><ReviewsManagePage /></Protected>} />
      <Route path="/admin/awards" element={<Protected><AwardsManagePage /></Protected>} />
      <Route path="/admin/team" element={<Protected><TeamListPage /></Protected>} />
      <Route path="/admin/team/:id" element={<Protected><TeamEditorPage /></Protected>} />
      <Route path="/admin/email/subscribers" element={<Protected><SubscribersPage /></Protected>} />
      <Route path="/admin/email/campaigns" element={<Protected><CampaignsPage /></Protected>} />
      <Route path="/admin/sites" element={<Protected><SitesListPage /></Protected>} />
      <Route path="/admin/sites/:siteId" element={<Protected><SiteDetailPage /></Protected>} />
      <Route path="/admin/sites/:siteId/pages/:pageId" element={<Protected><SitePageEditorPage /></Protected>} />
      <Route path="/admin/sites/:siteId/pages/:pageId/builder" element={<Protected><SitePageBuilderPage /></Protected>} />
      <Route path="/admin/sites/:siteId/pages/:pageId/preview" element={<Protected><SitePreviewPage /></Protected>} />
      <Route path="/admin/exercise-images" element={<Protected><ExerciseImagesPage /></Protected>} />
      <Route path="/admin/ai-chat" element={<Protected><AIChatPage /></Protected>} />
      <Route path="/admin/ai-team" element={<Protected><AiTeamDashboardPage /></Protected>} />
      <Route path="/admin/projects-dashboard" element={<Protected><ProjectsDashboardPage /></Protected>} />
      <Route path="/admin/commercial-proposals" element={<Protected><ProposalsListPage /></Protected>} />
      <Route path="/admin/commercial-proposals/new" element={<Protected><ProposalEditorPage /></Protected>} />
      <Route path="/admin/commercial-proposals/:id/edit" element={<Protected><ProposalEditorPage /></Protected>} />
      <Route path="/admin/commercial-proposals/:id" element={<Protected><ProposalViewPage /></Protected>} />
      <Route path="/commercial-proposals/:id" element={<ProposalViewPage />} />
      <Route path="/admin/donors" element={<Protected><DonorsManagePage /></Protected>} />
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
      <Route path="/:slug" element={<PublicPageView />} />
      <Route path="*" element={<PublicPageView />} />
    </Routes>
  );
}


