export type BlogBlockType =
  | 'text'
  | 'intro'
  | 'image'
  | 'code'
  | 'faq'
  | 'table'
  | 'stats'
  | 'cta';

export interface BlogBlockBase {
  id: string;
  type: BlogBlockType;
}

export interface TextBlockContent {
  html: string;
}

export interface IntroBlockContent {
  title: string;
  text: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface ImageBlockContent {
  src: string;
  alt?: string;
  caption?: string;
}

export interface CodeBlockContent {
  code: string;
  language: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlockContent {
  items: FaqItem[];
}

export interface TableBlockContent {
  headers: string[];
  rows: string[][];
}

export interface StatsItem {
  value: string;
  label: string;
}

export interface StatsBlockContent {
  items: StatsItem[];
}

export interface CtaBlockContent {
  title: string;
  text?: string;
  buttons: Array<{ text: string; url: string }>;
}

export type BlogBlockContent =
  | TextBlockContent
  | IntroBlockContent
  | ImageBlockContent
  | CodeBlockContent
  | FaqBlockContent
  | TableBlockContent
  | StatsBlockContent
  | CtaBlockContent;

export interface BlogBlock extends BlogBlockBase {
  content: BlogBlockContent;
}

export interface BlogBlocksData {
  blocks: BlogBlock[];
}

export const BLOG_BLOCK_LABELS: Record<BlogBlockType, string> = {
  text: 'Текст',
  intro: 'Hero / Intro',
  image: 'Изображение',
  code: 'Код',
  faq: 'FAQ',
  table: 'Таблица',
  stats: 'Статистика',
  cta: 'Призыв к действию',
};

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
];
