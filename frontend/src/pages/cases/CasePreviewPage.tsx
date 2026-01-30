import { useQuery } from '@tanstack/react-query';
import { getCase, getPartials } from '@/services/cmsApi';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';

export function CasePreviewPage() {
  const { id } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: caseData, isLoading } = useQuery({ 
    queryKey: ['case', id], 
    queryFn: () => getCase(id!), 
    enabled: !!id 
  });
  const { data: partials, isLoading: loadingPartials } = useQuery({ 
    queryKey: ['partials'], 
    queryFn: getPartials 
  });

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
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!caseData || !partials || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    let head = partials.head || '';
    let header = partials.header || '';
    let footer = partials.footer || '';

    // Clean header/footer from any wrapping body/html tags
    header = header.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '');
    footer = footer.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '');
    
    // Get case HTML content
    let caseHtml = caseData.contentHtml || '';
    
    // Remove any body/html/head tags that might be in the case content
    caseHtml = caseHtml.replace(/<\/?body[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head[^>]*>/gi, '');
    
    const rewriteAssets = (s: string) => {
      let out = s.replace(/<base[^>]*>/gi, '');
      out = out
        .replace(/<!--\s*@@include\([^)]*\)\s*-->/gi, '')
        .replace(/@@include\([^)]*\)/gi, '');
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
        // data-src
        .replace(/data-src=(")([^"']+)(")/g, (_m, q1, val, q2) => `${'data-src=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
        .replace(/data-src=(\')([^"']+)(\')/g, (_m, q1, val, q2) => `${'data-src=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
        .replace(/data-background(?:-image)?=(")([^"']+)(")/g, (_m, q1, val, q2) => `${'data-background=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`)
        .replace(/data-background(?:-image)?=(\')([^"']+)(\')/g, (_m, q1, val, q2) => `${'data-background=' + q1}${val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/')}${q2}`);
      return out;
    };

    head = rewriteAssets(head);
    header = rewriteAssets(header);
    footer = rewriteAssets(footer);
    caseHtml = rewriteAssets(caseHtml);

    const doc = `<!DOCTYPE html>
<html lang="ru">
${head}
<body class="cases-page">
${header}
${caseHtml}
${footer}
<script type="text/javascript" src="/legacy/js/jquery.min.js"></script>
<!-- Owl Carousel удален - используем нативные карусели -->
<script type="text/javascript" src="/legacy/js/app.min.js"></script>
</body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(doc);
    iframeDoc.close();

    // Intercept link clicks in iframe for SPA navigation
    iframeDoc.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href) {
        const url = new URL(link.href);
        if (url.origin === window.location.origin && url.pathname !== '/admin') {
          e.preventDefault();
          window.parent.postMessage({ type: 'navigate', path: url.pathname }, '*');
        }
      }
    });
  }, [caseData, partials]);

  if (isLoading || loadingPartials) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!caseData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <p>Кейс не найден</p>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', border: 'none' }}>
      <iframe
        ref={iframeRef}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Case Preview"
      />
    </Box>
  );
}


