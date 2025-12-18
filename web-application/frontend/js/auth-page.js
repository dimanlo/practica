const API_URL = 'http://localhost:3000/api';

function showMessage(text, type = 'info') {
    const box = document.getElementById('authMessage');
    if (!box) return;
    box.textContent = text;
    box.className = `auth-message auth-${type}`;
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function redirectAfterAuth() {
    const from = sessionStorage.getItem('redirectAfterAuth');
    if (from) {
        sessionStorage.removeItem('redirectAfterAuth');
        window.location.href = from;
    } else {
        window.location.href = 'index.html';
    }
}

async function handleLogin(email, password) {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (result.success && result.data.token) {
        setToken(result.data.token);
        // Загружаем данные пользователя (корзину и избранное)
        if (window.userStorage && window.userStorage.loadUserData) {
            window.userStorage.loadUserData();
        }
        if (window.toggleNavAuth) window.toggleNavAuth();
        showMessage('Вход выполнен успешно, перенаправляю...', 'success');
        setTimeout(redirectAfterAuth, 500);
    } else {
        throw new Error(result.error || 'Ошибка входа');
    }
}

async function handleRegister(name, email, password) {
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    const result = await res.json();
    if (result.success) {
        showMessage('Регистрация успешна! Сейчас перенаправим на вход...', 'success');
        setTimeout(() => window.location.href = 'login.html', 800);
    } else {
        throw new Error(result.error || 'Ошибка регистрации');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const mode = body.getAttribute('data-auth-mode') || 'login';
    const form = document.getElementById('authForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            showMessage('');
            if (mode === 'login') {
                const email = document.getElementById('authEmail').value;
                const password = document.getElementById('authPassword').value;
                await handleLogin(email, password);
            } else {
                const name = document.getElementById('authName').value;
                const email = document.getElementById('authEmail').value;
                const password = document.getElementById('authPassword').value;
                await handleRegister(name, email, password);
            }
        } catch (err) {
            showMessage(err.message || 'Ошибка. Попробуйте снова.', 'error');
        }
    });
});

