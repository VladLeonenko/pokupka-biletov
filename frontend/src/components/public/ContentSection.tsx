import { ReactNode } from 'react';

interface ContentSectionProps {
  className?: string;
  children: ReactNode;
}

/**
 * Универсальный компонент для секций контента
 */
export function ContentSection({ className = '', children }: ContentSectionProps) {
  return (
    <div className={`container ${className}`.trim()}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Компонент заголовка секции
 */
export function SectionHeader({ title, subtitle, className = '' }: SectionHeaderProps) {
  return (
    <div className={`header-section ${className}`.trim()}>
      <h2>{title}</h2>
      {subtitle && <h5>{subtitle}</h5>}
    </div>
  );
}

interface TextBlockProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Компонент текстового блока
 */
export function TextBlock({ children, className = '', style }: TextBlockProps) {
  return (
    <div className={`text-block ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

