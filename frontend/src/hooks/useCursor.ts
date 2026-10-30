import { useEffect } from 'react';

declare global {
  interface Window {
    cursorPosition?: {
      x: number;
      y: number;
      isStuck: boolean;
    };
  }
}

/**
 * Custom cursor (large/small circles) via rAF + CSS transform only.
 * No GSAP CDN — keeps public first paint free of third-party animation scripts.
 */
export function useCursor(currentPath?: string, disableCustomCursor?: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (disableCustomCursor) return;

    if (window.innerWidth < 1024) return;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rawPath = currentPath ?? window.location.pathname;
    const normalizedPath = rawPath.replace(/\/+$/, '') || '/';
    if (normalizedPath.startsWith('/admin')) return;

    let animationId: number | null = null;
    let cursorLarge: HTMLElement | null = null;
    let cursorSmall: HTMLElement | null = null;
    let customStyle: HTMLStyleElement | null = null;
    let handleResize: (() => void) | null = null;
    let smallScale = 1;

    const handleMouseMove = (e: MouseEvent) => {
      if (!window.cursorPosition) return;
      window.cursorPosition.x = e.clientX;
      window.cursorPosition.y = e.clientY;
      if (cursorLarge && cursorSmall) {
        cursorLarge.style.opacity = '1';
        cursorSmall.style.opacity = '1';
      }
    };

    const handleMouseDown = () => {
      smallScale = 2;
    };

    const handleMouseUp = () => {
      smallScale = 1;
    };

    const handleDOMContentLoaded = () => {
      setTimeout(initCursor, 50);
    };

    const initCursor = () => {
      document.querySelector('.cursor--large')?.remove();
      document.querySelector('.cursor--small')?.remove();

      cursorLarge = document.createElement('div');
      cursorLarge.className = 'cursor cursor--large';
      cursorLarge.setAttribute('data-cursor-managed', 'react');
      cursorLarge.style.cssText =
        'position: fixed; left: 0; top: 0; pointer-events: none; z-index: 9999; opacity: 0; will-change: transform;';
      document.body.appendChild(cursorLarge);

      cursorSmall = document.createElement('div');
      cursorSmall.className = 'cursor cursor--small';
      cursorSmall.setAttribute('data-cursor-managed', 'react');
      cursorSmall.style.cssText =
        'position: fixed; left: 0; top: 0; pointer-events: none; z-index: 10000; opacity: 0; will-change: transform;';
      document.body.appendChild(cursorSmall);

      if (document.body) {
        document.body.style.cursor = 'none';
      }

      if (!document.querySelector('#custom-cursor-styles')) {
        customStyle = document.createElement('style');
        customStyle.id = 'custom-cursor-styles';
        customStyle.textContent = `
          body {
            cursor: none !important;
          }

          input, textarea, select,
          [contenteditable="true"],
          .chat-widget, .chat-widget *,
          .MuiDialog-root, .MuiDialog-root *,
          .MuiModal-root, .MuiModal-root *,
          .show_popup, .show_popup *,
          iframe, iframe * {
            cursor: auto !important;
          }

          a[href],
          button:not(:disabled),
          [role="button"],
          [role="link"],
          input[type="submit"],
          input[type="button"],
          input[type="reset"],
          label[for],
          select,
          summary,
          .cursor-pointer,
          .MuiButton-root,
          .MuiIconButton-root,
          .MuiChip-root,
          .MuiTab-root,
          .MuiLink-root,
          .MuiListItemButton-root,
          .MuiCardActionArea-root {
            cursor: pointer !important;
          }

          .cursor {
            pointer-events: none !important;
            z-index: 9999 !important;
            position: fixed !important;
          }
          .cursor--large {
            border: 1px solid #FB0 !important;
            border-radius: 50% !important;
            width: 40px !important;
            height: 40px !important;
          }
          .cursor--small {
            background: #FB0 !important;
            border-radius: 50% !important;
            width: 10px !important;
            height: 10px !important;
            transition: transform 0.15s ease-out;
          }

          body:has(input:hover) .cursor,
          body:has(textarea:hover) .cursor,
          body:has(.chat-widget:hover) .cursor,
          body:has(.MuiDialog-root) .cursor,
          body:has(.show_popup) .cursor {
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(customStyle);
      }

      initCursorDirectly(cursorLarge, cursorSmall);
    };

    const initCursorDirectly = (large: HTMLElement, small: HTMLElement) => {
      if (!window.cursorPosition) {
        window.cursorPosition = { x: -100, y: -100, isStuck: false };
      }

      const largeRect = large.getBoundingClientRect();
      let cursorOuterOriginalState = {
        width: largeRect.width || 40,
        height: largeRect.height || 40,
      };

      handleResize = () => {
        const rect = large.getBoundingClientRect();
        cursorOuterOriginalState = {
          width: rect.width || 40,
          height: rect.height || 40,
        };
      };
      window.addEventListener('resize', handleResize, { passive: true });

      const updateCursor = () => {
        if (!large || !small || !window.cursorPosition) return;

        const { x, y, isStuck } = window.cursorPosition;

        small.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${smallScale})`;
        if (!isStuck) {
          large.style.transform = `translate(${x - cursorOuterOriginalState.width / 2}px, ${y - cursorOuterOriginalState.height / 2}px)`;
        }

        animationId = requestAnimationFrame(updateCursor);
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mousedown', handleMouseDown, { passive: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });

      updateCursor();
    };

    if (document.body) {
      setTimeout(initCursor, 50);
    } else {
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }

      if (document.body) {
        document.body.style.cursor = '';
      }

      cursorLarge?.remove();
      cursorSmall?.remove();
      customStyle?.remove();

      if (window.cursorPosition) {
        delete window.cursorPosition;
      }
    };
  }, [currentPath, disableCustomCursor]);
}
