function toggleNavAuth() {
    const token = localStorage.getItem('token');
    const isAuth = !!token;
    const authItem = document.getElementById('nav-auth');
    const logoutItem = document.getElementById('nav-logout');
    const cabinetItem = document.getElementById('nav-cabinet');

    if (authItem) authItem.classList.toggle('hidden', isAuth);
    if (logoutItem) logoutItem.classList.toggle('hidden', !isAuth);
    if (cabinetItem) cabinetItem.classList.toggle('hidden', !isAuth);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleNavAuth();
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Сохраняем данные пользователя перед выходом
            if (window.userStorage && window.userStorage.saveUserData) {
                window.userStorage.saveUserData();
            }
            localStorage.removeItem('token');
            // Очищаем текущие корзину и избранное
            if (window.userStorage && window.userStorage.clearUserData) {
                window.userStorage.clearUserData();
            }
            toggleNavAuth();
            window.location.href = 'login.html';
        });
    }
});

// Экспортируем для вызова после успешного логина
window.toggleNavAuth = toggleNavAuth;

// Синхронизация между вкладками
window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
        toggleNavAuth();
    }
});

