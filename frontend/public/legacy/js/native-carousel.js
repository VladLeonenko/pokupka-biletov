/**
 * Native Carousel Component
 * Замена для owlCarousel и slick без зависимостей
 */

class NativeCarousel {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      console.warn('NativeCarousel: container not found');
      return;
    }

    this.options = {
      autoplay: options.autoplay || false,
      autoplaySpeed: options.autoplaySpeed || 3000,
      speed: options.speed || 500,
      loop: options.loop !== undefined ? options.loop : true,
      margin: options.margin || 30,
      items: options.items || 1,
      nav: options.nav !== undefined ? options.nav : true,
      dots: options.dots !== undefined ? options.dots : true,
      center: options.center || false,
      vertical: options.vertical || false,
      slidesToShow: options.slidesToShow || 1,
      slidesToScroll: options.slidesToScroll || 1,
      centerPadding: options.centerPadding || '0px',
      responsive: options.responsive || {},
      ...options
    };

    this.currentIndex = 0;
    this.isTransitioning = false;
    this.autoplayInterval = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.clonesBefore = 0;
    this.clonesAfter = 0;

    this.init();
  }

  init() {
    console.log('[Carousel] init() called for container:', this.container);
    
    // Создаем структуру карусели
    this.wrapper = this.container.querySelector('.carousel-wrapper') || this.createWrapper();
    this.track = this.wrapper.querySelector('.carousel-track') || this.createTrack();
    this.items = Array.from(this.track.children);

    console.log('[Carousel] init - items found:', {
      itemsCount: this.items.length,
      trackChildren: this.track.children.length,
      itemsContent: this.items.map((item, idx) => ({
        index: idx,
        text: item.textContent?.trim().substring(0, 50) || 'empty',
        classes: item.classList.toString(),
        tagName: item.tagName
      })),
      trackHTML: this.track.innerHTML.substring(0, 200)
    });

    if (this.items.length === 0) {
      console.warn('NativeCarousel: no items found', {
        container: this.container,
        wrapper: this.wrapper,
        track: this.track,
        trackHTML: this.track?.innerHTML?.substring(0, 500)
      });
      return;
    }

    // Применяем стили
    this.applyStyles();

    // Клонируем элементы для бесшовного цикла
    // Для вертикальной карусели всегда клонируем для бесконечного цикла
    // ПЕРЕСЧИТЫВАЕМ элементы перед клонированием - возможно они добавились динамически
    const currentTrackItems = Array.from(this.track.children).filter(item => !item.classList.contains('carousel-clone'));
    if (currentTrackItems.length !== this.items.length) {
      console.warn('[Carousel] Items count mismatch! Recalculating...', {
        oldCount: this.items.length,
        newCount: currentTrackItems.length,
        oldItems: this.items.map(item => item.textContent?.trim().substring(0, 30) || 'empty'),
        newItems: currentTrackItems.map(item => item.textContent?.trim().substring(0, 30) || 'empty')
      });
      this.items = currentTrackItems;
    }
    
    // Проверяем, что элементы есть в DOM перед клонированием
    if (this.items.length === 0) {
      console.error('[Carousel] ERROR: No items to clone! Items array is empty.', {
        track: this.track,
        trackChildren: this.track?.children.length,
        container: this.container,
        trackHTML: this.track?.innerHTML?.substring(0, 500)
      });
    }
    
    console.log('[Carousel] Clone check before:', {
      loop: this.options.loop,
      vertical: this.options.vertical,
      itemsLength: this.items.length,
      visibleItems: this.getVisibleItems(),
      shouldClone: this.options.loop && (this.options.vertical || this.items.length > this.getVisibleItems()),
      trackExists: !!this.track,
      trackChildren: this.track?.children.length,
      itemsInTrack: Array.from(this.track?.children || []).length
    });
    
    if (this.options.loop && (this.options.vertical || this.items.length > this.getVisibleItems())) {
      if (this.items.length === 0) {
        console.error('[Carousel] ERROR: Cannot clone - no items available!');
        return;
      }
      
      const itemsBeforeClone = this.items.length;
      console.log('[Carousel] Starting cloneItems, items before:', itemsBeforeClone);
      
      this.cloneItems();
      
      // Обновляем список элементов после клонирования
      // ВАЖНО: this.items должен содержать ВСЕ элементы (и клоны, и оригиналы) для правильной работы handleInfiniteLoop
      this.items = Array.from(this.track.children);
      
      console.log('[Carousel] Items updated after cloning:', {
        totalItems: this.items.length,
        clonesBefore: this.clonesBefore,
        clonesAfter: this.clonesAfter,
        realItemsCount: this.items.filter(item => !item.classList.contains('carousel-clone')).length
      });
      
      // Отладка: проверяем количество клонов
      const allItemsAfterClone = Array.from(this.track.children);
      const clones = allItemsAfterClone.filter(item => item.classList.contains('carousel-clone'));
      const realItemsCount = allItemsAfterClone.length - clones.length;
      
      console.log('[Carousel] After cloneItems:', {
        itemsBeforeClone: itemsBeforeClone,
        totalItems: allItemsAfterClone.length,
        clones: clones.length,
        realItems: realItemsCount,
        clonesBefore: this.clonesBefore,
        clonesAfter: this.clonesAfter,
        hasClones: clones.length > 0,
        firstItemClasses: allItemsAfterClone[0]?.classList.toString(),
        lastItemClasses: allItemsAfterClone[allItemsAfterClone.length - 1]?.classList.toString()
      });
      
      // Проверяем, что клоны действительно в DOM
      if (clones.length === 0) {
        console.error('[Carousel] ERROR: No clones found after cloneItems!', {
          trackHTML: this.track.innerHTML.substring(0, 500),
          allItemsClasses: allItemsAfterClone.map(item => item.classList.toString()).slice(0, 10)
        });
      }
    } else {
      console.warn('[Carousel] Cloning skipped:', {
        loop: this.options.loop,
        vertical: this.options.vertical,
        itemsLength: this.items.length,
        visibleItems: this.getVisibleItems(),
        condition: this.options.loop && (this.options.vertical || this.items.length > this.getVisibleItems())
      });
    }

    // Создаем навигацию
    if (this.options.nav) {
      this.createNavigation();
    }
    if (this.options.dots) {
      this.createDots();
    }

    // Обработчики событий
    this.setupEventListeners();

    // Автопрокрутка
    if (this.options.autoplay) {
      this.startAutoplay();
    }

    // Устанавливаем начальную позицию
    // Для вертикальной карусели просто переходим к первому элементу с правильным центрированием
    console.log('[Carousel] Setting initial position:', {
      loop: this.options.loop,
      clonesBefore: this.clonesBefore,
      clonesAfter: this.clonesAfter,
      vertical: this.options.vertical,
      itemsCount: this.items.length,
      trackChildren: this.track.children.length,
      firstItemIsClone: this.track.children[0]?.classList.contains('carousel-clone'),
      lastItemIsClone: this.track.children[this.track.children.length - 1]?.classList.contains('carousel-clone'),
      firstItemText: this.track.children[0]?.textContent?.trim().substring(0, 30),
      lastItemText: this.track.children[this.track.children.length - 1]?.textContent?.trim().substring(0, 30)
    });
    
    if (this.options.loop && this.clonesBefore > 0 && this.options.vertical) {
      // Для вертикальной карусели начинаем с первого реального элемента
      // goTo правильно рассчитает центрирование с учетом clonesBefore
      this.currentIndex = 0;
      this.goTo(0, false);
    } else if (this.options.loop && this.clonesBefore > 0) {
      // Устанавливаем позицию на первый реальный элемент (после клонов)
      this.currentIndex = 0;
      this.goTo(0, false);
    } else {
      this.goTo(0, false);
    }
  }

  createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-wrapper';
    this.container.appendChild(wrapper);
    return wrapper;
  }

  createTrack() {
    const track = document.createElement('div');
    track.className = 'carousel-track';
    // Перемещаем существующие элементы в track
    while (this.container.firstChild && this.container.firstChild !== this.wrapper) {
      track.appendChild(this.container.firstChild);
    }
    if (this.wrapper) {
      this.wrapper.appendChild(track);
    }
    return track;
  }

  applyStyles() {
    // Стили для контейнера
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // Стили для wrapper
    this.wrapper.style.position = 'relative';
    this.wrapper.style.width = '100%';
    this.wrapper.style.overflow = 'hidden';
    
    // Стили для track
    this.track.style.display = 'flex';
    this.track.style.transition = `transform ${this.options.speed}ms ease`;
    this.track.style.willChange = 'transform';

    if (this.options.vertical) {
      this.track.style.flexDirection = 'column';
      // Для вертикальной карусели высота track будет автоматической (все элементы)
      this.track.style.height = 'auto';
      this.track.style.alignItems = 'center';
      this.track.style.justifyContent = 'center';
      
      // Синхронизируем высоту с соседним блоком
      this.syncHeightWithSibling();
      
      // Устанавливаем высоту wrapper и container на основе видимых элементов
      const visibleItems = this.getVisibleItems();
      if (this.items.length > 0 && visibleItems > 0) {
        // Ждем загрузки изображений для правильного расчета высоты
        setTimeout(() => {
          this.syncHeightWithSibling();
          // Пересчитываем позицию после установки высоты
          this.goTo(this.currentIndex, false);
        }, 100);
        
        // Также синхронизируем после полной загрузки страницы
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => this.syncHeightWithSibling(), 200);
          });
        } else {
          setTimeout(() => this.syncHeightWithSibling(), 200);
        }
        
        // Синхронизируем при изменении размера окна
        window.addEventListener('resize', () => {
          this.syncHeightWithSibling();
          this.goTo(this.currentIndex, false);
        });
      } else {
        // Центрируем контент сразу, даже если высота еще не известна
        this.wrapper.style.display = 'flex';
        this.wrapper.style.alignItems = 'center';
        this.wrapper.style.justifyContent = 'center';
      }
    } else {
      this.track.style.flexDirection = 'row';
    }

    // Стили для элементов
    this.items.forEach((item, index) => {
      item.style.flexShrink = '0';
      if (this.options.vertical) {
        item.style.width = '100%';
      } else {
        const itemWidth = this.calculateItemWidth();
        item.style.width = itemWidth + 'px';
      }
      if (this.options.vertical) {
        // Для вертикальной карусели устанавливаем margin-bottom в 1em
        if (index < this.items.length - 1) {
          item.style.marginBottom = '1em';
        } else {
          item.style.marginBottom = '0';
        }
      } else {
        // Для горизонтальной карусели используем настройку margin
        if (this.options.margin && index < this.items.length - 1) {
          item.style.marginRight = this.options.margin + 'px';
        }
      }
    });
  }

  calculateItemWidth() {
    const containerWidth = this.container.offsetWidth;
    const visibleItems = this.getVisibleItems();
    const totalMargin = this.options.margin ? (visibleItems - 1) * this.options.margin : 0;
    return (containerWidth - totalMargin) / visibleItems;
  }

  getVisibleItems() {
    // Проверяем responsive breakpoints
    const width = window.innerWidth;
    if (this.options.responsive) {
      const breakpoints = Object.keys(this.options.responsive)
        .map(Number)
        .sort((a, b) => b - a);
      
      for (const breakpoint of breakpoints) {
        if (width >= breakpoint) {
          return this.options.responsive[breakpoint].items || this.options.items;
        }
      }
    }
    return this.options.items || 1;
  }

  cloneItems() {
    const visibleItems = this.getVisibleItems();
    // Для бесконечной карусели клонируем все элементы в начало и конец
    // Это обеспечит бесшовный цикл без резких скачков
    // Для вертикальной карусели клонируем элементы несколько раз для плавного бесконечного цикла
    const itemsToClone = this.options.vertical ? this.items.length * 2 : Math.max(visibleItems, this.items.length);
    
    console.log('[Carousel] cloneItems called:', {
      visibleItems: visibleItems,
      itemsLength: this.items.length,
      itemsToClone: itemsToClone,
      vertical: this.options.vertical,
      trackChildrenBefore: this.track.children.length,
      itemsContent: this.items.map((item, idx) => ({
        index: idx,
        text: item.textContent?.trim().substring(0, 30) || 'empty',
        classes: item.classList.toString()
      }))
    });
    
    // Сохраняем оригинальные элементы перед клонированием
    const originalItems = [...this.items];
    
    if (originalItems.length === 0) {
      console.error('[Carousel] ERROR: No items to clone!');
      return;
    }
    
    // Сохраняем ссылку на первый оригинальный элемент ДО клонирования
    const firstOriginalItem = originalItems[0];
    
    let clonesBeforeCount = 0;
    let clonesAfterCount = 0;
    
    // НОВАЯ ЛОГИКА: для вертикальной карусели НЕ создаем клоны в начале
    // Клоны в начале не нужны, так как прокрутка только вниз
    // Когда доходим до клонов в конце, перепрыгиваем на начало реальных элементов
    if (!this.options.vertical) {
      // Для горизонтальной карусели оставляем старую логику с клонами в начале и конце
      // Клонируем все элементы в начало в обратном порядке (для прокрутки назад)
      for (let i = 0; i < itemsToClone; i++) {
        const sourceIndex = (originalItems.length - 1 - (i % originalItems.length) + originalItems.length) % originalItems.length;
        const sourceItem = originalItems[sourceIndex];
        
        if (!sourceItem) {
          console.error('[Carousel] ERROR: Source item not found!', { sourceIndex, originalItemsLength: originalItems.length });
          continue;
        }
        
        const clone = sourceItem.cloneNode(true);
        clone.classList.add('carousel-clone');
        this.track.insertBefore(clone, firstOriginalItem);
        clonesBeforeCount++;
      }
    } else {
      // Для вертикальной карусели клоны в начале не нужны
      console.log('[Carousel] Skipping clones before for vertical carousel - only forward movement');
    }
    
    // Клонируем все элементы в конец в прямом порядке (для прокрутки вперед)
    // Для вертикальной карусели клонируем полный набор элементов дважды
    console.log('[Carousel] Starting clones after, itemsToClone:', itemsToClone, 'originalItems.length:', originalItems.length);
    for (let i = 0; i < itemsToClone; i++) {
      // Клонируем все элементы по кругу, начиная с первого
      const sourceIndex = i % originalItems.length;
      const sourceItem = originalItems[sourceIndex];
      
      if (!sourceItem) {
        console.error('[Carousel] ERROR: Source item not found!', { 
          i,
          sourceIndex, 
          originalItemsLength: originalItems.length,
          originalItems: originalItems.map((item, idx) => ({
            idx,
            exists: !!item,
            text: item?.textContent?.trim().substring(0, 30) || 'empty'
          }))
        });
        continue;
      }
      
      const clone = sourceItem.cloneNode(true);
      clone.classList.add('carousel-clone');
      this.track.appendChild(clone);
      clonesAfterCount++;
      
      if (i < 5 || i % originalItems.length === 0) {
        console.log('[Carousel] Cloned after:', {
          i,
          sourceIndex,
          sourceText: sourceItem.textContent?.trim().substring(0, 30) || 'empty',
          clonesAfterCount
        });
      }
    }
    
    // Сохраняем количество клонов для правильного расчета позиций
    this.clonesBefore = clonesBeforeCount;
    this.clonesAfter = clonesAfterCount;
    
    // Проверяем результат
    const allItemsAfter = Array.from(this.track.children);
    const clonesFound = allItemsAfter.filter(item => item.classList.contains('carousel-clone'));
    
    // Проверяем, что все элементы были клонированы
    const clonedContent = new Set();
    clonesFound.forEach(clone => {
      const text = clone.textContent?.trim().substring(0, 30) || 'empty';
      clonedContent.add(text);
    });
    
    console.log('[Carousel] cloneItems completed:', {
      clonesBefore: this.clonesBefore,
      clonesAfter: this.clonesAfter,
      trackChildrenAfter: this.track.children.length,
      expectedTotal: originalItems.length + clonesBeforeCount + clonesAfterCount,
      clonesFound: clonesFound.length,
      uniqueClonedContent: Array.from(clonedContent),
      originalItemsCount: originalItems.length,
      allOriginalContent: originalItems.map(item => item.textContent?.trim().substring(0, 30) || 'empty')
    });
    
    if (clonesFound.length === 0) {
      console.error('[Carousel] ERROR: Clones were created but not found in DOM!', {
        trackHTML: this.track.innerHTML.substring(0, 500),
        allItemsClasses: allItemsAfter.map(item => item.classList.toString())
      });
    }
    
    // Проверяем, что все оригинальные элементы были клонированы
    if (this.options.vertical && itemsToClone >= originalItems.length) {
      const expectedClonesPerItem = Math.floor(itemsToClone / originalItems.length) * 2; // Клоны в начале и в конце
      const actualClonesPerItem = clonesFound.length / originalItems.length;
      if (actualClonesPerItem < expectedClonesPerItem * 0.5) {
        console.warn('[Carousel] WARNING: Not all items were cloned!', {
          expectedClonesPerItem,
          actualClonesPerItem,
          itemsToClone,
          originalItemsLength: originalItems.length
        });
      }
    }
  }

  createNavigation() {
    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav carousel-prev';
    prevBtn.innerHTML = '‹';
    prevBtn.addEventListener('click', () => this.prev());
    this.container.appendChild(prevBtn);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav carousel-next';
    nextBtn.innerHTML = '›';
    nextBtn.addEventListener('click', () => this.next());
    this.container.appendChild(nextBtn);
  }

  createDots() {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    
    const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
    realItems.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => this.goTo(index));
      dotsContainer.appendChild(dot);
    });

    this.container.appendChild(dotsContainer);
    this.dotsContainer = dotsContainer;
  }

  setupEventListeners() {
    // Touch events
    this.track.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.stopAutoplay();
    });

    this.track.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].clientX;
      this.touchEndY = e.changedTouches[0].clientY;
      this.handleSwipe();
      if (this.options.autoplay) {
        this.startAutoplay();
      }
    });

    // Mouse events
    this.track.addEventListener('mousedown', (e) => {
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
      this.stopAutoplay();
    });

    this.track.addEventListener('mouseup', (e) => {
      this.touchEndX = e.clientX;
      this.touchEndY = e.clientY;
      this.handleSwipe();
      if (this.options.autoplay) {
        this.startAutoplay();
      }
    });

    // Pause on hover
    this.container.addEventListener('mouseenter', () => {
      if (this.options.autoplay) {
        this.stopAutoplay();
      }
    });

    this.container.addEventListener('mouseleave', () => {
      if (this.options.autoplay) {
        this.startAutoplay();
      }
    });

    // Responsive
    window.addEventListener('resize', () => {
      this.applyStyles();
      this.goTo(this.currentIndex, false);
    });
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    if (this.options.vertical) {
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          this.prev();
        } else {
          this.next();
        }
      }
    } else {
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.prev();
        } else {
          this.next();
        }
      }
    }
  }

  goTo(index, animate = true) {
    if (this.isTransitioning) return;

    const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
    const maxIndex = realItems.length - 1;
    
    // Округляем индекс до целого числа
    index = Math.round(index);
    
    // Для бесконечной карусели не ограничиваем индекс, но отслеживаем реальный индекс
    let realIndex = index;
    if (index < 0) {
      realIndex = this.options.loop ? ((index % realItems.length) + realItems.length) % realItems.length : 0;
    } else if (index > maxIndex) {
      // ВАЖНО: для бесконечной карусели не ограничиваем индекс здесь
      // handleInfiniteLoop обработает переход за пределы реальных элементов
      if (this.options.loop && this.options.vertical) {
        // Для вертикальной карусели используем реальный индекс для расчета позиции
        // но сохраняем оригинальный индекс для проверки в handleInfiniteLoop
        realIndex = index % realItems.length;
      } else {
        realIndex = this.options.loop ? index % realItems.length : maxIndex;
      }
    } else {
      realIndex = index;
    }
    
    // Убеждаемся, что realIndex целое число
    realIndex = Math.floor(realIndex);

    // Сохраняем оригинальный индекс для проверки в handleInfiniteLoop
    this.currentIndex = Math.floor(index);
    this.isTransitioning = true;

    const visibleItems = this.getVisibleItems();
    let offset = 0;
    
    if (this.options.vertical) {
      // Для вертикальной карусели используем высоту элементов
      const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
      const itemToMeasure = realItems[0] || this.items.find(item => !item.classList.contains('carousel-clone')) || this.items[this.clonesBefore];
      let itemHeight = 0;
      
      if (itemToMeasure) {
        itemHeight = itemToMeasure.offsetHeight;
        if (itemHeight === 0) {
          const rect = itemToMeasure.getBoundingClientRect();
          itemHeight = rect.height || 0;
        }
        // Fallback: если высота еще не известна, используем высоту контейнера
        if (itemHeight === 0 && this.container.offsetHeight > 0) {
          const visibleItems = this.getVisibleItems();
          const margin = this.options.margin || 0;
          itemHeight = (this.container.offsetHeight - (margin * (visibleItems - 1))) / visibleItems;
        }
      }
      
      const margin = this.options.margin || 0;
      const visibleItems = this.getVisibleItems();
      const containerHeight = this.container.offsetHeight || this.wrapper.offsetHeight || 0;
      
      if (containerHeight > 0 && itemHeight > 0) {
        // Для бесконечной карусели учитываем клоны в начале
        // Позиция рассчитывается от начала всех элементов (включая клоны)
        // realIndex - это индекс реального элемента (0..maxIndex)
        // actualPosition - это позиция с учетом клонов в начале
        
        // ВАЖНО: для вертикальной карусели клонов в начале нет (clonesBefore = 0)
        // Первый реальный элемент находится на позиции 0
        // Для горизонтальной карусели учитываем клоны в начале
        const actualPosition = this.clonesBefore + realIndex;
        const oneEmInPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const marginBetweenItems = oneEmInPx; // 1em между элементами
        
        // Позиция верхнего края центрального слайда от начала track
        // Каждый элемент занимает itemHeight + marginBetweenItems
        const itemHeightWithMargin = itemHeight + marginBetweenItems;
        const centerSlideTopPosition = actualPosition * itemHeightWithMargin;
        
        // Вычисляем offset так, чтобы центральный слайд был в центре контейнера
        // Центр контейнера = containerHeight / 2
        // Центр слайда от начала track = centerSlideTopPosition + itemHeight / 2
        // offset должен сдвинуть track так, чтобы центр слайда совпал с центром контейнера
        // translateY с отрицательным значением сдвигает track вверх
        // Формула: offset = центр_контейнера - позиция_центра_слайда
        // Вычисляем offset так, чтобы центральный слайд был в центре контейнера
        // Но с учётом того, что нужно видеть 5 элементов (2 сверху, центральный, 2 снизу)
        // Центр контейнера = containerHeight / 2
        // Центр слайда от начала track = centerSlideTopPosition + itemHeight / 2
        // offset должен сдвинуть track так, чтобы центр слайда совпал с центром контейнера
        // Для видимости всех 5 элементов (2 сверху, центральный, 2 снизу)
        // Центральный слайд должен быть в центре контейнера
        const centerSlideCenter = centerSlideTopPosition + itemHeight / 2;
        // Базовый расчёт для центрирования
        // Смещаем центр на один слайд ниже для правильного отображения
        offset = (containerHeight / 2) - centerSlideCenter + itemHeightWithMargin;
        
        console.log('[Carousel] goTo offset calculation:', {
          realIndex,
          clonesBefore: this.clonesBefore,
          actualPosition,
          centerSlideTopPosition: centerSlideTopPosition.toFixed(2),
          centerSlideCenter: centerSlideCenter.toFixed(2),
          containerHeight,
          itemHeight,
          itemHeightWithMargin,
          offset: offset.toFixed(2),
          totalItems: this.items.length,
          trackChildren: this.track.children.length
        });
        
        // Убраны подробные логи - они создавали шум
      } else {
        // Fallback: если высота еще не известна, используем базовый расчет
        const oneEmInPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const margin = this.options.margin || oneEmInPx;
        const itemHeightWithMargin = (itemHeight || oneEmInPx * 2) + margin;
        const actualPosition = this.clonesBefore + realIndex;
        offset = -(actualPosition * itemHeightWithMargin);
      }
    } else {
      // Для горизонтальной карусели используем ширину
      const itemWidth = this.calculateItemWidth();
      const margin = this.options.margin || 0;
      offset = -(index * (itemWidth + margin));
    }

    if (animate) {
      this.track.style.transition = `transform ${this.options.speed}ms ease`;
    } else {
      this.track.style.transition = 'none';
    }

    if (this.options.vertical) {
      this.track.style.transform = `translateY(${offset}px)`;
    } else {
      this.track.style.transform = `translateX(${offset}px)`;
    }

    // Update dots
    if (this.dotsContainer) {
      const dots = this.dotsContainer.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }
    
      // Для вертикальной карусели обновляем классы active для стилизации
    if (this.options.vertical) {
      const visibleItems = this.getVisibleItems(); // 5 на больших экранах, 3 на маленьких
      const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
      
      // Убираем все позиционные классы со всех элементов
      const allItems = Array.from(this.track.children);
      allItems.forEach(item => {
        item.classList.remove('active', 'center-slide', 'slide-position-1', 'slide-position-2', 'slide-position-3', 'slide-position-4', 'slide-position-5');
      });
      
      // Убеждаемся, что centerIndex целое число
      const centerIndex = Math.floor(this.currentIndex);
      
      // Функция для получения индекса с учётом loop
      const getItemIndex = (offset) => {
        if (this.options.loop) {
          const index = (centerIndex + offset + realItems.length) % realItems.length;
          return Math.floor(index); // Возвращаем целое число
        }
        const idx = centerIndex + offset;
        if (idx < 0 || idx >= realItems.length) return null;
        return Math.floor(idx); // Возвращаем целое число
      };
      
      // Функция для применения классов ко всем копиям элемента (реальным и клонам)
      const applyClassesToAllCopies = (realItem, ...classes) => {
        if (!realItem) return;
        
        // Применяем к реальному элементу
        realItem.classList.add(...classes);
        
        // Находим и применяем ко всем клонам этого элемента
        // Клоны имеют тот же HTML контент, но находятся в разных позициях track
        const realItemContent = realItem.innerHTML.trim();
        allItems.forEach(item => {
          if (item !== realItem && item.innerHTML.trim() === realItemContent) {
            item.classList.add(...classes);
          }
        });
      };
      
      // Адаптивная логика: 5 слайдов на больших экранах, 3 на маленьких
      if (visibleItems === 5) {
        // Для вертикальной карусели с 5 слайдами:
        // - Позиция 1 (верхний, -2 от центра) - opacity 0.3, белый
        // - Позиция 2 (второй сверху, -1 от центра) - opacity 1, белый
        // - Позиция 3 (центральный) - opacity 1, жёлтый
        // - Позиция 4 (четвёртый сверху, +1 от центра) - opacity 1, белый
        // - Позиция 5 (нижний, +2 от центра) - opacity 0.3, белый
        
        const pos1Index = getItemIndex(-2);
        if (pos1Index !== null && realItems[pos1Index]) {
          applyClassesToAllCopies(realItems[pos1Index], 'active', 'slide-position-1');
        }
        
        const pos2Index = getItemIndex(-1);
        if (pos2Index !== null && realItems[pos2Index]) {
          applyClassesToAllCopies(realItems[pos2Index], 'active', 'slide-position-2');
        }
        
        // Центральный слайд
        if (realItems[centerIndex]) {
          applyClassesToAllCopies(realItems[centerIndex], 'active', 'center-slide', 'slide-position-3');
        }
        
        const pos4Index = getItemIndex(1);
        if (pos4Index !== null && realItems[pos4Index]) {
          applyClassesToAllCopies(realItems[pos4Index], 'active', 'slide-position-4');
        }
        
        const pos5Index = getItemIndex(2);
        if (pos5Index !== null && realItems[pos5Index]) {
          applyClassesToAllCopies(realItems[pos5Index], 'active', 'slide-position-5');
        }
      } else if (visibleItems === 3) {
        // Для вертикальной карусели с 3 слайдами:
        // - Позиция 1 (верхний, -1 от центра) - opacity 1, белый
        // - Позиция 2 (центральный) - opacity 1, жёлтый
        // - Позиция 3 (нижний, +1 от центра) - opacity 1, белый
        
        const pos1Index = getItemIndex(-1);
        if (pos1Index !== null && realItems[pos1Index]) {
          applyClassesToAllCopies(realItems[pos1Index], 'active', 'slide-position-1');
        }
        
        // Центральный слайд
        if (realItems[centerIndex]) {
          applyClassesToAllCopies(realItems[centerIndex], 'active', 'center-slide', 'slide-position-2');
        }
        
        const pos3Index = getItemIndex(1);
        if (pos3Index !== null && realItems[pos3Index]) {
          applyClassesToAllCopies(realItems[pos3Index], 'active', 'slide-position-3');
        }
      }
      
      // Убраны подробные логи
      
      // Убрана автоматическая корректировка - она создавала бесконечный цикл
      // Расчёт offset в goTo() должен быть правильным изначально
    }

    // Reset transition flag и проверка бесконечного цикла
    setTimeout(() => {
      this.isTransitioning = false;
      // Для вертикальной карусели проверяем бесконечный цикл после каждой анимации
      if (this.options.loop && this.options.vertical) {
        // Небольшая задержка для завершения анимации
        setTimeout(() => {
          this.handleInfiniteLoop();
        }, 50);
      }
    }, this.options.speed);
  }

  handleInfiniteLoop() {
    const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
    
    if (realItems.length === 0 || !this.options.vertical) return;
    
    // Получаем текущую позицию transform
    const transform = this.track.style.transform;
    const match = transform.match(/translateY\(([^)]+)px\)/);
    if (!match) return;
    
    const currentOffset = parseFloat(match[1]);
    
    // Вычисляем высоту одного элемента
    const realItem = realItems[0];
    let itemHeight = 0;
    if (realItem) {
      itemHeight = realItem.offsetHeight;
      if (itemHeight === 0) {
        const rect = realItem.getBoundingClientRect();
        itemHeight = rect.height || 0;
      }
    }
    if (itemHeight === 0) return;
    
    const oneEmInPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const margin = this.options.margin || oneEmInPx;
    const itemHeightWithMargin = itemHeight + margin;
    
    // Вычисляем текущую позицию в элементах (от начала track)
    // Используем currentIndex, который уже учитывает реальные элементы
    // Позиция = clonesBefore + currentIndex (где currentIndex - индекс реального элемента)
    const currentPosition = this.clonesBefore + this.currentIndex;
    
    // Позиции реальных элементов в track
    const realItemsStart = this.clonesBefore;
    const realItemsEnd = this.clonesBefore + realItems.length;
    
    // Для бесконечной карусели делаем переход когда дошли до клонов в конце
    // Для вертикальной карусели, которая крутится только вниз, проверяем только переход вниз
    // Переход должен происходить когда currentIndex достигает конца реальных элементов
    // и мы начинаем показывать клоны в конце
    
    // Если прокрутили достаточно далеко вниз (дошли до клонов в конце)
    // Проверяем, когда currentIndex достигает или превышает конец реальных элементов
    // realItemsEnd = clonesBefore + realItems.length (позиция после последнего реального элемента)
    // currentPosition = clonesBefore + currentIndex (текущая позиция)
    // Переход должен произойти когда currentPosition >= realItemsEnd (начали показывать клоны в конце)
    
    if (this.currentIndex >= realItems.length) {
      // Вычисляем, на сколько элементов мы прошли за пределы реальных
      const excess = this.currentIndex - realItems.length;
      // Перепрыгиваем на соответствующую позицию в начале реальных элементов
      // Для вертикальной карусели clonesBefore = 0, поэтому newActualPosition = newRealIndex
      const newRealIndex = excess % realItems.length;
      
      // Пересчитываем offset с учётом нового индекса
      // Для вертикальной карусели: newActualPosition = newRealIndex (так как clonesBefore = 0)
      const newActualPosition = this.clonesBefore + newRealIndex;
      const newCenterSlideTopPosition = newActualPosition * itemHeightWithMargin;
      const newCenterSlideCenter = newCenterSlideTopPosition + itemHeight / 2;
      const containerHeight = this.container.offsetHeight || this.wrapper.offsetHeight || 0;
      const newOffset = (containerHeight / 2) - newCenterSlideCenter + itemHeightWithMargin;
      
      console.log('[Carousel] Infinite loop transition:', {
        currentIndex: this.currentIndex,
        currentPosition: currentPosition.toFixed(2),
        realItemsLength: realItems.length,
        realItemsEnd: realItemsEnd,
        threshold: realItems.length,
        excess: excess,
        newRealIndex: newRealIndex,
        newOffset: newOffset.toFixed(2),
        currentOffset: currentOffset.toFixed(2),
        clonesBefore: this.clonesBefore,
        clonesAfter: this.clonesAfter
      });
      
      // Делаем переход без анимации, но только если не в процессе анимации
      if (!this.isTransitioning) {
        // Округляем индекс до целого числа
        const roundedIndex = Math.floor(newRealIndex);
        this.track.style.transition = 'none';
        this.track.style.transform = `translateY(${newOffset}px)`;
        // Обновляем индекс на соответствующий реальный элемент (целое число)
        this.currentIndex = roundedIndex;
        // Восстанавливаем transition для следующей анимации
        setTimeout(() => {
          this.track.style.transition = `transform ${this.options.speed}ms ease`;
        }, 50);
      }
    } else {
      // Отладка: показываем текущую позицию для понимания, почему переход не происходит
      if (currentPosition > realItemsEnd) {
        console.log('[Carousel] Approaching transition zone:', {
          currentPosition: currentPosition.toFixed(2),
          realItemsEnd: realItemsEnd,
          safeZone: safeZone,
          threshold: (realItemsEnd + safeZone).toFixed(2),
          needsMore: ((realItemsEnd + safeZone) - currentPosition).toFixed(2),
          currentOffset: currentOffset.toFixed(2)
        });
      }
    }
    // Для вертикальной карусели, которая крутится только вниз, не проверяем переход вверх
  }

  next() {
    const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
    const maxIndex = realItems.length - 1;
    
    if (this.options.loop) {
      // Для бесконечной карусели просто увеличиваем индекс
      // handleInfiniteLoop позаботится о бесшовном переходе
      // ВАЖНО: не ограничиваем индекс, чтобы handleInfiniteLoop мог обнаружить переход за пределы
      const nextIndex = this.currentIndex + 1;
      // Если индекс превышает реальные элементы, handleInfiniteLoop обработает переход
      this.goTo(nextIndex);
    } else {
      this.goTo(Math.min(this.currentIndex + 1, maxIndex));
    }
  }

  prev() {
    // Для вертикальной карусели на главной странице отключаем прокрутку назад
    // Карусель должна крутиться только в одном направлении (вниз)
    if (this.options.vertical && this.options.loop) {
      console.log('[Carousel] Prev disabled for vertical carousel - only forward movement allowed');
      return;
    }
    
    const realItems = this.items.filter(item => !item.classList.contains('carousel-clone'));
    const maxIndex = realItems.length - 1;
    
    if (this.options.loop) {
      // Для бесконечной карусели просто уменьшаем индекс
      // handleInfiniteLoop позаботится о бесшовном переходе
      this.goTo((this.currentIndex - 1 + realItems.length) % realItems.length);
    } else {
      this.goTo(Math.max(this.currentIndex - 1, 0));
    }
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.next();
    }, this.options.autoplaySpeed);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  syncHeightWithSibling() {
    // Для вертикальной карусели на главной странице синхронизируем высоту с соседним блоком
    if (!this.options.vertical) return;
    
    // Находим родительский контейнер (section.main-block)
    const parentSection = this.container.closest('section.main-block');
    if (!parentSection) return;
    
    // Находим соседний блок с классом d-flex gap-v-50 flex-column
    const siblingBlock = parentSection.querySelector('.d-flex.gap-v-50.flex-column');
    if (!siblingBlock) return;
    
    // Получаем высоту соседнего блока
    const siblingHeight = siblingBlock.offsetHeight;
    if (siblingHeight > 0) {
      // Увеличиваем высоту контейнера для видимости нижнего слайда
      // Добавляем примерно одну высоту элемента для видимости 5-го слайда
      const extraHeight = 60; // Только высота элемента, без margin
      const adjustedHeight = siblingHeight + extraHeight;
      
      // Устанавливаем высоту контейнера карусели
      this.container.style.height = adjustedHeight + 'px';
      this.wrapper.style.height = adjustedHeight + 'px';
      
      // Центрируем контент по вертикали
      this.wrapper.style.display = 'flex';
      this.wrapper.style.alignItems = 'center';
      this.wrapper.style.justifyContent = 'center';
    }
  }

  destroy() {
    this.stopAutoplay();
    // Remove event listeners
    // Remove navigation and dots
    // Clean up styles
  }
}

// Инициализация всех каруселей на странице
function initNativeCarousels() {
  // Защита от множественных вызовов
  if (window.__nativeCarouselsInitialized) {
    console.log('[NativeCarousel] Already initialized, skipping...');
    return;
  }
  
  // Загружаем карусели из API
  // Используем текущий origin для API, если не указан явно
  const API_BASE = window.API_BASE || (typeof window !== 'undefined' && window.location.origin) || '';
  
  // Находим все контейнеры с data-carousel, но пропускаем те, у которых data-no-native-carousel="true"
  const containers = document.querySelectorAll('[data-carousel]:not([data-no-native-carousel="true"])');
  
  if (containers.length === 0) {
    return; // Нет каруселей на странице
  }
  
  // Помечаем что инициализация началась
  window.__nativeCarouselsInitialized = true;
  
  // Загружаем все карусели
  fetch(`${API_BASE}/api/public/carousels`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load carousels');
      }
      return response.json();
    })
    .then(carousels => {
      containers.forEach(container => {
        const slug = container.getAttribute('data-carousel');
        if (!slug) return;
        
        // Пропускаем карусели с атрибутом data-no-native-carousel="true"
        if (container.hasAttribute('data-no-native-carousel') && container.getAttribute('data-no-native-carousel') === 'true') {
          console.log(`[NativeCarousel] Skipping carousel "${slug}" - data-no-native-carousel="true"`);
          return;
        }
        
        const carousel = carousels.find(c => c.slug === slug);
        if (!carousel) {
          console.warn(`Carousel with slug "${slug}" not found`);
          return;
        }
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Создаем wrapper и track
        const wrapper = document.createElement('div');
        wrapper.className = 'carousel-wrapper';
        
        const track = document.createElement('div');
        track.className = 'carousel-track';
        
        // Рендерим элементы карусели
        carousel.items.forEach((item, index) => {
          const slide = document.createElement('div');
          slide.className = 'carousel-item';
          
          if (item.image_url) {
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = item.caption_html ? item.caption_html.replace(/<[^>]*>/g, '').substring(0, 50) : `Slide ${index + 1}`;
            
            if (item.link_url) {
              const link = document.createElement('a');
              link.href = item.link_url;
              link.appendChild(img);
              slide.appendChild(link);
            } else {
              slide.appendChild(img);
            }
            
            if (item.caption_html) {
              const caption = document.createElement('div');
              caption.className = 'carousel-caption';
              caption.innerHTML = item.caption_html;
              slide.appendChild(caption);
            }
          } else if (item.caption_html) {
            slide.innerHTML = item.caption_html;
          }
          
          track.appendChild(slide);
        });
        
        wrapper.appendChild(track);
        container.appendChild(wrapper);
        
        // Определяем настройки карусели
        const carouselOptions = {
          ...carousel.settings,
          type: carousel.type
        };
        
        // Для вертикальной карусели на главной странице устанавливаем vertical: true
        if (slug === 'main-vertical-carousel') {
          console.log('[Carousel] Initializing main-vertical-carousel', { container, slug, carouselData: carousel });
          carouselOptions.vertical = true;
          carouselOptions.autoplay = true;
          carouselOptions.autoplaySpeed = 3000;
          carouselOptions.speed = 1500; // Скорость анимации (используется для transition) - увеличено для более плавного перехода
          carouselOptions.loop = true;
          carouselOptions.slidesToShow = 5;
          carouselOptions.slidesToScroll = 1;
          carouselOptions.items = 5;
          carouselOptions.nav = false;
          carouselOptions.dots = false;
          carouselOptions.margin = 0; // Устанавливаем margin в 0, так как используем 1em в CSS
          
          // Адаптивность: на маленьких экранах показываем 3 слайда
          carouselOptions.responsive = {
            768: {
              items: 5,
              slidesToShow: 5
            },
            0: {
              items: 3,
              slidesToShow: 3
            }
          };
          
          // Устанавливаем CSS переменную для скорости transition (для плавного перехода цвета)
          container.style.setProperty('--carousel-speed', carouselOptions.speed + 'ms');
        }
        
        // Инициализируем карусель
        new NativeCarousel(container, carouselOptions);
      });
    })
    .catch(error => {
      console.warn('Failed to load carousels from API:', error);
    });
}

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNativeCarousels);
} else {
  initNativeCarousels();
}

// Экспорт для использования в других скриптах
window.NativeCarousel = NativeCarousel;
window.initNativeCarousels = initNativeCarousels;

