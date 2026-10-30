import '@/utils/silenceWarnings';
import '@/styles/theme.css';
import '@/styles/global.css';
import { errorMonitoring } from './utils/errorMonitoring';

errorMonitoring.init();

if (typeof window !== 'undefined') {
  (window as unknown as { __originalAlert?: typeof window.alert }).__originalAlert = window.alert;
  window.alert = function (message: string) {
    const w = window as unknown as {
      __showToast?: (m: string, t: string) => void;
      __pendingAlerts?: string[];
    };
    if (w.__showToast) {
      w.__showToast(String(message), 'info');
    } else {
      if (!w.__pendingAlerts) w.__pendingAlerts = [];
      w.__pendingAlerts.push(String(message));
    }
  };
}

document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.classList.add('dark-theme');
document.documentElement.classList.remove('light-theme');
document.body.classList.add('dark-theme');
document.body.classList.remove('light-theme');
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--bg-color', '#141414');
rootStyle.setProperty('--text-color', '#ffffff');
rootStyle.setProperty('--header-bg', '#1a1a1a');
rootStyle.setProperty('--border-color', '#333333');
document.body.style.backgroundColor = '#141414';
document.body.style.color = '#ffffff';

if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }

  const useTicketsHydrate =
    rootElement.hasAttribute('data-react-ssr-home') ||
    rootElement.hasAttribute('data-react-ssr-ticket');

  // CRITICAL: do NOT static-import App here — it pulled ~1MB (gsap/MUI agency) into money LCP.
  if (useTicketsHydrate) {
    void import('@/ssr/hydrateTicketsApp').then(({ hydrateTicketsApp }) => {
      hydrateTicketsApp(rootElement);
    });
  } else {
    void import('./bootstrapSpaApp').then(({ bootstrapSpaApp }) => {
      bootstrapSpaApp(rootElement);
    });
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('bv-ssr-crawl')?.remove();
    });
  });
} catch (error) {
  console.error('[main.tsx] CRITICAL ERROR during React initialization:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; background: #141414; color: #fff; min-height: 100vh;">
        <h2>Критическая ошибка при загрузке</h2>
        <p style="color: #ff6b6b;">${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; font-size: 16px; margin-top: 20px; cursor: pointer;">
          Перезагрузить страницу
        </button>
      </div>
    `;
  }
}
