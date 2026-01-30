// Quiz form initialization
(function() {
  var currentTab = 0; // Current tab is set to be the first tab (0)
  
  function showTab(n) {
    // This function will display the specified tab of the form ...
    var x = document.getElementsByClassName("tab");
    if (!x || x.length === 0) return;
    
    // Hide all tabs first
    for (var i = 0; i < x.length; i++) {
      x[i].style.display = "none";
    }
    
    // Show current tab
    if (x[n]) {
      x[n].style.display = "block";
    }
    
    // ... and fix the Previous/Next buttons:
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    
    if (prevBtn && nextBtn) {
      if (n == 0) {
        prevBtn.style.display = "none";
      } else {
        prevBtn.style.display = "inline";
      }
      
      if (n == (x.length - 1)) {
        nextBtn.setAttribute("type", "submit");
        nextBtn.setAttribute("onclick", "if(typeof ym !== 'undefined') ym(88795306,'reachGoal','sendForm')");
      } else {
        nextBtn.setAttribute("type", "button");
        nextBtn.removeAttribute("onclick");
      }
      
      if (n == (x.length - 2)) {
        nextBtn.innerHTML = "Отправить";
      } else {
        nextBtn.innerHTML = "Далее";
      }
      
      if (n == 5) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
      }
    }
    
    // ... and run a function that displays the correct step indicator:
    fixStepIndicator(n);
  }

  function nextPrev(n) {
    // This function will figure out which tab to display
    var x = document.getElementsByClassName("tab");
    if (!x || x.length === 0) return false;
    
    // При переходе вперед валидируем форму
    if (n == 1) {
      // Особенно важно валидировать на вкладке с контактами (обычно это 4-я вкладка, индекс 4)
      if (currentTab === 4) {
        if (!validateForm()) {
          return false; // Не переходим дальше, если форма невалидна
        }
      }
    }
    
    // Hide the current tab:
    if (x[currentTab]) {
      x[currentTab].style.display = "none";
    }
    
    // Increase or decrease the current tab by 1:
    currentTab = currentTab + n;
    
    // if you have reached the end of the form... :
    if (currentTab >= x.length) {
      // Проверяем контактные данные перед отправкой
      var phoneInput = document.getElementById('quiz-tel');
      var emailInput = document.getElementById('quiz-email');
      
      var hasValidContact = false;
      if (phoneInput && phoneInput.value.trim() !== "" && phoneInput.value.trim() !== "+7") {
        if (validatePhone(phoneInput.value)) {
          hasValidContact = true;
        }
      }
      if (!hasValidContact && emailInput && emailInput.value.trim() !== "") {
        if (validateEmail(emailInput.value)) {
          hasValidContact = true;
        }
      }
      
      if (!hasValidContact) {
        // Возвращаемся на вкладку с контактами
        currentTab = 4;
        showTab(currentTab);
        alert('Пожалуйста, заполните хотя бы одно контактное поле (телефон или email) корректно');
        return false;
      }
      
      //...the form gets submitted:
      var quizForm = document.getElementById("quizForm");
      if (quizForm) {
        quizForm.submit();
      }
      return false;
    }
    
    // Otherwise, display the correct tab:
    showTab(currentTab);
  }

  function validatePhone(phone) {
    // Проверка мобильного номера РФ
    // Формат: +7 (XXX) XXX-XX-XX или +7XXXXXXXXXX
    var cleaned = phone.replace(/\D/g, ''); // Убираем все нецифровые символы
    // Проверяем, что номер начинается с 7 и имеет 11 цифр
    if (cleaned.length === 11 && cleaned[0] === '7') {
      // Проверяем, что это мобильный номер (начинается с 9)
      var mobileCode = cleaned.substring(1, 4);
      if (mobileCode === '900' || mobileCode === '901' || mobileCode === '902' || 
          mobileCode === '903' || mobileCode === '904' || mobileCode === '905' ||
          mobileCode === '906' || mobileCode === '908' || mobileCode === '909' ||
          mobileCode === '910' || mobileCode === '911' || mobileCode === '912' ||
          mobileCode === '913' || mobileCode === '914' || mobileCode === '915' ||
          mobileCode === '916' || mobileCode === '917' || mobileCode === '918' ||
          mobileCode === '919' || mobileCode === '920' || mobileCode === '921' ||
          mobileCode === '922' || mobileCode === '923' || mobileCode === '924' ||
          mobileCode === '925' || mobileCode === '926' || mobileCode === '927' ||
          mobileCode === '928' || mobileCode === '929' || mobileCode === '930' ||
          mobileCode === '931' || mobileCode === '932' || mobileCode === '933' ||
          mobileCode === '934' || mobileCode === '936' || mobileCode === '937' ||
          mobileCode === '938' || mobileCode === '939' || mobileCode === '950' ||
          mobileCode === '951' || mobileCode === '952' || mobileCode === '953' ||
          mobileCode === '954' || mobileCode === '955' || mobileCode === '956' ||
          mobileCode === '957' || mobileCode === '958' || mobileCode === '960' ||
          mobileCode === '961' || mobileCode === '962' || mobileCode === '963' ||
          mobileCode === '964' || mobileCode === '965' || mobileCode === '966' ||
          mobileCode === '967' || mobileCode === '968' || mobileCode === '969' ||
          mobileCode === '977' || mobileCode === '978' || mobileCode === '980' ||
          mobileCode === '981' || mobileCode === '982' || mobileCode === '983' ||
          mobileCode === '984' || mobileCode === '985' || mobileCode === '986' ||
          mobileCode === '987' || mobileCode === '988' || mobileCode === '989' ||
          mobileCode === '991' || mobileCode === '992' || mobileCode === '993' ||
          mobileCode === '994' || mobileCode === '995' || mobileCode === '996' ||
          mobileCode === '997' || mobileCode === '998' || mobileCode === '999') {
        return true;
      }
    }
    return false;
  }

  function validateEmail(email) {
    // Проверка email
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function formatPhone(input) {
    // Автоматическое форматирование телефона
    var value = input.value.replace(/\D/g, ''); // Убираем все нецифровые символы
    
    // Если номер начинается не с 7 или 8, добавляем 7
    if (value.length > 0 && value[0] !== '7' && value[0] !== '8') {
      value = '7' + value;
    }
    
    // Если номер начинается с 8, заменяем на 7
    if (value.length > 0 && value[0] === '8') {
      value = '7' + value.substring(1);
    }
    
    // Ограничиваем до 11 цифр
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    
    // Форматируем: +7 (XXX) XXX-XX-XX
    var formatted = '';
    if (value.length > 0) {
      formatted = '+7';
      if (value.length > 1) {
        formatted += ' (' + value.substring(1, 4);
        if (value.length > 4) {
          formatted += ') ' + value.substring(4, 7);
          if (value.length > 7) {
            formatted += '-' + value.substring(7, 9);
            if (value.length > 9) {
              formatted += '-' + value.substring(9, 11);
            }
          }
        }
      }
    } else {
      formatted = '+7';
    }
    
    input.value = formatted;
    
    // Устанавливаем курсор в конец
    var len = input.value.length;
    input.setSelectionRange(len, len);
  }

  function validateForm() {
    // This function deals with validation of the form fields
    var x, y, i, valid = true;
    x = document.getElementsByClassName("tab");
    if (!x || x.length === 0 || !x[currentTab]) return false;
    
    y = x[currentTab].getElementsByTagName("input");
    // A loop that checks every input field in the current tab:
    for (i = 0; i < y.length; i++) {
      var input = y[i];
      var isRequired = input.classList.contains('_req-quiz');
      
      // Если поле обязательное и пустое
      if (isRequired && input.value.trim() === "") {
        input.classList.add("invalid");
        valid = false;
        continue;
      }
      
      // Специальная валидация для телефона
      if (input.type === 'tel' && input.id === 'quiz-tel') {
        if (input.value.trim() === "" || input.value.trim() === "+7") {
          input.classList.add("invalid");
          valid = false;
        } else {
          var phoneValid = validatePhone(input.value);
          if (!phoneValid) {
            input.classList.add("invalid");
            valid = false;
            // Показываем сообщение об ошибке
            var errorMsg = input.parentElement.querySelector('.error-message');
            if (!errorMsg) {
              errorMsg = document.createElement('span');
              errorMsg.className = 'error-message';
              errorMsg.style.color = 'red';
              errorMsg.style.fontSize = '12px';
              errorMsg.style.marginTop = '5px';
              errorMsg.style.display = 'block';
              input.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = 'Введите корректный мобильный номер РФ (например: +7 (999) 123-45-67)';
          } else {
            input.classList.remove("invalid");
            var errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) {
              errorMsg.remove();
            }
          }
        }
      }
      
      // Специальная валидация для email
      if (input.type === 'email' && input.id === 'quiz-email') {
        if (input.value.trim() === "") {
          input.classList.add("invalid");
          valid = false;
        } else {
          var emailValid = validateEmail(input.value);
          if (!emailValid) {
            input.classList.add("invalid");
            valid = false;
            // Показываем сообщение об ошибке
            var errorMsg = input.parentElement.querySelector('.error-message');
            if (!errorMsg) {
              errorMsg = document.createElement('span');
              errorMsg.className = 'error-message';
              errorMsg.style.color = 'red';
              errorMsg.style.fontSize = '12px';
              errorMsg.style.marginTop = '5px';
              errorMsg.style.display = 'block';
              input.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = 'Введите корректный email адрес (например: example@mail.ru)';
          } else {
            input.classList.remove("invalid");
            var errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) {
              errorMsg.remove();
            }
          }
        }
      }
      
      // Убираем класс invalid если поле заполнено и валидно
      if (!input.classList.contains("invalid") && input.value.trim() !== "") {
        input.classList.remove("invalid");
      }
    }
    
    // Проверка контактных данных перед отправкой
    if (currentTab === 4) { // Предпоследняя вкладка с контактами
      var phoneInput = document.getElementById('quiz-tel');
      var emailInput = document.getElementById('quiz-email');
      var nameInput = document.getElementById('quiz-name');
      
      var hasContact = false;
      if (phoneInput && phoneInput.value.trim() !== "" && phoneInput.value.trim() !== "+7") {
        if (validatePhone(phoneInput.value)) {
          hasContact = true;
        }
      }
      if (!hasContact && emailInput && emailInput.value.trim() !== "") {
        if (validateEmail(emailInput.value)) {
          hasContact = true;
        }
      }
      
      if (!hasContact) {
        valid = false;
        var errorDiv = document.querySelector('.quiz-question-block .contact-error');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'contact-error';
          errorDiv.style.color = 'red';
          errorDiv.style.marginTop = '15px';
          errorDiv.style.padding = '10px';
          errorDiv.style.backgroundColor = '#ffebee';
          errorDiv.style.borderRadius = '4px';
          var quizBlock = document.querySelector('.quiz-question-block');
          if (quizBlock) {
            quizBlock.appendChild(errorDiv);
          }
        }
        errorDiv.textContent = 'Пожалуйста, заполните хотя бы одно контактное поле (телефон или email) корректно';
      } else {
        var errorDiv = document.querySelector('.quiz-question-block .contact-error');
        if (errorDiv) {
          errorDiv.remove();
        }
      }
    }
    
    // If the valid status is true, mark the step as finished and valid:
    if (valid) {
      var steps = document.getElementsByClassName("step");
      if (steps && steps[currentTab]) {
        steps[currentTab].className += " finish";
      }
    }
    return valid; // return the valid status
  }

  function fixStepIndicator(n) {
    // This function removes the "active" class of all steps...
    var i, x = document.getElementsByClassName("step");
    if (!x) return;
    
    for (i = 0; i < x.length; i++) {
      x[i].className = x[i].className.replace(" active", "");
    }
    //... and adds the "active" class to the current step:
    if (x[n]) {
      x[n].className += " active";
    }
  }
  
  // Initialize quiz when DOM is ready
  function initQuiz() {
    var quizForm = document.getElementById("quizForm");
    if (!quizForm) {
      // Retry after a short delay if form not found
      setTimeout(initQuiz, 100);
      return;
    }
    
    // Initialize first tab
    showTab(currentTab);
    
    // Set up phone input mask and validation
    var phoneInput = document.getElementById('quiz-tel');
    if (phoneInput) {
      // Устанавливаем начальное значение +7
      if (phoneInput.value.trim() === '') {
        phoneInput.value = '+7';
      }
      
      // Обработчик ввода
      phoneInput.addEventListener('input', function(e) {
        formatPhone(e.target);
      });
      
      // Обработчик фокуса
      phoneInput.addEventListener('focus', function(e) {
        if (e.target.value.trim() === '' || e.target.value.trim() === '+7') {
          e.target.value = '+7';
          e.target.setSelectionRange(4, 4); // Ставим курсор после +7
        }
      });
      
      // Обработчик blur - валидация при потере фокуса
      phoneInput.addEventListener('blur', function(e) {
        if (e.target.value.trim() !== '' && e.target.value.trim() !== '+7') {
          if (!validatePhone(e.target.value)) {
            e.target.classList.add('invalid');
          } else {
            e.target.classList.remove('invalid');
          }
        }
      });
    }
    
    // Set up email validation
    var emailInput = document.getElementById('quiz-email');
    if (emailInput) {
      emailInput.addEventListener('blur', function(e) {
        if (e.target.value.trim() !== '') {
          if (!validateEmail(e.target.value)) {
            e.target.classList.add('invalid');
          } else {
            e.target.classList.remove('invalid');
          }
        }
      });
    }
    
    // Set up next/prev button handlers
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    
    if (prevBtn) {
      prevBtn.onclick = function() { nextPrev(-1); };
    }
    
    if (nextBtn) {
      nextBtn.onclick = function() { nextPrev(1); };
    }
    
    // Make functions global for onclick handlers
    window.nextPrev = nextPrev;
    window.showTab = showTab;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz);
  } else {
    // DOM is already ready
    initQuiz();
  }
})();
