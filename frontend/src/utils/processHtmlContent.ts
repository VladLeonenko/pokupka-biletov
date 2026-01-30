/**
 * Обрабатывает HTML контент, заменяя пути к изображениям и ресурсам
 */
export function processHtmlContent(html: string): string {
  if (!html) return '';

  let processed = html
    // Удаляем @@include
    .replace(/<!--\s*@@include\([^)]*\)\s*-->/gi, '')
    .replace(/@@include\([^)]*\)/gi, '')
    // Заменяем @img/ на /legacy/img/
    .replace(/(src|href)=(")@img\//g, '$1=$2/legacy/img/')
    .replace(/(src|href)=(\')@img\//g, '$1=$2/legacy/img/')
    .replace(/url\((['"])@img\//g, 'url($1/legacy/img/')
    .replace(/@img\//g, '/legacy/img/')
    // Относительные пути к абсолютным
    .replace(/href=(")\.\.\/([^"'\s]+)(")/g, 'href=$1/$2$3')
    .replace(/href=(\')\.\.\/([^"'\s]+)(\')/g, 'href=$1/$2$3')
    // Изображения
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
    // CSS файлы
    .replace(/href=(")\.\.\/css\//g, 'href=$1/legacy/css/')
    .replace(/href=(\')\.\.\/css\//g, 'href=$1/legacy/css/')
    .replace(/href=(")css\//g, 'href=$1/legacy/css/')
    .replace(/href=(\')css\//g, 'href=$1/legacy/css/')
    .replace(/href=(")\/css\//g, 'href=$1/legacy/css/')
    .replace(/href=(\')\/css\//g, 'href=$1/legacy/css/')
    // JS файлы
    .replace(/src=(")\.\.\/js\//g, 'src=$1/legacy/js/')
    .replace(/src=(\')\.\.\/js\//g, 'src=$1/legacy/js/')
    .replace(/src=(")js\//g, 'src=$1/legacy/js/')
    .replace(/src=(\')js\//g, 'src=$1/legacy/js/')
    .replace(/src=(")\/js\//g, 'src=$1/legacy/js/')
    .replace(/src=(\')\/js\//g, 'src=$1/legacy/js/')
    // data-src и data-background
    .replace(/data-src=(")([^"']+)(")/g, (_m, q1, val, q2) => {
      const fixed = val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/');
      return `data-src=${q1}${fixed}${q2}`;
    })
    .replace(/data-src=(\')([^"']+)(\')/g, (_m, q1, val, q2) => {
      const fixed = val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/');
      return `data-src=${q1}${fixed}${q2}`;
    })
    .replace(/data-background(?:-image)?=(")([^"']+)(")/g, (_m, q1, val, q2) => {
      const fixed = val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/');
      return `data-background=${q1}${fixed}${q2}`;
    })
    .replace(/data-background(?:-image)?=(\')([^"']+)(\')/g, (_m, q1, val, q2) => {
      const fixed = val.replace(/^(@img\/|(?:\.{1,2}\/|\/)?img\/)/, '/legacy/img/');
      return `data-background=${q1}${fixed}${q2}`;
    });

  return processed;
}

