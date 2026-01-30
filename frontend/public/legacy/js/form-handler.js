/**
 * Form Handler for CMS
 * Automatically handles form submissions and abandonment tracking
 */

(function() {
  'use strict';

  // Determine API base URL
  // Priority: 1. window.API_BASE, 2. data-api-base attribute, 3. auto-detect, 4. fallback
  function getApiBase() {
    // Check global variable first
    if (window.API_BASE) {
      return window.API_BASE;
    }

    // Check script data attribute
    const script = document.querySelector('script[src*="form-handler.js"]');
    if (script && script.dataset.apiBase) {
      return script.dataset.apiBase;
    }

    // Auto-detect: if same origin, use relative path, otherwise try to infer
    const currentOrigin = window.location.origin;
    const hostname = window.location.hostname;
    
    // Development: use relative paths (proxied through Vite)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }

    // Production: same origin means API is on same domain, use relative path
    // Or you can set window.API_BASE or data-api-base in your deployment
    if (window.location.protocol === 'https:') {
      return currentOrigin; // Same origin
    }

    // Fallback
    return currentOrigin;
  }

  const API_BASE = getApiBase();

  // Track form start times
  const formStartTimes = new Map();

  // Initialize all forms on the page
  function initForms() {
    const forms = document.querySelectorAll('form[id="contact-form"], form[id="quizForm"], form[id="new-client-form"], form[id^="quiz"], form[class*="contact"], form[class*="form"]');
    
    forms.forEach(form => {
      // Пропускаем quiz формы - они обрабатываются quiz-optimized.js
      const originalFormId = form.id || '';
      if (originalFormId === 'quizForm' || originalFormId === 'regForm' || originalFormId.startsWith('quiz')) {
        console.log('[FormHandler] Skipping quiz form:', originalFormId, '- handled by quiz-optimized.js');
        return;
      }
      // Map form IDs to our form_id in database
      const formIdMap = {
        'quizForm': 'quiz-form',
        'new-client-form': 'new-client-form',
        'contact-form': 'contact-form'
      };
      const formId = formIdMap[originalFormId] || originalFormId || form.getAttribute('data-form-id') || 'contact-form';
      
      // Track when user starts filling the form
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (!formStartTimes.has(form)) {
            formStartTimes.set(form, new Date().toISOString());
          }
        });
      });

      // Track form abandonment (when user leaves page without submitting)
      let submitted = false;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitted = true;

        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }

        try {
          const response = await fetch(`${API_BASE}/api/forms/${formId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Form submitted successfully:', result);
            
            // Show success notification
            if (typeof window.showSuccessNotification === 'function') {
              window.showSuccessNotification('Спасибо! Ваша заявка отправлена.');
            } else {
              // Fallback на старый способ
              const successMsg = form.querySelector('.form-success') || createSuccessMessage(form);
              successMsg.style.display = 'block';
            }
            form.reset();
            
            // Optional: trigger analytics event
            if (typeof ym !== 'undefined') {
              ym(88795306, 'reachGoal', 'formSubmitted');
            }
          } else {
            throw new Error('Failed to submit form');
          }
        } catch (error) {
          console.error('Error submitting form:', error);
          // Show error notification
          if (typeof window.showErrorNotification === 'function') {
            window.showErrorNotification('Ошибка отправки формы. Попробуйте позже.');
          } else {
            // Fallback на старый способ
            const errorMsg = form.querySelector('.form-error') || createErrorMessage(form);
            errorMsg.style.display = 'block';
          }
        }
      });

      // Track abandonment when page is unloaded
      window.addEventListener('beforeunload', () => {
        if (!submitted && formStartTimes.has(form)) {
          const startedAt = formStartTimes.get(form);
          const formData = new FormData(form);
          const data = {};
          for (const [key, value] of formData.entries()) {
            if (value) data[key] = value;
          }

          // Send abandonment tracking (fire and forget)
          const blob = new Blob([JSON.stringify({
            form_data: data,
            started_at: startedAt
          })], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE}/api/forms/${formId}/abandon`, blob);
        }
      });
    });
  }

  function createSuccessMessage(form) {
    const msg = document.createElement('div');
    msg.className = 'form-success';
    msg.style.cssText = 'display: none; padding: 15px; background: #4caf50; color: white; border-radius: 4px; margin-top: 15px;';
    msg.textContent = 'Спасибо! Ваша заявка отправлена.';
    form.appendChild(msg);
    return msg;
  }

  function createErrorMessage(form) {
    const msg = document.createElement('div');
    msg.className = 'form-error';
    msg.style.cssText = 'display: none; padding: 15px; background: #f44336; color: white; border-radius: 4px; margin-top: 15px;';
    msg.textContent = 'Ошибка отправки формы. Попробуйте позже.';
    form.appendChild(msg);
    return msg;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }
})();
