const THEME_KEY = 'theme';

function applyTheme(theme) {
    const body = document.body;
    const toggle = document.getElementById('themeToggle');
    if (theme === 'dark') {
        body.classList.add('theme-dark');
        if (toggle) toggle.textContent = '☀️ Тема';
    } else {
        body.classList.remove('theme-dark');
        if (toggle) toggle.textContent = '🌙 Тема';
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, next);
            applyTheme(next);
        });
    }
}

document.addEventListener('DOMContentLoaded', initTheme);

