/**
 * Утилита для динамического обновления фавиконки с анимацией и счетчиком уведомлений
 */

const DEFAULT_FAVICON = '/favicon.ico';
let animationFrameId: number | null = null;
let originalFaviconHref: string | null = null;
let isAnimating = false;
let canvasCache: HTMLCanvasElement | null = null;

/**
 * Получает оригинальную фавиконку или создает базовую
 */
function getOriginalFavicon(): string {
  if (originalFaviconHref) {
    return originalFaviconHref;
  }

  const link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  if (link && link.href) {
    originalFaviconHref = link.href;
    return link.href;
  }

  return DEFAULT_FAVICON;
}

/**
 * Создает canvas для рисования фавиконки
 */
function createCanvas(): HTMLCanvasElement {
  if (canvasCache) {
    return canvasCache;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  canvasCache = canvas;
  return canvas;
}

/**
 * Создает простую базовую иконку
 */
function createDefaultIcon(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 16, 16);
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL();
  });
}

/**
 * Загружает изображение фавиконки
 */
function loadFaviconImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    // Если это data URL или blob URL, загружаем без crossOrigin
    const isDataUrl = src.startsWith('data:') || src.startsWith('blob:');
    
    const img = new Image();
    
    // Для внешних ресурсов может понадобиться crossOrigin, но это может вызвать CORS ошибки
    // Лучше не использовать, если фавиконка на том же домене
    if (!isDataUrl && src.startsWith('http')) {
      // Пробуем загрузить с crossOrigin, но если не получится - fallback на простую иконку
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => resolve(img);
    img.onerror = async () => {
      // Если не удалось загрузить, используем простую иконку
      const defaultIcon = await createDefaultIcon();
      resolve(defaultIcon);
    };
    
    img.src = src;
  });
}

/**
 * Рисует фавиконку с счетчиком уведомлений
 */
async function drawFaviconWithBadge(count: number, animated: boolean = false): Promise<string> {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d')!;
  
  // Очищаем canvas
  ctx.clearRect(0, 0, 32, 32);
  
  // Загружаем оригинальную фавиконку
  const originalFavicon = getOriginalFavicon();
  const img = await loadFaviconImage(originalFavicon);
  
  // Рисуем оригинальную фавиконку
  ctx.drawImage(img, 0, 0, 32, 32);
  
  if (count > 0) {
    // Рисуем красный кружок-бейдж
    const badgeSize = count > 9 ? 18 : 16;
    const badgeX = 32 - badgeSize - 2;
    const badgeY = 2;
    
    // Анимация пульсации
    let scale = 1;
    if (animated) {
      const time = Date.now() / 300; // Скорость анимации
      scale = 1 + Math.sin(time) * 0.1; // Пульсация от 0.9 до 1.1
    }
    
    const centerX = badgeX + badgeSize / 2;
    const centerY = badgeY + badgeSize / 2;
    const radius = (badgeSize / 2) * scale;
    
    // Рисуем красный кружок
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка для лучшей видимости
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Рисуем текст с количеством
    ctx.fillStyle = '#ffffff';
    ctx.font = count > 9 ? 'bold 10px Arial' : 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = count > 99 ? '99+' : count.toString();
    ctx.fillText(text, centerX, centerY);
  }
  
  return canvas.toDataURL();
}

/**
 * Обновляет фавиконку в DOM
 */
function updateFavicon(dataUrl: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link.href = dataUrl;
}

/**
 * Устанавливает фавиконку с анимацией и счетчиком
 */
export function setFaviconWithNotificationCount(count: number, animated: boolean = false): void {
  if (count === 0) {
    // Если уведомлений нет, возвращаем оригинальную фавиконку
    stopAnimation();
    const originalFavicon = getOriginalFavicon();
    updateFavicon(originalFavicon);
    return;
  }
  
  // Если анимация не нужна, останавливаем её
  if (!animated && isAnimating) {
    stopAnimation();
  }
  
  // Рисуем фавиконку с бейджем
  drawFaviconWithBadge(count, animated)
    .then(dataUrl => {
      updateFavicon(dataUrl);
      
      // Если нужна анимация и она еще не запущена, запускаем
      if (animated && !isAnimating) {
        startAnimation(count);
      }
    })
    .catch(err => {
      console.error('Ошибка обновления фавиконки:', err);
    });
}

/**
 * Запускает анимацию фавиконки
 */
function startAnimation(count: number): void {
  if (isAnimating) return;
  
  isAnimating = true;
  let frame = 0;
  
  const animate = () => {
    if (!isAnimating) return;
    
    frame++;
    // Обновляем фавиконку каждые 3 кадра для плавной анимации
    if (frame % 3 === 0) {
      drawFaviconWithBadge(count, true)
        .then(dataUrl => updateFavicon(dataUrl))
        .catch(err => console.error('Ошибка анимации фавиконки:', err));
    }
    
    animationFrameId = requestAnimationFrame(animate);
  };
  
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Останавливает анимацию
 */
function stopAnimation(): void {
  isAnimating = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Сбрасывает фавиконку к оригинальной
 */
export function resetFavicon(): void {
  stopAnimation();
  const originalFavicon = getOriginalFavicon();
  updateFavicon(originalFavicon);
}

