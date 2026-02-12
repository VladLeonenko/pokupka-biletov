import { Box } from '@mui/material';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { useEffect, useRef } from 'react';
import { BlogBlock, IntroBlockContent, ImageBlockContent, CodeBlockContent, FaqBlockContent, TableBlockContent, StatsBlockContent, CtaBlockContent } from '@/types/blogBlocks';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

interface BlogBlockRendererProps {
  block: BlogBlock;
}

export function BlogBlockRenderer({ block }: BlogBlockRendererProps) {
  const codeRef = useRef<HTMLPreElement>(null);
  const content = block.content as any;

  useEffect(() => {
    if (block.type === 'code' && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [block.type, content?.code, content?.language]);

  if (block.type === 'text') {
    return (
      <Box className="blog-block-text" data-scroll-child sx={{ '& p': { color: 'rgba(225,229,255,0.82)' } }} dangerouslySetInnerHTML={{ __html: content.html || '' }} />
    );
  }

  if (block.type === 'intro') {
    const c = content as IntroBlockContent;
    return (
      <div className="article-intro" data-scroll-child>
        {c.title && <h2>{c.title}</h2>}
        {c.text && <p dangerouslySetInnerHTML={{ __html: c.text.replace(/\n/g, '<br/>') }} />}
        {c.ctaText && c.ctaUrl && <a href={c.ctaUrl}>{c.ctaText}</a>}
      </div>
    );
  }

  if (block.type === 'image') {
    const c = content as ImageBlockContent;
    if (!c.src) return null;
    return (
      <figure data-scroll-child style={{ margin: '32px 0' }}>
        <img src={resolveImageUrl(c.src, '')} alt={c.alt || ''} style={{ width: '100%', borderRadius: 24 }} />
        {c.caption && <figcaption>{c.caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'code') {
    const c = content as CodeBlockContent;
    if (!c.code?.trim()) return null;
    const lang = c.language || 'javascript';
    return (
      <div className="blog-block-code" data-scroll-child>
        <pre>
          <code ref={codeRef} className={`language-${lang}`}>
            {c.code}
          </code>
        </pre>
      </div>
    );
  }

  if (block.type === 'faq') {
    const c = content as FaqBlockContent;
    const items = c.items || [];
    return (
      <div className="article-faq-accordion" data-scroll-child>
        {items.map((item, i) => (
          <details key={i} className="article-faq-item">
            <summary className="article-faq-summary">{item.question}</summary>
            <div className="article-faq-content">
              <p dangerouslySetInnerHTML={{ __html: (item.answer || '').replace(/\n/g, '<br/>') }} />
            </div>
          </details>
        ))}
      </div>
    );
  }

  if (block.type === 'table') {
    const c = content as TableBlockContent;
    const headers = c.headers || [];
    const rows = c.rows || [];
    return (
      <div className="article-table" data-scroll-child>
        <table>
          {headers.length > 0 && (
            <thead>
              <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === 'stats') {
    const c = content as StatsBlockContent;
    return (
      <div className="grid" data-scroll-child>
        {(c.items || []).map((item, i) => (
          <div key={i} className="grid-item">
            <div className="stat-number">{item.value}</div>
            <p style={{ textAlign: 'center', margin: 0 }}>{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === 'cta') {
    const c = content as CtaBlockContent;
    return (
      <div className="article-cta" data-scroll-child>
        {c.title && <h2>{c.title}</h2>}
        {c.text && <p>{c.text}</p>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
          {(c.buttons || []).map((b, i) => (
            b.text && b.url ? <a key={i} href={b.url}>{b.text}</a> : null
          ))}
        </Box>
      </div>
    );
  }

  return null;
}
