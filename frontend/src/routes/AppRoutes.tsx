import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { PagesListPage } from '@/pages/pages/PagesListPage';
import { PageEditorPage } from '@/pages/pages/PageEditorPage';
import { PagePreviewPage } from '@/pages/pages/PagePreviewPage';
import { BlogListPage } from '@/pages/blog/BlogListPage';
import { BlogEditorPage } from '@/pages/blog/BlogEditorPage';
import { BlogCategoriesPage } from '@/pages/blog/BlogCategoriesPage';
import { SeoPage } from '@/pages/seo/SeoPage';
import { CarouselListPage } from '@/pages/carousels/CarouselListPage';
import { CarouselEditorPage } from '@/pages/carousels/CarouselEditorPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { useAuth } from '@/auth/AuthProvider';
import { CasesListPage } from '@/pages/cases/CasesListPage';
import { CaseEditorPage } from '@/pages/cases/CaseEditorPage';
import { ProductsListPage } from '@/pages/products/ProductsListPage';
import { ProductEditorPage } from '@/pages/products/ProductEditorPage';
import { PromotionsListPage } from '@/pages/promotions/PromotionsListPage';
import { PromotionEditorPage } from '@/pages/promotions/PromotionEditorPage';
import { CasePreviewPage } from '@/pages/cases/CasePreviewPage';
import { FormsManagementPage } from '@/pages/forms/FormsManagementPage';
import { FunnelsListPage } from '@/pages/funnels/FunnelsListPage';
import { FunnelViewPage } from '@/pages/funnels/FunnelViewPage';
import { TasksListPage } from '@/pages/funnels/TasksListPage';
import { TaskExecutor } from '@/components/tasks/TaskExecutor';
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
import { ParsingPage } from '@/pages/parsing/ParsingPage';
import { OrderDetailPage } from '@/pages/public/OrderDetailPage';
import { ClientsListPage } from '@/pages/clients/ClientsListPage';
import { ClientEditorPage } from '@/pages/clients/ClientEditorPage';
import { ChatsListPage } from '@/pages/chat/ChatsListPage';
import { ChatViewPage } from '@/pages/chat/ChatViewPage';
import { ChatbotSettingsPage } from '@/pages/chatbot/ChatbotSettingsPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { CharityPage } from '@/pages/public/CharityPage';
import { ReviewsPage } from '@/pages/public/ReviewsPage';
import { ReviewsManagePage } from '@/pages/admin/ReviewsManagePage';
import { WinnersPage } from '@/pages/public/WinnersPage';
import { AwardsManagePage } from '@/pages/admin/AwardsManagePage';
import { PublicAIChatPage } from '@/pages/public/PublicAIChatPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ContactsPage } from '@/pages/public/ContactsPage';
import { NewClientPage } from '@/pages/public/NewClientPage';
import { HousesCasePage } from '@/pages/public/HousesCasePage';
import { MadeoCasePage } from '@/pages/public/MadeoCasePage';
import { PolygonCasePage } from '@/pages/public/PolygonCasePage';
import { StraumannCasePage } from '@/pages/public/StraumannCasePage';
import TeamListPage from '@/pages/team/TeamListPage';
import TeamEditorPage from '@/pages/team/TeamEditorPage';
import SubscribersPage from '@/pages/email/SubscribersPage';
import CampaignsPage from '@/pages/email/CampaignsPage';
import SitesListPage from '@/pages/sites/SitesListPage';
import SiteDetailPage from '@/pages/sites/SiteDetailPage';
import SitePageEditorPage from '@/pages/sites/SitePageEditorPage';
import SitePreviewPage from '@/pages/sites/SitePreviewPage';
import PlannerDashboard from '@/pages/planner/PlannerDashboard';
import PersonalDevelopment from '@/pages/planner/PersonalDevelopment';
import TestAuth from '@/pages/planner/TestAuth';
import ExerciseImagesPage from '@/pages/admin/ExerciseImagesPage';
import { AIChatPage } from '@/pages/admin/AIChatPage';
import AiTeamDashboardPage from '@/pages/admin/AiTeamDashboardPage';
import ProjectsDashboardPage from '@/pages/admin/ProjectsDashboardPage';
import { ProposalsListPage } from '@/pages/commercial-proposals/ProposalsListPage';
import { ProposalViewPage } from '@/pages/commercial-proposals/ProposalViewPage';
import { ProposalEditorPage } from '@/pages/commercial-proposals/ProposalEditorPage';
import { DonorsManagePage } from '@/pages/donors/DonorsManagePage';

function Protected({ children }: { children: JSX.Element }) {
  const { token, user } = useAuth();
  // Strict check: if no token, redirect immediately
  if (!token) {
    return <Navigate to="/admin/login" replace />;
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
      <Route path="/:slug" element={<PublicPageView />} />
      
      {/* Admin routes */}
      <Route
        path="/admin/login"
        element={
          token
            ? user?.role === 'admin'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/account" replace />
            : <LoginPage />
        }
      />
      <Route path="/admin" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/admin/pages" element={<Protected><PagesListPage /></Protected>} />
      <Route path="/admin/pages/:id" element={<Protected><PageEditorPage /></Protected>} />
      <Route path="/admin/pages/:id/preview" element={<Protected><PagePreviewPage /></Protected>} />
      <Route path="/admin/blog" element={<Protected><BlogListPage /></Protected>} />
      <Route path="/admin/blog/:id" element={<Protected><BlogEditorPage /></Protected>} />
      <Route path="/admin/blog/categories" element={<Protected><BlogCategoriesPage /></Protected>} />
      <Route path="/admin/seo" element={<Protected><SeoPage /></Protected>} />
      <Route path="/admin/carousels" element={<Protected><CarouselListPage /></Protected>} />
      <Route path="/admin/carousels/:id" element={<Protected><CarouselEditorPage /></Protected>} />
      <Route path="/admin/cases" element={<Protected><CasesListPage /></Protected>} />
      <Route path="/admin/cases/:id/preview" element={<Protected><CasePreviewPage /></Protected>} />
      <Route path="/admin/cases/:id" element={<Protected><CaseEditorPage /></Protected>} />
      <Route path="/admin/products" element={<Protected><ProductsListPage /></Protected>} />
      <Route path="/admin/products/:id" element={<Protected><ProductEditorPage /></Protected>} />
      <Route path="/admin/parsing" element={<Protected><ParsingPage /></Protected>} />
      <Route path="/admin/promotions" element={<Protected><PromotionsListPage /></Protected>} />
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
      <Route path="*" element={<PublicPageView />} />
    </Routes>
  );
}


