// Типы для Page Builder (TILDA CLONE PRO)

export type BlockType = 
  | 'cover' | 'menu' | 'content' | 'gallery' | 'shop' 
  | 'forms' | 'social' | 'features' | 'cta' | 'text' | 'image' | 'video' | 'spacer';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface BlockStyles {
  // Colors
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  
  // Spacing
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  
  // Typography
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  
  // Layout
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  
  // Border & Radius
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  
  // Effects
  boxShadow?: string;
  opacity?: number;
  zIndex?: number;
  
  // Background
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  
  // Animation
  animation?: BlockAnimation;
  
  // Visibility
  display?: Record<DeviceType, 'block' | 'none' | 'flex' | 'grid'>;
}

export interface BlockAnimation {
  trigger?: 'scroll' | 'inview' | 'hover' | 'click' | 'loop';
  effect?: 'fade' | 'slide' | 'zoom' | 'rotate' | 'scale' | 'morph';
  easing?: string;
  delay?: number;
  duration?: number;
}

export interface BlockContent {
  text?: string;
  html?: string;
  imageUrl?: string;
  videoUrl?: string;
  iframeUrl?: string;
  linkUrl?: string;
  [key: string]: any;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  name: string;
  category: string;
  content: BlockContent;
  styles: BlockStyles;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: PageBlock[];
  parentId?: string;
  order: number;
  customCss?: string;
  customJs?: string;
  seo?: {
    alt?: string;
    title?: string;
  };
}

// Типы для секций с колонками
export type SectionLayout = 
  | 'full-width'      // Одна колонка во всю ширину
  | 'two-50-50'       // 2 колонки 50/50
  | 'two-33-67'       // 2 колонки 33/67
  | 'two-67-33'       // 2 колонки 67/33
  | 'two-25-75'       // 2 колонки 25/75
  | 'two-75-25'       // 2 колонки 75/25
  | 'three-equal'     // 3 колонки равной ширины
  | 'four-equal';     // 4 колонки равной ширины

export interface SectionColumn {
  id: string;
  blocks: PageBlock[];
}

export interface PageSection {
  id: string;
  layout: SectionLayout;
  columns: SectionColumn[];
  styles?: BlockStyles;
  order: number;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  blocks: PageBlock[];
  theme: ThemeSettings;
}

export interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number;
    lineHeight: number;
  };
  buttons: {
    style: string;
    borderRadius: number;
    padding: { x: number; y: number };
  };
  forms: {
    borderStyle: string;
    borderRadius: number;
  };
}

export interface PageSettings {
  id: string;
  title: string;
  slug: string;
  description: string;
  keywords: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  password?: string;
  customCss?: string;
  customJs?: string;
  schema?: any;
}

export interface Page {
  id: string;
  settings: PageSettings;
  blocks: PageBlock[];
  sections?: PageSection[]; // Секции с колонками
  theme: ThemeSettings;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  revisions?: PageRevision[];
}

export interface PageRevision {
  id: string;
  pageId: string;
  data: Page;
  createdAt: string;
  createdBy: string;
}

export interface BlockLibraryItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  thumbnail: string;
  block: Partial<PageBlock>;
  tags: string[];
}
