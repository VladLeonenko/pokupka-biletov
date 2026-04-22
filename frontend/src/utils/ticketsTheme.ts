/** Светлая витрина (реф. neglinka29.ru): белый фон, оранжевый акцент в CSS-переменных. */

export function applyTicketsTheme(): void {
  document.documentElement.setAttribute('data-theme', 'tickets');
  document.documentElement.classList.remove('dark-theme');
  document.documentElement.classList.add('tickets-theme');
  document.body.setAttribute('data-tickets', 'true');
  document.body.classList.remove('dark-theme');
  document.body.classList.add('tickets-theme');

  const root = document.documentElement;
  root.style.setProperty('--bg-color', '#ffffff');
  root.style.setProperty('--text-color', '#111111');
  root.style.setProperty('--header-bg', '#ffffff');
  root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
  document.body.style.backgroundColor = '#ffffff';
  document.body.style.color = '#111111';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#ffffff');
}

export function restoreDefaultPublicTheme(): void {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.classList.add('dark-theme');
  document.documentElement.classList.remove('tickets-theme');
  document.body.removeAttribute('data-tickets');
  document.body.classList.add('dark-theme');
  document.body.classList.remove('tickets-theme');

  const root = document.documentElement;
  root.style.setProperty('--bg-color', '#141414');
  root.style.setProperty('--text-color', '#ffffff');
  root.style.setProperty('--header-bg', '#1a1a1a');
  root.style.setProperty('--border-color', '#333333');
  document.body.style.backgroundColor = '#141414';
  document.body.style.color = '#ffffff';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#141414');
}
