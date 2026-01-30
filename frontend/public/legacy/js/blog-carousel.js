/**
 * Native Blog Carousel - замена owl-carousel для блога
 * Визуально идентична оригинальной owl-carousel
 */
(function() {
  'use strict';

  function initBlogCarousel() {
    // Находим все контейнеры с классом owl-carousel или blog-carousel
    var carousels = document.querySelectorAll('.owl-carousel.owl-theme.nonloop, .blog-carousel[data-carousel="blog-nonloop"]');
    
    if (carousels.length === 0) {
      return;
    }

    carousels.forEach(function(container) {
      // Проверяем, не инициализирована ли уже карусель
      if (container.hasAttribute('data-initialized')) {
        return;
      }

      var items = container.querySelectorAll('.item');
      if (items.length === 0) {
        return;
      }

      // Устанавливаем базовые стили для контейнера
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.width = '100%';

      // Создаем wrapper для track
      var wrapper = document.createElement('div');
      wrapper.className = 'owl-stage-outer';
      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'hidden';
      wrapper.style.width = '100%';

      var stage = document.createElement('div');
      stage.className = 'owl-stage';
      stage.style.display = 'flex';
      stage.style.transition = 'transform 0.5s ease';
      stage.style.transform = 'translate3d(0px, 0px, 0px)';

      var slidesToShow = 3; // Показываем 3 слайда одновременно
      
      // Перемещаем все элементы в stage
      items.forEach(function(item, index) {
        // Устанавливаем ширину для показа 3 слайдов
        item.style.width = (100 / slidesToShow) + '%';
        item.style.minWidth = (100 / slidesToShow) + '%';
        item.style.flexShrink = '0';
        item.style.flexBasis = (100 / slidesToShow) + '%';
        item.style.boxSizing = 'border-box';
        
        // Добавляем стили для текста
        var h4 = item.querySelector('h4');
        if (h4) {
          h4.style.fontSize = '2em';
          h4.style.textAlign = 'right';
        }
        
        stage.appendChild(item);
      });

      wrapper.appendChild(stage);
      
      // Очищаем контейнер и добавляем wrapper
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(wrapper);

      var currentIndex = 0;
      var isAnimating = false;
      var autoplayInterval = null;
      var touchStartX = 0;
      var touchEndX = 0;

      function updatePosition(animate) {
        if (isAnimating) return;
        
        // Вычисляем смещение для показа 3 слайдов
        // Центрируем центральный слайд
        var itemWidth = 100 / slidesToShow;
        var translateX = -(currentIndex * itemWidth);
        
        if (animate) {
          stage.style.transition = 'transform 0.5s ease';
          isAnimating = true;
          setTimeout(function() {
            isAnimating = false;
          }, 500);
        } else {
          stage.style.transition = 'none';
        }
        
        stage.style.transform = 'translate3d(' + translateX + '%, 0px, 0px)';
        
        // Обновляем классы и стили для активных слайдов
        updateActiveSlides();
      }
      
      function updateActiveSlides() {
        // Убираем все классы и стили
        items.forEach(function(item, index) {
          item.classList.remove('active', 'center-slide');
          item.style.backgroundColor = '';
          
          var h4 = item.querySelector('h4');
          if (h4) {
            h4.style.color = '';
          }
        });
        
        // Определяем индексы видимых слайдов
        // Центральный слайд - это currentIndex
        // Левый слайд - это currentIndex - 1 (если есть)
        // Правый слайд - это currentIndex + 1 (если есть)
        var centerIndex = currentIndex;
        var leftIndex = centerIndex - 1;
        var rightIndex = centerIndex + 1;
        
        // Применяем стили к центральному слайду (желтый #ffbb00)
        if (items[centerIndex]) {
          items[centerIndex].classList.add('active', 'center-slide');
          items[centerIndex].style.backgroundColor = '#ffbb00';
          var centerH4 = items[centerIndex].querySelector('h4');
          if (centerH4) {
            centerH4.style.color = '#000'; // Черный текст на желтом фоне для читаемости
          }
        }
        
        // Применяем стили к левому слайду (белый #fff)
        if (leftIndex >= 0 && items[leftIndex]) {
          items[leftIndex].classList.add('active');
          items[leftIndex].style.backgroundColor = '#fff';
          var leftH4 = items[leftIndex].querySelector('h4');
          if (leftH4) {
            leftH4.style.color = '#000'; // Темный текст на белом фоне для читаемости
          }
        }
        
        // Применяем стили к правому слайду (белый #fff)
        if (rightIndex < items.length && items[rightIndex]) {
          items[rightIndex].classList.add('active');
          items[rightIndex].style.backgroundColor = '#fff';
          var rightH4 = items[rightIndex].querySelector('h4');
          if (rightH4) {
            rightH4.style.color = '#000'; // Темный текст на белом фоне для читаемости
          }
        }
      }

      function next() {
        if (isAnimating) return;
        // Учитываем, что показываем 3 слайда, поэтому последний индекс должен быть items.length - slidesToShow
        var maxIndex = Math.max(0, items.length - slidesToShow);
        if (currentIndex < maxIndex) {
          currentIndex++;
          updatePosition(true);
        } else {
          // Если достигли конца, начинаем сначала
          currentIndex = 0;
          updatePosition(true);
        }
      }

      function prev() {
        if (isAnimating) return;
        if (currentIndex > 0) {
          currentIndex--;
          updatePosition(true);
        } else {
          // Если в начале, переходим в конец
          var maxIndex = Math.max(0, items.length - slidesToShow);
          currentIndex = maxIndex;
          updatePosition(true);
        }
      }

      // Автопрокрутка (как в owl-carousel)
      function startAutoplay() {
        stopAutoplay();
        autoplayInterval = setInterval(function() {
          next();
        }, 5000); // 5 секунд как в оригинале
      }

      function stopAutoplay() {
        if (autoplayInterval) {
          clearInterval(autoplayInterval);
          autoplayInterval = null;
        }
      }

      // Touch события для свайпа
      wrapper.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoplay();
      });

      wrapper.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].clientX;
        var diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            next();
          } else {
            prev();
          }
        }
        
        startAutoplay();
      });

      // Mouse события для drag
      var isDragging = false;
      var dragStartX = 0;
      var dragStartTranslate = 0;

      wrapper.addEventListener('mousedown', function(e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartTranslate = currentIndex * -100;
        stopAutoplay();
        stage.style.transition = 'none';
        wrapper.style.cursor = 'grabbing';
      });

      wrapper.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        var diff = e.clientX - dragStartX;
        var containerWidth = container.offsetWidth;
        var itemWidth = 100 / slidesToShow;
        var translatePercent = dragStartTranslate + (diff / containerWidth * 100 * slidesToShow);
        
        // Ограничиваем перемещение
        var maxIndex = Math.max(0, items.length - slidesToShow);
        var minTranslate = -maxIndex * itemWidth;
        translatePercent = Math.max(minTranslate, Math.min(0, translatePercent));
        
        stage.style.transform = 'translate3d(' + translatePercent + '%, 0px, 0px)';
      });

      wrapper.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        isDragging = false;
        wrapper.style.cursor = 'grab';
        
        var diff = dragStartX - e.clientX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            next();
          } else {
            prev();
          }
        } else {
          // Возвращаемся на текущую позицию
          updatePosition(true);
        }
        
        startAutoplay();
      });

      wrapper.addEventListener('mouseleave', function() {
        if (isDragging) {
          isDragging = false;
          wrapper.style.cursor = 'grab';
          updatePosition(true);
          startAutoplay();
        }
      });

      // Пауза при наведении
      container.addEventListener('mouseenter', stopAutoplay);
      container.addEventListener('mouseleave', startAutoplay);

      // Начальная позиция
      updatePosition(false);
      
      // Применяем начальные стили
      updateActiveSlides();
      
      // Запускаем автопрокрутку
      startAutoplay();

      // Помечаем как инициализированную
      container.setAttribute('data-initialized', 'true');
    });
  }

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initBlogCarousel, 100);
    });
  } else {
    setTimeout(initBlogCarousel, 100);
  }

  // Переинициализация при изменении контента (для динамического контента)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      var shouldReinit = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              var carousel = node.querySelector && (
                node.querySelector('.owl-carousel.owl-theme.nonloop') ||
                node.querySelector('.blog-carousel[data-carousel="blog-nonloop"]')
              );
              if (carousel || node.classList && (
                node.classList.contains('owl-carousel') ||
                node.classList.contains('blog-carousel')
              )) {
                shouldReinit = true;
              }
            }
          });
        }
      });
      if (shouldReinit) {
        setTimeout(initBlogCarousel, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();

