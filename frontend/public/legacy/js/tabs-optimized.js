// Оптимизированный tabs.js для главной страницы
(function() {
  'use strict';

  function initTabs() {
    const head = document.querySelector('.tabs__head');
    const body = document.querySelector('.tabs__body');

    if (!head || !body) return false;

    const getActiveTabName = () => {
      const activeCaption = head.querySelector('.tabs__caption_active');
      return activeCaption ? activeCaption.dataset.tab : null;
    };

    const setActiveContent = () => {
      const activeTabName = getActiveTabName();
      if (!activeTabName) return;

      // Hide current active content
      const activeContent = body.querySelector('.tabs__content_active');
      if (activeContent) {
        activeContent.classList.remove('tabs__content_active');
      }

      // Show new active content
      const newContent = body.querySelector(`[data-tab="${activeTabName}"]`);
      if (newContent) {
        newContent.classList.add('tabs__content_active');
      }
    };

    // Check if there's an active tab on page load
    if (!head.querySelector('.tabs__caption_active')) {
      const firstCaption = head.querySelector('.tabs__caption');
      if (firstCaption) {
        firstCaption.classList.add('tabs__caption_active');
      }
    }

    // Set active content on page load
    setActiveContent();

    head.addEventListener('click', function(e) {
      const caption = e.target.closest('.tabs__caption');
      
      if (!caption) return;
      if (caption.classList.contains('tabs__caption_active')) return;

      // Remove active class from current active caption
      const activeCaption = head.querySelector('.tabs__caption_active');
      if (activeCaption) {
        activeCaption.classList.remove('tabs__caption_active');
      }

      // Add active class to clicked caption
      caption.classList.add('tabs__caption_active');

      // Set active content
      setActiveContent();
    });

    return true;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
  } else {
    initTabs();
  }
})();



