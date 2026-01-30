import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Portfolio3D } from './Portfolio3D';

interface PortfolioCase {
  id: string;
  title: string;
  year: string;
  url: string;
  position: [number, number, number];
}

interface Portfolio3DWrapperProps {
  cases?: PortfolioCase[];
}

export function Portfolio3DWrapper({ cases }: Portfolio3DWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Создаем React root для рендеринга 3D компонента
    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }

    rootRef.current.render(<Portfolio3D cases={cases || []} />);

    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, [cases]);

  return <div ref={containerRef} />;
}

// Функция для инициализации 3D портфолио из обычного JavaScript
export function initPortfolio3D(containerId: string, cases?: PortfolioCase[]) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const root = createRoot(container);
  root.render(<Portfolio3D cases={cases || []} />);

  return () => {
    root.unmount();
  };
}

