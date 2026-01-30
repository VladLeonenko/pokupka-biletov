// Оптимизированный скрипт курсора для всех страниц
(function() {
  'use strict';

  // Проверяем наличие элементов курсора (игнорируем те, что управляются React)
  const cursorOuter = document.querySelector(".cursor--large:not([data-cursor-managed='react'])");
  const cursorInner = document.querySelector(".cursor--small:not([data-cursor-managed='react'])");
  
  if (!cursorOuter || !cursorInner) {
    return; // Курсор не нужен на этой странице или управляется React
  }

  let isStuck = false;
  let mouse = { x: -100, y: -100 };
  let scrollHeight = 0;

  // Отслеживание скролла
  window.addEventListener('scroll', function() {
    scrollHeight = window.scrollY;
  }, { passive: true });

  let cursorOuterOriginalState = {
    width: cursorOuter.getBoundingClientRect().width,
    height: cursorOuter.getBoundingClientRect().height,
  };

  // Проверяем поддержку GSAP
  let gsapAvailable = false;
  if (typeof gsap !== 'undefined') {
    gsapAvailable = true;
  } else {
    // Fallback без GSAP - используем обычный CSS transform
    cursorOuter.style.transition = 'transform 0.15s ease-out, width 0.2s ease-out, height 0.2s ease-out, border-radius 0.2s ease-out, background-color 0.2s ease-out';
    cursorInner.style.transition = 'transform 0.15s ease-out';
  }

  const buttons = document.querySelectorAll("main button, a.btn, .btn");
  
  buttons.forEach((button) => {
    button.addEventListener("pointerenter", handleMouseEnter);
    button.addEventListener("pointerleave", handleMouseLeave);
  });

  document.body.addEventListener("pointermove", updateCursorPosition, { passive: true });
  
  document.body.addEventListener("pointerdown", () => {
    if (gsapAvailable) {
      gsap.to(cursorInner, { duration: 0.15, scale: 2 });
    } else {
      cursorInner.style.transform = 'scale(2)';
    }
  }, { passive: true });
  
  document.body.addEventListener("pointerup", () => {
    if (gsapAvailable) {
      gsap.to(cursorInner, { duration: 0.15, scale: 1 });
    } else {
      cursorInner.style.transform = 'scale(1)';
    }
  }, { passive: true });

  function updateCursorPosition(e) {
    mouse.x = e.pageX;
    mouse.y = e.pageY;
  }

  function updateCursor() {
    if (gsapAvailable) {
      gsap.set(cursorInner, {
        x: mouse.x,
        y: mouse.y,
      });

      if (!isStuck) {
        gsap.to(cursorOuter, {
          duration: 0.15,
          x: mouse.x - cursorOuterOriginalState.width/2,
          y: mouse.y - cursorOuterOriginalState.height/2,
        });
      }
    } else {
      // Fallback без GSAP
      cursorInner.style.transform = `translate(${mouse.x}px, ${mouse.y}px) scale(1)`;
      
      if (!isStuck) {
        cursorOuter.style.transform = `translate(${mouse.x - cursorOuterOriginalState.width/2}px, ${mouse.y - cursorOuterOriginalState.height/2}px)`;
      }
    }

    requestAnimationFrame(updateCursor);
  }

  // Запускаем обновление курсора
  updateCursor();

  function handleMouseEnter(e) {
    isStuck = true;
    const targetBox = e.currentTarget.getBoundingClientRect();
    
    if (gsapAvailable) {
      gsap.to(cursorOuter, {
        duration: 0.2,
        x: targetBox.left,
        y: targetBox.top + scrollHeight,
        width: targetBox.width,
        height: targetBox.width,
        borderRadius: 0,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
      });
    } else {
      cursorOuter.style.left = targetBox.left + 'px';
      cursorOuter.style.top = (targetBox.top + scrollHeight) + 'px';
      cursorOuter.style.width = targetBox.width + 'px';
      cursorOuter.style.height = targetBox.width + 'px';
      cursorOuter.style.borderRadius = '0';
      cursorOuter.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }
  }

  function handleMouseLeave(e) {
    isStuck = false;
    
    if (gsapAvailable) {
      gsap.to(cursorOuter, {
        duration: 0.2,
        width: cursorOuterOriginalState.width,
        height: cursorOuterOriginalState.width,
        borderRadius: "50%",
        backgroundColor: "transparent",
      });
    } else {
      cursorOuter.style.width = cursorOuterOriginalState.width + 'px';
      cursorOuter.style.height = cursorOuterOriginalState.width + 'px';
      cursorOuter.style.borderRadius = '50%';
      cursorOuter.style.backgroundColor = 'transparent';
    }
  }

  // Обработка изменения размера окна
  window.addEventListener('resize', function() {
    cursorOuterOriginalState = {
      width: cursorOuter.getBoundingClientRect().width,
      height: cursorOuter.getBoundingClientRect().height,
    };
  }, { passive: true });
})();



