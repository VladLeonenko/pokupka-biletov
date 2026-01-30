// Loads .html files from ../dist via Vite's import.meta.glob as raw
// Note: server.fs.allow in vite.config.ts must include path.resolve(__dirname, '..')

type GlobMap = Record<string, string>;

export function loadDistHtmlFiles(): GlobMap {
  // Import all html files as raw string content
  const modules = import.meta.glob('../dist/**/*.html', { as: 'raw', eager: true }) as GlobMap;
  return modules;
}

export function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match?.[1]?.trim() || 'Без названия';
}

export function htmlFilePathToId(path: string): string {
  return path.replace(/^\.\.\//, '');
}




