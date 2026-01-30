import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Экспорт коммерческого предложения в PDF
 */
export async function exportProposalToPDF(containerId: string, filename: string = 'commercial-proposal.pdf'): Promise<void> {
  console.log('[exportProposalToPDF] Начало функции, containerId:', containerId);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[exportProposalToPDF] Контейнер не найден:', containerId);
    throw new Error(`Container with id "${containerId}" not found`);
  }

  console.log('[exportProposalToPDF] Контейнер найден, размеры:', {
    width: container.offsetWidth,
    height: container.offsetHeight,
    scrollHeight: container.scrollHeight,
  });

  // Скрываем все элементы, которые не должны быть в PDF
  const hiddenElements: HTMLElement[] = [];
  container.querySelectorAll('[data-no-export]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    hiddenElements.push(htmlEl);
    htmlEl.style.display = 'none';
  });

  try {
    // Определяем тему (dark/light) на основе классов документа
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                   document.body.classList.contains('dark-theme') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
    
    const bgColor = isDark ? '#141414' : '#ffffff';
    console.log('[exportProposalToPDF] Определена тема:', isDark ? 'dark' : 'light', 'bgColor:', bgColor);
    
    console.log('[exportProposalToPDF] Создание PDF документа...');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pdfWidth - 2 * margin;
    const contentHeight = pdfHeight - 2 * margin;

    // Разбиваем контент на слайды (каждый слайд на отдельной странице)
    const slides = container.querySelectorAll('[data-slide]');
    console.log('[exportProposalToPDF] Найдено слайдов:', slides.length);
    
    if (slides.length === 0) {
      console.log('[exportProposalToPDF] Слайды не найдены, экспортирую весь контент...');
      // Если нет слайдов, экспортируем весь контент как одну картинку
      console.log('[exportProposalToPDF] Создание canvas из контейнера...');
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: bgColor,
        allowTaint: false,
        removeContainer: false,
      });
      console.log('[exportProposalToPDF] Canvas создан, размеры:', canvas.width, 'x', canvas.height);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      const totalPages = Math.ceil(imgScaledHeight / contentHeight);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const yPos = margin - i * contentHeight;
        pdf.addImage(imgData, 'PNG', margin, yPos, imgScaledWidth, imgScaledHeight);
      }
    } else {
      // Экспортируем каждый слайд отдельно
      console.log('[exportProposalToPDF] Начинаю экспорт слайдов...');
      for (let i = 0; i < slides.length; i++) {
        console.log(`[exportProposalToPDF] Обработка слайда ${i + 1} из ${slides.length}...`);
        if (i > 0) {
          pdf.addPage();
        }

        const slide = slides[i] as HTMLElement;
        console.log(`[exportProposalToPDF] Создание canvas для слайда ${i + 1}, размеры:`, {
          width: slide.offsetWidth,
          height: slide.offsetHeight,
          scrollHeight: slide.scrollHeight,
        });
        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: bgColor,
          allowTaint: false,
          removeContainer: false,
        });
        console.log(`[exportProposalToPDF] Canvas для слайда ${i + 1} создан:`, canvas.width, 'x', canvas.height);

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
        const imgScaledWidth = imgWidth * ratio;
        const imgScaledHeight = imgHeight * ratio;

        // Центрируем изображение на странице
        const xPos = margin + (contentWidth - imgScaledWidth) / 2;
        const yPos = margin + (contentHeight - imgScaledHeight) / 2;

        pdf.addImage(imgData, 'PNG', xPos, yPos, imgScaledWidth, imgScaledHeight);
        console.log(`[exportProposalToPDF] Слайд ${i + 1} добавлен в PDF`);
      }
    }

    console.log('[exportProposalToPDF] Сохранение PDF файла:', filename);
    pdf.save(filename);
    console.log('[exportProposalToPDF] PDF файл сохранен');
  } finally {
    // Восстанавливаем скрытые элементы
    hiddenElements.forEach((el) => {
      el.style.display = '';
    });
  }
}

/**
 * Экспорт коммерческого предложения в PNG
 */
export async function exportProposalToPNG(containerId: string, filename: string = 'commercial-proposal.png'): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  const hiddenElements: HTMLElement[] = [];
  container.querySelectorAll('[data-no-export]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    hiddenElements.push(htmlEl);
    htmlEl.style.display = 'none';
  });

  try {
    // Определяем тему для PNG
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                   document.body.classList.contains('dark-theme') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#141414' : '#ffffff';
    
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: bgColor,
    });

    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    hiddenElements.forEach((el) => {
      el.style.display = '';
    });
  }
}

/**
 * Экспорт коммерческого предложения в HTML
 */
export function exportProposalToHTML(containerId: string, filename: string = 'commercial-proposal.html'): void {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  // Клонируем контейнер, чтобы не изменять оригинал
  const clone = container.cloneNode(true) as HTMLElement;
  
  // Удаляем элементы, которые не должны быть в экспорте
  clone.querySelectorAll('[data-no-export]').forEach((el) => el.remove());

  // Создаем полноценный HTML документ
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Коммерческое предложение</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    ${Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n')}
  </style>
</head>
<body>
  ${clone.innerHTML}
</body>
</html>
  `;

  // Создаем ссылку для скачивания
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

