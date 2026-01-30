// Portfolio Modern - фильтры и анимации
(function() {
  'use strict';
  
  // Анимация счетчиков статистики
  function animateCounters() {
    var counters = document.querySelectorAll('.stat-number');
    
    for (var c = 0; c < counters.length; c++) {
      var counter = counters[c];
      var target = parseInt(counter.getAttribute('data-count'));
      var duration = 2000;
      var increment = target / (duration / 16);
      var current = 0;
      
      var updateCounter = function() {
        current += increment;
        if (current < target) {
          var countAttr = counter.getAttribute('data-count');
          counter.textContent = Math.floor(current) + (parseInt(countAttr) >= 100 ? '+' : '');
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target + (target >= 100 ? '+' : '');
        }
      };
      
      // Запускаем анимацию при появлении в viewport
      var observer = new IntersectionObserver(function(entries) {
        for (var e = 0; e < entries.length; e++) {
          var entry = entries[e];
          if (entry.isIntersecting) {
            updateCounter();
            observer.unobserve(entry.target);
          }
        }
      }, { threshold: 0.5 });
      
      observer.observe(counter);
    }
  }
  
  // Фильтрация портфолио
  function initFilters() {
    var filterBtns = document.querySelectorAll('.filter-btn');
    var yearBtns = document.querySelectorAll('.year-btn');
    var portfolioItems = document.querySelectorAll('.portfolio-item');
    
    var currentCategory = 'all';
    var currentYear = 'all';
    
    function filterPortfolio() {
      for (var i = 0; i < portfolioItems.length; i++) {
        var item = portfolioItems[i];
        var category = item.getAttribute('data-category');
        var year = item.getAttribute('data-year');
        
        var matchCategory = currentCategory === 'all' || category === currentCategory;
        var matchYear = currentYear === 'all' || year === currentYear;
        
        if (matchCategory && matchYear) {
          item.classList.remove('hidden');
          // Анимация появления
          (function(itemEl, index) {
            setTimeout(function() {
              itemEl.style.opacity = '0';
              itemEl.style.transform = 'translateY(30px)';
              setTimeout(function() {
                itemEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'translateY(0)';
              }, 50);
            }, index * 50);
          })(item, i);
        } else {
          item.classList.add('hidden');
        }
      }
    }
    
    for (var f = 0; f < filterBtns.length; f++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          for (var b = 0; b < filterBtns.length; b++) {
            filterBtns[b].classList.remove('active');
          }
          btn.classList.add('active');
          currentCategory = btn.getAttribute('data-filter');
          filterPortfolio();
        });
      })(filterBtns[f]);
    }
    
    for (var y = 0; y < yearBtns.length; y++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          for (var b = 0; b < yearBtns.length; b++) {
            yearBtns[b].classList.remove('active');
          }
          btn.classList.add('active');
          currentYear = btn.getAttribute('data-year');
          filterPortfolio();
        });
      })(yearBtns[y]);
    }
  }
  
  // Анимация появления элементов при скролле
  function initScrollAnimations() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      
      var items = document.querySelectorAll('.portfolio-item');
      for (var i = 0; i < items.length; i++) {
        (function(item, index) {
          gsap.from(item, {
            opacity: 0,
            y: 100,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          });
        })(items[i], i);
      }
    } else {
      // Fallback без GSAP
      var itemsFallback = document.querySelectorAll('.portfolio-item');
      var observer = new IntersectionObserver(function(entries) {
        for (var j = 0; j < entries.length; j++) {
          var entry = entries[j];
          if (entry.isIntersecting) {
            (function(index, target) {
              setTimeout(function() {
                target.style.opacity = '1';
                target.style.transform = 'translateY(0)';
              }, index * 100);
            })(j, entry.target);
            observer.unobserve(entry.target);
          }
        }
      }, { threshold: 0.1 });
      
      for (var k = 0; k < itemsFallback.length; k++) {
        observer.observe(itemsFallback[k]);
      }
    }
  }
  
  // Параллакс эффект для hero секции
  function initParallax() {
    var hero = document.querySelector('.portfolio-hero');
    if (!hero) return;
    
    window.addEventListener('scroll', function() {
      var scrolled = window.pageYOffset;
      var rate = scrolled * 0.5;
      hero.style.transform = 'translateY(' + rate + 'px)';
    });
  }
  
  // Инициализация
  function init() {
    animateCounters();
    initFilters();
    initScrollAnimations();
    // initParallax(); // Можно включить если нужен параллакс
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

