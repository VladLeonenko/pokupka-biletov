import { useQuery } from '@tanstack/react-query';
import { getPartials, getSitePage } from '@/services/cmsApi';
import { Box, CircularProgress } from '@mui/material';
import DOMPurify from 'dompurify';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

export function PagePreviewPage({ pageId }: { pageId?: string } = {}) {
  const paramsId = useParams().id;
  const id = pageId || paramsId || '';
  const { data: page, isLoading: lp } = useQuery({ queryKey: ['page', id], queryFn: () => getSitePage(id), enabled: !!id });
  const { data: partials, isLoading: lpar } = useQuery({ queryKey: ['partials'], queryFn: getPartials });

  // Подключаем legacy CSS/JS только для предпросмотра (из frontend/public/legacy)
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/legacy/css/style.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = '/legacy/js/app.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  if (lp || lpar) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!page) return null;

  const head = partials?.head || '';
  // Clean header/footer from any wrapping body/html tags
  let header = partials?.header || '';
  let footer = partials?.footer || '';
  // Remove <body> and <html> tags from header/footer if present
  header = header.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '');
  footer = footer.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '');
  
  // Ensure page.html is not empty and clean it from any body/html tags
  let pageHtml = page.html || '';
  
  // Debug: check if page.html is empty but we should have content
  if (!pageHtml || pageHtml.trim().length === 0) {
    console.warn('Page HTML is empty!', { id, pageId: page.id, hasHtml: !!page.html, htmlLength: page.html?.length });
  }
  
  // Remove any body/html/head tags that might be in the page content
  pageHtml = pageHtml.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head[^>]*>/gi, '');
  
  const rewriteAssets = (s: string) => {
    // Strip <base> to avoid breaking relative paths inside iframe
    let out = s.replace(/<base[^>]*>/gi, '');
    // Strip @@include directives as safety
    out = out
      .replace(/<!--\s*@@include\([^)]*\)\s*-->/gi, '')
      .replace(/@@include\([^)]*\)/gi, '');
    // Strip slick includes to avoid redirects/MIME errors
    out = out
      .replace(/<link[^>]+slick[^>]*>/gi, '')
      .replace(/<script[^>]+slick[^>]*><\/script>/gi, '');
    // images
    out = out
      .replace(/(src|href)=(")\.\.\/img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(\')\.\.\/img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(")\.\/img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(\')\.\/img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(")img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(\')img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(")\/img\//g, '$1=$2/legacy/img/')
      .replace(/(src|href)=(\')\/img\//g, '$1=$2/legacy/img/')
      .replace(/url\((['"])\.\.\/img\//g, 'url($1/legacy/img/')
      .replace(/url\((['"])\.\/img\//g, 'url($1/legacy/img/')
      .replace(/url\((['"])\/img\//g, 'url($1/legacy/img/')
      // alias @img
      .replace(/@img\//g, '/legacy/img/')
      // css
      .replace(/href=(")\.\.\/css\//g, 'href=$1/legacy/css/')
      .replace(/href=(\')\.\.\/css\//g, 'href=$1/legacy/css/')
      .replace(/href=(")css\//g, 'href=$1/legacy/css/')
      .replace(/href=(\')css\//g, 'href=$1/legacy/css/')
      .replace(/href=(")\/css\//g, 'href=$1/legacy/css/')
      .replace(/href=(\')\/css\//g, 'href=$1/legacy/css/')
      // js
      .replace(/src=(")\.\.\/js\//g, 'src=$1/legacy/js/')
      .replace(/src=(\')\.\.\/js\//g, 'src=$1/legacy/js/')
      .replace(/src=(")js\//g, 'src=$1/legacy/js/')
      .replace(/src=(\')js\//g, 'src=$1/legacy/js/')
      .replace(/src=(")\/js\//g, 'src=$1/legacy/js/')
      .replace(/src=(\')\/js\//g, 'src=$1/legacy/js/')
      // modules
      .replace(/src=(")\.\.\/js\/modules\//g, 'src=$1/legacy/js/modules/')
      .replace(/src=(\')\.\.\/js\/modules\//g, 'src=$1/legacy/js/modules/')
      .replace(/src=(")modules\//g, 'src=$1/legacy/js/modules/')
      .replace(/src=(\')modules\//g, 'src=$1/legacy/js/modules/')
      // lazy attrs
      .replace(/data-src=(")([^"']+)(")/g, (_m, q1, val, q2) => `${'data-src=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
      .replace(/data-src=(\')([^"']+)(\')/g, (_m, q1, val, q2) => `${'data-src=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
      .replace(/data-background(?:-image)?=(")([^"']+)(")/g, (_m, q1, val, q2) => `${'data-background=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
      .replace(/data-background(?:-image)?=(\')([^"']+)(\')/g, (_m, q1, val, q2) => `${'data-background=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`);
    // srcset (multiple URLs)
    out = out.replace(/srcset=("|')(.*?)(\1)/g, (_m, q, content) => {
      const fixed = content
        .replace(/@img\//g, '/legacy/img/')
        .replace(/(?:\.{1,2}\/|\/)?img\//g, '/legacy/img/');
      return `srcset=${q}${fixed}${q}`;
    });
    return out;
  };

  const replaceShortcodes = (s: string) => s.replace(/\[carousel\s+slug=\"(.*?)\"\s*\]/g, (_m, slug) => `<div data-carousel=\"${slug}\"></div>`);
  // Note: API_BASE injection removed for now to avoid breaking preview
  // The form-handler.js will auto-detect API URL from window.location or use defaults
  const headHtml = rewriteAssets(head);
  const seoTags = (() => {
    const s = (page.seo || {}) as any;
    const parts: string[] = [];
    const title = s.metaTitle || page.title;
    if (title) parts.push(`<title>${title}</title>`);
    if (s.metaDescription) parts.push(`<meta name="description" content="${s.metaDescription}">`);
    if (Array.isArray(s.metaKeywords) && s.metaKeywords.length) parts.push(`<meta name="keywords" content="${s.metaKeywords.join(', ')}">`);
    const url = (s.canonicalUrl || (typeof window !== 'undefined' ? window.location.origin + page.path : page.path));
    if (url) parts.push(`<link rel="canonical" href="${url}">`);
    const robots = `${(s.robotsIndex ?? true) ? 'index' : 'noindex'}, ${(s.robotsFollow ?? true) ? 'follow' : 'nofollow'}`;
    parts.push(`<meta name="robots" content="${robots}">`);
    const ogt = s.ogTitle || title; const ogd = s.ogDescription || s.metaDescription; const ogi = s.ogImageUrl;
    if (ogt) parts.push(`<meta property="og:title" content="${ogt}">`);
    if (ogd) parts.push(`<meta property="og:description" content="${ogd}">`);
    if (url) parts.push(`<meta property="og:url" content="${url}">`);
    parts.push(`<meta property="og:site_name" content="${title}">`);
    if (ogi) parts.push(`<meta property="og:image" content="${ogi}">`);
    if (s.twitterCard) parts.push(`<meta name="twitter:card" content="${s.twitterCard}">`);
    if (s.twitterSite) parts.push(`<meta name="twitter:site" content="${s.twitterSite}">`);
    if (s.twitterCreator) parts.push(`<meta name="twitter:creator" content="${s.twitterCreator}">`);
    if (Array.isArray(s.hreflang)) s.hreflang.forEach((h: any) => { if (h?.lang && h?.url) parts.push(`<link rel="alternate" href="${h.url}" hreflang="${h.lang}">`); });
    if (s.structuredDataJson) parts.push(`<script type="application/ld+json">${s.structuredDataJson}</script>`);
    return parts.join('\n');
  })();
  // Ensure we have page content - wrap in main container if needed
  // Don't wrap in <main> if content already has container divs (like <div class="container">)
  let pageContent: string;
  if (pageHtml.trim().length === 0) {
    pageContent = '<main class="page-content"><div style="padding: 20px; text-align: center; color: #999;"><p>Контент страницы пуст. Добавьте содержимое в редакторе.</p></div></main>';
  } else {
    // If content starts with container div, don't wrap in main (it's already structured)
    // Otherwise wrap in main for semantic structure
    if (pageHtml.trim().match(/^\s*<div[^>]*class[^>]*container/i)) {
      pageContent = pageHtml; // Already has container structure
    } else {
      pageContent = `<div class="page-content-wrapper">${pageHtml}</div>`;
    }
  }
  
  // Combine header, content, and footer
  const bodyContent = `${header}\n${pageContent}\n${footer}`;
  const bodyHtml = rewriteAssets(replaceShortcodes(bodyContent));
  
  const doc = `<!doctype html>\n<html lang=\"ru\">\n<head>\n${headHtml}\n${seoTags}\n<link rel=\"stylesheet\" href=\"/legacy/css/style.min.css\" />\n<link rel=\"stylesheet\" href=\"/legacy/css/owl.carousel.min.css\" />\n<link rel=\"stylesheet\" href=\"/legacy/css/owl.theme.default.min.css\" />\n<style>body{cursor:auto!important}.cursor,.cursor--large,.cursor--small,.cursor-outer,.cursor-small{display:none!important}</style>\n</head>\n<body>\n<div id=\"cursor-outer\" class=\"cursor cursor--large\"></div><div id=\"cursor-inner\" class=\"cursor cursor--small\"></div><div class=\"cursor-outer\"></div><div class=\"cursor-small\"></div>\n${bodyHtml}\n<script src=\"/legacy/js/jquery.js\"></script>\n<script src=\"/legacy/js/form-handler.js\"></script>\n<script>
// bootstrap globals before legacy scripts
if (!window.$) window.$ = window.jQuery;
// Provide safe cursor globals without visual elements
var cursorOuter = { getBoundingClientRect: function(){ return {left:0, top:0, width:0, height:0}; } };
var cursorInner = { style: {} };
window.cursorOuter = cursorOuter; window.cursorInner = cursorInner;
var vertCycle = window.vertCycle || function(){}; window.vertCycle = vertCycle;
// Slick carousel удален - используем нативные карусели
var $slideshow = null; window.$slideshow = $slideshow;
if (!window.jQuery) window.jQuery = window.$ || {};
if (!window.jQuery.fn) window.jQuery.fn = {};
// Slick carousel удален - больше не используется
// mixItUp polyfill (jQuery v2 API)
if (!window.jQuery.fn.mixItUp) {
  window.jQuery.fn.mixItUp = function(methodOrSelector, maybeSelector){
    var container = this[0]; if (!container) return this;
    if (methodOrSelector === 'filter') {
      var sel = maybeSelector || 'all';
      var children = container.querySelectorAll('.mix');
      Array.prototype.forEach.call(children, function(ch){
        if (sel === 'all') { ch.style.display = ''; }
        else { var cls = sel.replace('.', ''); ch.style.display = ch.classList.contains(cls) ? '' : 'none'; }
      });
      return this;
    }
    return this;
  };
}
</script>\n<!-- Owl Carousel удален - используем нативные карусели -->\n<script src=\"/legacy/js/mixItUp.js\"></script>\n<script src=\"/legacy/js/modules/mixItUp.js\"></script>\n<script src=\"/legacy/js/native-carousel.js\"></script>\n<script>(async function(){\n  try {\n    // Нативные карусели инициализируются автоматически через native-carousel.js\n    // Который использует data-carousel атрибуты и загружает данные из API\n    // Blog categories and items\n    const catWrap = document.querySelector('.blog-nav.blog-nav-desktop');\n    const listWrap = document.querySelector('#Blog-items');\n    if (catWrap && listWrap) {\n      const [catsRes, postsRes] = await Promise.all([\n        fetch('/api/blog/categories'),\n        fetch('/api/blog')\n      ]);\n      const cats = catsRes.ok ? await catsRes.json() : [];\n      const posts = postsRes.ok ? await postsRes.json() : [];
      catWrap.innerHTML = '';
      var allBtn = document.createElement('div');
      allBtn.className = 'filter active'; allBtn.innerHTML = '<h5>Все темы</h5>'; allBtn.setAttribute('data-filter', 'all');
      catWrap.appendChild(allBtn);
      cats.forEach(function(c){
        var el = document.createElement('div');
        el.className = 'filter'; el.setAttribute('data-filter', '.category-' + c.slug);
        el.innerHTML = '<h5>' + (c.name || c.slug) + '</h5>';
        catWrap.appendChild(el);
      });
      function renderItems(activeCat) {
        listWrap.innerHTML = '';
        posts.forEach(function(p){
          var slug = p.category_slug || '';
          var categoryClass = slug ? (slug.indexOf('category-') === 0 ? slug : ('category-' + slug)) : '';
          var item = document.createElement('div');
          item.className = 'mix blog-item ' + categoryClass;
          item.innerHTML = '<div class=\"portfolio-heading\"><h4>' + (p.title || '') + '</h4><p>' + p.slug + '</p></div>';
          listWrap.appendChild(item);
        });
      }
      renderItems('');
      // init mixItUp (jQuery plugin or vanilla v3)
      var mixer = null;
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.mixItUp) {
        window.jQuery('#Blog-items').mixItUp({ selectors: { target: '.mix' } });
      } else if (window.mixitup) {
        mixer = window.mixitup(listWrap, { selectors: { target: '.mix' } });
      }
      catWrap.addEventListener('click', function(e){
        var t = e.target;
        if (t && t.closest) t = t.closest('.filter');
        if (t && t.classList && t.classList.contains('filter')) {
          e.preventDefault();
          Array.prototype.forEach.call(catWrap.querySelectorAll('.filter'), function(el){ el.classList.remove('active'); });
          t.classList.add('active');
          var sel = t.getAttribute('data-filter') || 'all';
          if (window.jQuery && window.jQuery.fn && window.jQuery.fn.mixItUp) {
            window.jQuery('#Blog-items').mixItUp('filter', sel);
          } else if (mixer && mixer.filter) {
            mixer.filter(sel);
          } else {
            var children = listWrap.querySelectorAll('.mix');
            children.forEach(function(ch){
              if (sel === 'all') { ch.style.display = ''; }
              else { ch.style.display = ch.classList.contains(sel.replace('.', '')) ? '' : 'none'; }
            });
          }
        }
      });
    }
  } catch (e) { console.warn(e); }
})();</script>\n</body>\n</html>`;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
      <iframe
        title="preview"
        style={{ width: '100%', height: '100%', border: 0, flex: 1 }}
        srcDoc={doc}
      />
    </Box>
  );
}


