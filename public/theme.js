(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (btn) btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);

  if (btn) {
    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();
