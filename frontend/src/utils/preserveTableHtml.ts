/**
 * Сохраняет таблицы и другие интерактивные элементы при обработке HTML
 * Оборачивает голые таблицы в div.article-table для правильного рендеринга
 * Преобразует опросы и чек-листы в правильную структуру
 */
export function preserveTableHtml(html: string): string {
  if (!html) return '';
  
  // Оборачиваем голые таблицы в div.article-table
  // Паттерн: <table> без обертки в article-table
  let processed = html;
  
  // DEBUG: логируем для отладки (только в dev режиме)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    const hasPoll = /Опрос[:\s]+/i.test(processed);
    if (hasPoll) {
      console.log('[preserveTableHtml] Найден опрос в HTML, длина:', processed.length);
    }
  }
  
  // Находим все <table>, которые не внутри <div class="article-table">
  processed = processed.replace(
    /<table([^>]*)>([\s\S]*?)<\/table>/gi,
    (match, attrs, content) => {
      // Проверяем, не обернута ли таблица уже в article-table
      const beforeMatch = processed.substring(0, processed.indexOf(match));
      const lastDivOpen = beforeMatch.lastIndexOf('<div');
      const lastDivClose = beforeMatch.lastIndexOf('</div>');
      
      // Если есть открывающий div перед таблицей и нет закрывающего после него
      if (lastDivOpen > lastDivClose && lastDivOpen > -1) {
        const divContent = processed.substring(lastDivOpen);
        // Проверяем, не является ли это article-table
        if (divContent.match(/class=["']([^"']*\s+)?article-table([\s"']|$)/i)) {
          // Уже обернута, не трогаем
          return match;
        }
      }
      
      // Если таблица не обернута - оборачиваем
      // Но только если она действительно не внутри article-table
      const context = processed.substring(Math.max(0, processed.indexOf(match) - 500), processed.indexOf(match));
      if (!context.match(/<div[^>]*class=["'][^"']*article-table[^"']*["'][^>]*>/i)) {
        return `<div class="article-table"><table${attrs}>${content}</table></div>`;
      }
      
      return match;
    }
  );
  
  // Оборачиваем опросы и квизы в article-poll
  // Паттерн 1: Текст в <p> с "Опрос:" или "Опрос" и вариантами через " - "
  // Пример: <p>Опрос: Что автоматизировать первым? - A) Чат-боты (50%) - B) Рекламу (30%) - C) Анализ (20%) [Ваши ответы]</p>
  // Используем более простой паттерн - ищем любые <p> содержащие "Опрос" и минимум 2 варианта A), B), C)
  processed = processed.replace(
    /<p[^>]*>([^<]*(?:Опрос|опрос)[:\s]+[^<]*(?:-\s+[ABC][\)\.][^<]+){2,}[^<]*)<\/p>/gi,
    (match, content, offset) => {
      // Пропускаем, если уже внутри article-poll
      const context = processed.substring(0, offset);
      if (context.match(/<div[^>]*class=["'][^"']*article-poll[^"']*["'][^>]*>[\s\S]*$/i)) {
        return match;
      }
      
      // Убираем [текст в квадратных скобках] в конце, если есть
      const cleanContent = content.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
      
      // Извлекаем заголовок (до первого " - ")
      const titleMatch = cleanContent.match(/(?:Опрос|опрос)[:\s]+([^-]+?)(?:\s*-\s*)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Опрос';
      
      // Извлекаем варианты ответов через split по " - " (с пробелами)
      // Важно: используем именно " - " (дефис с пробелами), чтобы не разбивать слова с дефисами
      const parts = cleanContent.split(/\s+-\s+/);
      const items: string[] = [];
      
      // Первая часть - заголовок, остальные - варианты ответов
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        // Проверяем, что это вариант ответа (начинается с A, B или C)
        if (part.match(/^[ABC][\)\.]\s*/i)) {
          items.push(part);
        }
      }
      
      if (items.length >= 2) {
        const pollItems = items.map(item => `    <li class="poll-item">${item}</li>`).join('\n');
        const result = `<div class="article-poll">
  <h3>${title}</h3>
  <ul>
${pollItems}
  </ul>
</div>`;
        
        // DEBUG логирование
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          console.log('[preserveTableHtml] ✅ Опрос обработан:', { title, itemsCount: items.length });
        }
        
        return result;
      }
      
      // DEBUG: если не обработано
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn('[preserveTableHtml] ⚠️ Опрос не обработан:', { 
          content: content.substring(0, 100), 
          partsCount: parts.length,
          itemsFound: items.length 
        });
      }
      
      return match;
    }
  );
  
  // Паттерн 2: <p> с <strong>Опрос</strong> и вариантами через <br>
  processed = processed.replace(
    /<p[^>]*>.*?<strong[^>]*>.*?(?:Опрос|опрос|опросник|квиз)[^<]*<\/strong>[^<]*<br\s*\/?>\s*(?:[-•]\s*[ABC]\)?[^<]*<br\s*\/?>)+[^<]*<\/p>/gi,
    (match) => {
      const context = processed.substring(0, processed.indexOf(match));
      if (context.match(/<div[^>]*class=["'][^"']*article-poll[^"']*["'][^>]*>[\s\S]*$/i)) {
        return match;
      }
      
      // Извлекаем заголовок опроса
      const strongMatch = match.match(/<strong[^>]*>(.*?)<\/strong>/i);
      const title = strongMatch ? strongMatch[1].replace(/[Опрос|опрос|опросник|квиз]:?\s*/i, '').trim() : 'Опрос';
      
      // Извлекаем варианты ответов
      const options = match.match(/(?:[-•]\s*)([ABC]\)?\s*[^<\n]*)/gi) || [];
      const items = options.map(opt => opt.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
      
      if (items.length > 0) {
        const pollItems = items.map(item => `    <li class="poll-item">${item}</li>`).join('\n');
        return `<div class="article-poll">
  <h3>${title}</h3>
  <ul>
${pollItems}
  </ul>
</div>`;
      }
      
      return match;
    }
  );
  
  // Оборачиваем существующие <ul> с poll-item, если они не внутри article-poll
  processed = processed.replace(
    /<ul[^>]*>([\s\S]*?<li[^>]*class=["'][^"']*poll-item[^"']*["'][^>]*>[\s\S]*?)<\/ul>/gi,
    (match, content, offset) => {
      // Проверяем, не внутри article-poll уже
      const beforeMatch = processed.substring(Math.max(0, offset - 200), offset);
      if (beforeMatch.match(/<div[^>]*class=["'][^"']*article-poll[^"']*["'][^>]*>/i)) {
        return match; // Уже обернута
      }
      
      // Извлекаем заголовок из предыдущего контекста (h3 или strong)
      const context = processed.substring(Math.max(0, offset - 100), offset);
      const h3Match = context.match(/<h3[^>]*>(.*?)<\/h3>/i);
      const strongMatch = context.match(/<strong[^>]*>(.*?)<\/strong>/i);
      const title = (h3Match && h3Match[1]) || (strongMatch && strongMatch[1]) || 'Опрос';
      
      return `<div class="article-poll">
  <h3>${title}</h3>
  <ul>${content}</ul>
</div>`;
    }
  );
  
  // Проверяем существующие div.article-poll - если ul не имеет poll-item класса на li
  processed = processed.replace(
    /<div[^>]*class=["'][^"']*article-poll[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    (match, innerContent) => {
      // Если внутри есть <ul> но <li> без класса poll-item - добавляем класс
      if (innerContent.includes('<ul') && !innerContent.match(/class=["'][^"']*poll-item[^"']*["']/)) {
        const fixedContent = innerContent.replace(
          /<li([^>]*)>/gi,
          (liMatch, attrs) => {
            if (!attrs.match(/class=/)) {
              return `<li class="poll-item"${attrs}>`;
            } else if (!attrs.match(/class=["'][^"']*poll-item[^"']*["']/)) {
              return `<li${attrs} class="poll-item">`;
            }
            return liMatch;
          }
        );
        return match.replace(innerContent, fixedContent);
      }
      return match;
    }
  );
  
  return processed;
}
