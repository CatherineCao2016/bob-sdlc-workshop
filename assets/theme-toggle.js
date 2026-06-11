(function () {
  const STORAGE_KEY = 'bob-demo-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  applyTheme(getTheme());

  function init() {
    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });

    const header = document.querySelector('.header, .nav-header');
    const navLinks = header ? header.querySelectorAll('a.nav-link') : [];
    const lastNavLink = navLinks[navLinks.length - 1];
    if (lastNavLink && lastNavLink.parentElement) {
      lastNavLink.parentElement.insertBefore(btn, lastNavLink.nextSibling);
      // If the nav-link is a direct child of header (e.g. index.html),
      // push the first nav-link right so [links, toggle] cluster on the right.
      if (header && lastNavLink.parentElement === header && navLinks[0]) {
        navLinks[0].style.marginLeft = 'auto';
      }
    } else if (header) {
      header.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    applyTheme(getTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
