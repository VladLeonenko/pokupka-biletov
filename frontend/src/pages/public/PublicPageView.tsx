import { useQuery } from '@tanstack/react-query';
import { getPublicPage, getPublicPartials } from '@/services/publicApi';
import { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { PublicPageRenderer } from '@/components/public/PublicPageRenderer';

export function PublicPageView() {
  const location = useLocation();
  // Get slug from location pathname (for public routes) or params (for /site/:slug routes)
  const { slug } = useParams();
  // Use location pathname for direct routes like /about, /contacts, etc.
  // Or use slug from params for /site/:slug routes
  const pathSlug = location.pathname;
  // Normalize slug: remove trailing slash (except root), handle .html extension
  let pageSlug = pathSlug === '/' ? '/' : pathSlug.replace(/\/+$/, '');
  // Если slug заканчивается на .html, удаляем расширение для поиска в БД
  if (pageSlug !== '/' && pageSlug.endsWith('.html')) {
    pageSlug = pageSlug.replace(/\.html$/, '');
  }
  // Убеждаемся, что slug начинается с /
  if (pageSlug !== '/' && !pageSlug.startsWith('/')) {
    pageSlug = '/' + pageSlug;
  }
  
  const { data: page, isLoading } = useQuery({ 
    queryKey: ['public-page', pageSlug], 
    queryFn: () => getPublicPage(pageSlug),
    enabled: !!pageSlug,
    staleTime: 30000,
  });
  const { data: partials } = useQuery({ 
    queryKey: ['public-partials'], 
    queryFn: getPublicPartials,
    enabled: true,
    staleTime: 30000,
  });

  // Собираем полный HTML для рендеринга
  const fullHtml = useMemo(() => {
    if (!page || !partials) return '';

    const head = partials.head || '';
    // Header и Footer теперь загружаются через GlobalHeaderFooter, не добавляем их здесь
    
    let pageHtml = page.html || '';
    pageHtml = pageHtml.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head[^>]*>/gi, '');

    // Удаляем дублирующиеся header и footer из body контента страницы
    // Удаляем @@include('html/header.html') и подобные включения
    pageHtml = pageHtml.replace(/@@include\(['"]html\/header\.html['"]\)/gi, '');
    pageHtml = pageHtml.replace(/@@include\(['"]html\/footer\.html['"]\)/gi, '');
    // Удаляем уже включенные header и footer теги, если они есть
    pageHtml = pageHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    // Удаляем только открывающий тег header, если он есть без закрывающего
    pageHtml = pageHtml.replace(/<header[^>]*>/gi, '');
    // Удаляем footer теги
    pageHtml = pageHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    const rewriteAssets = (s: string) => {
      let out = s.replace(/<base[^>]*>/gi, '');
      out = out
        .replace(/<!--\s*@@include\([^)]*\)\s*-->/gi, '')
        .replace(/@@include\([^)]*\)/gi, '')
        // Relative paths to absolute (../page -> /page)
        .replace(/href=(")\.\.\/([^"'\s]+)(")/g, 'href=$1/$2$3')
        .replace(/href=(\')\.\.\/([^"'\s]+)(\')/g, 'href=$1/$2$3')
        // Images
        .replace(/(src|href)=(")\.\.\/img\//g, '$1=$2/legacy/img/')
        .replace(/(src|href)=(\')\.\.\/img\//g, '$1=$2/legacy/img/')
        .replace(/(src|href)=(")img\//g, '$1=$2/legacy/img/')
        .replace(/(src|href)=(\')img\//g, '$1=$2/legacy/img/')
        .replace(/@img\//g, '/legacy/img/')
        // CSS files
        .replace(/href=(")\.\.\/css\//g, 'href=$1/legacy/css/')
        .replace(/href=(\')\.\.\/css\//g, 'href=$1/legacy/css/')
        .replace(/href=(")css\//g, 'href=$1/legacy/css/')
        .replace(/href=(\')css\//g, 'href=$1/legacy/css/')
        // JS files
        .replace(/src=(")\.\.\/js\//g, 'src=$1/legacy/js/')
        .replace(/src=(\')\.\.\/js\//g, 'src=$1/legacy/js/')
        .replace(/src=(")js\//g, 'src=$1/legacy/js/')
        .replace(/src=(\')js\//g, 'src=$1/legacy/js/');
      return out;
    };

    const pageContent = pageHtml.trim().length > 0 ? pageHtml : '<div>Контент не найден</div>';
    // Header и Footer теперь глобальные, не добавляем их в bodyContent
    const bodyContent = pageContent;
    const bodyHtml = rewriteAssets(bodyContent);
    const headHtml = rewriteAssets(head);

    const seoTags = (() => {
      const s = (page.seo || {}) as any;
      const parts: string[] = [];
      const title = s.metaTitle || page.title;
      if (title) parts.push(`<title>${title}</title>`);
      if (s.metaDescription) parts.push(`<meta name="description" content="${s.metaDescription}">`);
      const url = typeof window !== 'undefined' ? window.location.origin + page.path : page.path;
      if (url) parts.push(`<link rel="canonical" href="${url}">`);
      return parts.join('\n');
    })();

    // Определяем, является ли это страницей команды или портфолио (не загружаем app.min.js и cursor.js для избежания ошибок)
    const isTeamPage = pageSlug === '/komanda-primecoder';
    const isPortfolioPage = pageSlug === '/portfolio';
    const skipScriptsPages = isTeamPage || isPortfolioPage;
    const conditionalScripts = skipScriptsPages ? '' : `
<script src="/legacy/js/cursor-fix.js"></script>
<script src="/legacy/js/app.min.js"></script>`;

    // Собираем полный HTML документ
    return `<!doctype html>
<html lang="ru">
<head>
${headHtml}
${seoTags}
<link rel="stylesheet" href="/legacy/css/style.min.css" />
</head>
<body>
${bodyHtml}
<script src="/legacy/js/jquery.js"></script>
<!-- Owl Carousel удален - используем нативные карусели -->
<script src="/legacy/js/form-handler.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="/legacy/js/privacy-consent.js"></script>
${conditionalScripts}
</body>
</html>`;
  }, [page, partials]);

  if (isLoading || !partials) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!page || page === null) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Страница не найдена</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Убедитесь, что страница опубликована или проверьте правильность URL.
        </Typography>
      </Box>
    );
  }

  return (
    <PublicPageRenderer html={fullHtml} />
  );
}

