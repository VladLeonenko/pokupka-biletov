// Оптимизированный services-tabs.js для главной страницы
(function() {
  'use strict';

  function initServicesTabs() {
    const head = document.querySelector('.services__tabs__head');
    const body = document.querySelector('.services__tabs__body');

    if (!head || !body) return false;

    const getActiveTabName = () => {
      const activeCaption = head.querySelector('.services__tabs__caption_active');
      return activeCaption ? activeCaption.dataset.tab : null;
    };

    const setActiveContent = () => {
      const activeTabName = getActiveTabName();
      if (!activeTabName) return;

      // Hide current active content
      const activeContent = body.querySelector('.services__tabs__content_active');
      if (activeContent) {
        activeContent.classList.remove('services__tabs__content_active');
      }

      // Show new active content
      const newContent = body.querySelector(`[data-tab="${activeTabName}"]`);
      if (newContent) {
        newContent.classList.add('services__tabs__content_active');
      }
    };

    // Check if there's an active tab on page load
    if (!head.querySelector('.services__tabs__caption_active')) {
      const firstCaption = head.querySelector('.services__tabs__caption');
      if (firstCaption) {
        firstCaption.classList.add('services__tabs__caption_active');
      }
    }

    // Set active content on page load
    setActiveContent();

    head.addEventListener('click', function(e) {
      const caption = e.target.closest('.services__tabs__caption');
      
      if (!caption) return;
      if (caption.classList.contains('services__tabs__caption_active')) return;

      // Remove active class from current active caption
      const activeCaption = head.querySelector('.services__tabs__caption_active');
      if (activeCaption) {
        activeCaption.classList.remove('services__tabs__caption_active');
      }

      // Add active class to clicked caption
      caption.classList.add('services__tabs__caption_active');

      // Set active content
      setActiveContent();
    });

    return true;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServicesTabs);
  } else {
    initServicesTabs();
  }

  // Legacy scroll function (kept for compatibility, but likely not used)
  let menu__link = document.querySelectorAll('.t-menu__link-item');
  function scrollTo() {
    if (typeof window.scroll === 'function') {
      window.scroll(function(e) {
        if (document.querySelector(this).scrollTop() > 350) {
          menu__link.forEach(function(link) {
            link.classList.add("menu-item");
          });
        }
      });
    }
  }
  
  if (menu__link.length > 0) {
    scrollTo();
  }
})();



