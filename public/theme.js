document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  const label = toggle.querySelector('.theme-toggle__label');
  const storageKey = 'mik-management-theme';

  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
    if (label) {
      label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
    toggle.setAttribute('aria-pressed', theme === 'dark');
  };

  const saved = localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  toggle.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
});
