(function() {
  var mixer = null; // Вынесли mixer на уровень IIFE для доступа из всех функций
  
  // Wait for jQuery and DOM to be ready
  function initBlogPage(initialCategory) {
    if (typeof jQuery === 'undefined') {
      return false;
    }
    
    jQuery(function($) {
      
      // Инициализация mixItUp для фильтрации
      function initMixItUp() {
        if (typeof mixitup !== 'undefined' && $('#Blog-items').length > 0) {
          try {
            var initialFilterValue = initialCategory === 'all' ? 'all' : '.category-' + initialCategory;
            
            console.log('[MixItUp] Initializing with filter:', initialFilterValue);
            console.log('[MixItUp] Container:', $('#Blog-items').length);
            console.log('[MixItUp] Blog items found:', $('.blog-item').length);
            
            mixer = mixitup('#Blog-items', {
              animation: {
                effects: 'fade translateZ(-100px)',
                duration: 300
              },
              load: {
                filter: initialFilterValue
              },
              selectors: {
                target: '.blog-item'
              },
              multifilter: {
                enable: false
              },
              controls: {
                enable: true,
                live: false,
                toggleDefault: 'all'
              }
            });
            
            // Убеждаемся, что все элементы видны после инициализации, если фильтр 'all'
            if (initialFilterValue === 'all') {
              setTimeout(function() {
                // Принудительно показываем все элементы
                $('.blog-item').each(function() {
                  $(this).css({
                    'display': '',
                    'opacity': '',
                    'visibility': ''
                  });
                });
                // Также вызываем filter('all') чтобы mixItUp правильно обработал
                if (mixer && typeof mixer.filter === 'function') {
                  mixer.filter('all');
                }
              }, 200);
            }
            
            return true;
          } catch (e) {
            console.warn('MixItUp initialization failed:', e);
            // Если mixItUp не работает, показываем все элементы
            $('.blog-item').show();
            return false;
          }
        }
        return false;
      }
      
      // Try to initialize MixItUp после небольшой задержки
      setTimeout(function() {
        if (!initMixItUp()) {
          var mixitupInterval = setInterval(function() {
            if (initMixItUp()) {
              clearInterval(mixitupInterval);
            }
          }, 200);
          setTimeout(function() {
            clearInterval(mixitupInterval);
            // Если mixItUp не загрузился, показываем все элементы вручную
            if (!mixer) {
              console.warn('[MixItUp] Failed to initialize, using fallback');
              $('.blog-item').show();
            }
          }, 5000);
        } else {
          console.log('[MixItUp] Initialized successfully');
          // Если инициализация прошла успешно, проверяем что элементы видны
          setTimeout(function() {
            var visibleItems = $('.blog-item:visible').length;
            var totalItems = $('.blog-item').length;
            console.log('[MixItUp] Visible items:', visibleItems, '/', totalItems);
            // Если элементы скрыты, показываем их
            if (totalItems > 0 && visibleItems === 0) {
              $('.blog-item').each(function() {
                $(this).css({
                  'display': '',
                  'opacity': '',
                  'visibility': ''
                });
              });
              if (mixer && typeof mixer.filter === 'function') {
                mixer.filter('all');
              }
            }
          }, 500);
        }
      }, 100);
      
      // Owl Carousel удален - используем нативные карусели через data-carousel
      const owlFilter = document.querySelector('.owl-carousel-filter');
      if (owlFilter && !owlFilter.hasAttribute('data-carousel')) {
        owlFilter.setAttribute('data-carousel', 'blog-nonloop');
      }
      
      // Ручная фильтрация с плавной анимацией
      function manualFilter(category) {
        if (category === 'all') {
          $('.blog-item').each(function(index) {
            var $item = $(this);
            setTimeout(function() {
              $item.css({
                'opacity': '0',
                'transform': 'translateY(20px)'
              }).show();
              setTimeout(function() {
                $item.css({
                  'opacity': '1',
                  'transform': 'translateY(0)'
                });
              }, 10);
            }, index * 50); // Задержка для каскадного эффекта
          });
        } else {
          $('.blog-item').each(function() {
            var $item = $(this);
            if ($item.hasClass('category-' + category)) {
              $item.css({
                'opacity': '0',
                'transform': 'translateY(20px)'
              }).show();
              setTimeout(function() {
                $item.css({
                  'opacity': '1',
                  'transform': 'translateY(0)'
                });
              }, 10);
            } else {
              $item.css({
                'opacity': '0',
                'transform': 'translateY(20px)'
              });
              setTimeout(function() {
                $item.hide();
              }, 300); // Ждем окончания анимации
            }
          });
        }
      }
      
      // Обработка кликов по фильтрам
      $('.filter[data-category]').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var category = $(this).attr('data-category');
        var filterValue = category === 'all' ? 'all' : '.category-' + category;
        
        console.log('[Filter] Clicked category:', category);
        console.log('[Filter] Filter value:', filterValue);
        
        // Обновляем активное состояние
        $('.filter').removeClass('active');
        $(this).addClass('active');
        
        // Применяем фильтр
        if (mixer && typeof mixer.filter === 'function') {
          try {
            console.log('[Filter] Applying filter...');
            mixer.filter(filterValue);
            console.log('[Filter] Filter applied successfully');
          } catch (e) {
            console.error('[Filter] MixItUp filter error:', e);
            // Fallback: ручная фильтрация с анимацией
            manualFilter(category);
          }
        } else {
          console.warn('[Filter] MixItUp not available, using manual filter');
          // Если mixItUp не загружен, используем простую фильтрацию через CSS
          manualFilter(category);
        }
      });
    });
    
    return true;
  }
  
  // Wait for DOM to be ready, then initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        initBlogPage(window.BLOG_INITIAL_CATEGORY || 'all');
      }, 500);
    });
  } else {
    // DOM is already ready
    setTimeout(function() {
      initBlogPage(window.BLOG_INITIAL_CATEGORY || 'all');
    }, 500);
  }
})();
