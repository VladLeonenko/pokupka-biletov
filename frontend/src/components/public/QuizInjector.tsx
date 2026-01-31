import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Quiz } from './Quiz';

/**
 * Компонент для вставки Quiz компонента в места, где найден shortcode [quiz]
 */
export function QuizInjector() {
  const rootsRef = useRef<Map<HTMLElement, Root>>(new Map());

  useEffect(() => {
    // Ищем все элементы с data-quiz-placeholder
    const placeholders = document.querySelectorAll('[data-quiz-placeholder]');
    
    placeholders.forEach((placeholder) => {
      const element = placeholder as HTMLElement;
      
      // Если уже есть root для этого элемента, пропускаем
      if (rootsRef.current.has(element)) {
        return;
      }

      // Создаем контейнер для React компонента
      const container = document.createElement('div');
      container.style.width = '100%';
      element.replaceWith(container);

      // Создаем React root и рендерим Quiz
      const root = createRoot(container);
      root.render(<Quiz />);
      
      rootsRef.current.set(element, root);
    });

    // Cleanup
    return () => {
      rootsRef.current.forEach((root, element) => {
        try {
          root.unmount();
        } catch (error) {
          console.error('[QuizInjector] Error unmounting:', error);
        }
      });
      rootsRef.current.clear();
    };
  }, []);

  return null;
}
