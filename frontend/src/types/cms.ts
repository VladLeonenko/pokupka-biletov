export type PageId = string;

export type SitePage = {
  id: PageId; // using slug like '/about'
  path: string; // equals slug
  title: string;
  html: string; // content
  seo: SeoData;
  isPublished?: boolean;
};

export type BlogPostCarouselItem = {
  imageUrl: string;
  caption?: string;
  alt?: string;
  linkUrl?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt?: string;
  publishedAt?: string;
  seo: SeoData;
  isPublished?: boolean;
  categorySlug?: string;
  tags?: string[];
  isFeatured?: boolean;
  coverImageUrl?: string;
  carouselEnabled?: boolean;
  carouselTitle?: string;
  carouselItems?: BlogPostCarouselItem[];
};

export type SeoData = {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  structuredDataJson?: string; // JSON-LD string
  hreflang?: Array<{ lang: string; url: string }>;
};


export type Carousel = { slug: string; title: string };
export type CarouselSlide = {
  id?: number;
  kind: 'image' | 'text';
  image_url?: string;
  caption_html?: string;
  width?: number;
  height?: number;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type CaseItem = {
  slug: string;
  title: string;
  summary?: string;
  contentHtml?: string;
  heroImageUrl?: string;
  gallery?: Array<{ url: string; alt?: string }> | string[];
  metrics?: Record<string, any>;
  tools?: string[];
  contentJson?: any;
  templateType?: string;
  isTemplate?: boolean;
  isPublished?: boolean;
  category?: 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design'; // Категория для фильтрации в портфолио
  createdAt?: string;
  updatedAt?: string;
};

export type ProductItem = {
  slug: string;
  title: string;
  descriptionHtml?: string;
  summary?: string;
  fullDescriptionHtml?: string;
  priceCents?: number;
  currency?: string;
  pricePeriod?: 'one_time' | 'monthly' | 'yearly';
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
  contentJson?: ProductContentJson; // Structured content based on /ads template
  categoryId?: number; // deprecated, use categoryIds
  categoryIds?: number[]; // множественные категории
  imageUrl?: string;
  gallery?: string[];
  stockQuantity?: number;
  sku?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  caseSlugs?: string[];
  createdAt?: string;
  updatedAt?: string;
};

// Structured content template based on /ads.html
export type ProductContentJson = {
  // Header section
  header?: {
    title: string;
    description: string;
    primaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
  };
  // Description section
  description?: {
    title: string;
    text: string;
  };
  // Price section (accordion with tariffs)
  priceSection?: {
    title: string;
    tariffs: Array<{
      id: string;
      name: string;
      subtitle: string;
      price: string;
      description?: string;
      featuresLeft?: string[];
      featuresRight?: string[];
    }>;
  };
  // Work steps section
  workSteps?: {
    title: string;
    description: string;
    steps: Array<{
      number: string;
      title?: string;
      description: string;
    }>;
  };
  // Stats section — supports both flat items and category-based layout
  stats?: {
    title: string;
    description?: string;
    items?: Array<{
      value: string;
      label: string;
    }>;
    categories?: Array<{
      title: string;
      bullets: string[];
    }>;
  };
  // Team section (carousel)
  team?: {
    title: string;
    description: string;
    members: Array<{
      teamMemberId?: number; // ID из таблицы team_members
      name: string;
      role: string;
      imageUrl?: string;
    }>;
  };
  // Related services section
  relatedServices?: {
    title: string;
    services: Array<{
      title: string;
      imageUrl?: string;
      link?: string;
    }>;
  };
  // Subscribe section (promo, brief, call)
  subscribe?: {
    items: Array<{
      iconUrl?: string;
      title: string;
      description: string;
      linkText?: string;
      linkUrl?: string;
    }>;
  };
  // Background images
  backgroundImages?: {
    grayBgUrl?: string;
    yellowBgUrl?: string;
  };
  // FAQ section
  faq?: {
    title?: string;
    description?: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
};

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  imageUrl?: string;
  bio?: string;
  skills?: string[];
  portfolioUrls?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[]; // for select
};

export type Form = {
  id?: number;
  form_id: string;
  form_name: string;
  page_path?: string;
  fields: FormField[];
  created_at?: string;
  updated_at?: string;
};

export type FormSubmission = {
  id: number;
  form_id: string;
  form_data: Record<string, any>;
  status: 'new' | 'read' | 'replied' | 'archived';
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  submitted_at: string;
  read_at?: string;
  replied_at?: string;
};

export type FormAbandonment = {
  id: number;
  form_id: string;
  form_data: Record<string, any>;
  started_at: string;
  abandoned_at: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
};

export type FormStats = {
  overview: {
    total_forms: string;
    total_submissions: string;
    new_submissions: string;
    read_submissions: string;
    replied_submissions: string;
    total_abandonments: string;
    submissions_today: string;
    submissions_week: string;
    submissions_month: string;
  };
  byForm: Array<{
    form_id: string;
    form_name: string;
    submission_count: string;
    abandonment_count: string;
    new_count: string;
  }>;
};

// Sales Funnels types (Bitrix24-like)
export type SalesFunnel = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FunnelStage = {
  id: number;
  funnelId: number;
  name: string;
  color: string;
  sortOrder: number;
  probability: number;
  createdAt?: string;
};

export type Deal = {
  id: number;
  funnelId: number;
  stageId: number;
  title: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName?: string;
  budget?: number;
  currency?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  isWon: boolean;
  isLost: boolean;
  lossReason?: string;
  assignedTo?: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  movedAt?: string;
  closedAt?: string;
};

export type Payment = {
  id: number;
  dealId: number;
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  reminderSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DealDocument = {
  id: number;
  dealId: number;
  name: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  documentType: 'contract' | 'invoice' | 'agreement' | 'other';
  description?: string;
  uploadedBy?: number;
  createdAt?: string;
};

// Commercial Proposals (КП) types
export type ProposalSlideType = 
  | 'hero' 
  | 'services' 
  | 'metrics' 
  | 'roadmap' 
  | 'guarantees' 
  | 'contacts'
  | 'value'
  | 'problems'
  | 'pricing'
  | 'custom';

export type ProposalSlideContent = {
  // Hero slide
  title?: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  
  // Services slide
  services?: Array<{
    title: string;
    description: string;
    icon?: string;
    items?: string[];
  }>;
  
  // Metrics slide
  metrics?: Array<{
    value: string;
    label: string;
    change?: string;
    description?: string;
  }>;
  
  // Roadmap slide
  phases?: Array<{
    title: string;
    period: string;
    actions: string[];
    result: string;
  }>;
  
  // Guarantees slide
  guarantees?: Array<{
    title: string;
    description: string;
    items?: string[];
  }>;
  
  // Contacts slide
  contacts?: Array<{
    name: string;
    phone?: string;
    email?: string;
  }>;
  
  // Value slide
  benefits?: Array<{
    title: string;
    value: string;
    description: string;
  }>;
  
  // Problems slide
  problems?: Array<{
    title: string;
    items: string[];
    solution?: string;
  }>;
  
  // Pricing slide
  packages?: Array<{
    name: string;
    price: string;
    period?: string;
    features: string[];
    description?: string;
  }>;
  
  // Custom content
  [key: string]: any;
};

export type ProposalSlide = {
  id?: number;
  proposalId?: number;
  slideType: ProposalSlideType;
  sortOrder: number;
  content: ProposalSlideContent;
  createdAt?: string;
  updatedAt?: string;
};

export type CommercialProposal = {
  id: number;
  clientId?: number;
  dealId?: number;
  userId?: number;
  title: string;
  clientName?: string;
  clientEmail?: string;
  description?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  shareToken?: string;
  pdfPath?: string;
  settings?: Record<string, any>;
  viewCount?: number;
  lastViewedAt?: string;
  slides?: ProposalSlide[];
  createdAt?: string;
  updatedAt?: string;
};

export type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message?: string;
  linkUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
};

export type DealActivity = {
  id: number;
  dealId: number;
  type: 'call' | 'meeting' | 'email' | 'task' | 'note';
  subject?: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  createdBy?: number;
  createdAt?: string;
};

// Tasks types (Platrum-like)
export type Task = {
  id: number;
  title: string;
  description?: string;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_client' | 'revision';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: number;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  createdBy?: number;
  dueDate?: string;
  completedAt?: string;
  dealId?: number;
  tags?: string[];
  category?: 'development' | 'marketing' | 'business' | 'operations' | 'support' | 'other';
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskComment = {
  id: number;
  taskId: number;
  comment: string;
  createdBy?: number;
  createdAt?: string;
};

// E-commerce types
export type ProductCategory = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = {
  id: number;
  userId?: number;
  sessionId?: string;
  productSlug: string;
  quantity: number;
  product?: ProductItem;
  createdAt?: string;
  updatedAt?: string;
};

export type WishlistItem = {
  id: number;
  userId: number;
  productSlug: string;
  product?: ProductItem;
  createdAt?: string;
};

export type Order = {
  id: number;
  userId?: number;
  sessionId?: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalCents: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  items?: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  id: number;
  orderId: number;
  productSlug: string;
  productTitle: string;
  priceCents: number;
  quantity: number;
  createdAt?: string;
};

export type ProductAnalytics = {
  id: number;
  productSlug: string;
  eventType: 'view' | 'click' | 'add_to_cart' | 'add_to_wishlist' | 'purchase' | 'case_view';
  userId?: number;
  sessionId?: string;
  metadata?: any;
  createdAt?: string;
};

export type User = {
  id: number;
  email?: string;
  phone?: string;
  name?: string;
  avatarUrl?: string;
  oauthProvider?: 'google' | 'yandex' | 'email' | 'phone';
  oauthId?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SearchFilters = {
  isActive?: boolean;
  categoryId?: number; // фильтр по одной категории (товар должен быть в ней)
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'created_desc' | 'popularity';
  searchQuery?: string;
};
