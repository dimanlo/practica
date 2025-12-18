// Утилита для работы с корзиной и избранным, привязанными к пользователю

function getUserId() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || null;
    } catch {
        return null;
    }
}

function getStoredList(key) {
    // Работаем с обычными ключами (cartItems, favoriteItems)
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function setStoredList(key, list) {
    // Сохраняем в обычные ключи
    localStorage.setItem(key, JSON.stringify(list));
    // Автоматически сохраняем данные пользователя
    saveUserData();
}

function clearUserData() {
    // Очищаем текущие данные (без привязки к пользователю)
    localStorage.removeItem('cartItems');
    localStorage.removeItem('favoriteItems');
    
    // Очищаем данные всех пользователей (опционально, можно оставить для истории)
    // Но для простоты очищаем только текущие
}

function loadUserData() {
    const userId = getUserId();
    if (!userId) {
        // Если пользователь не авторизован, используем общие ключи
        return;
    }
    
    // Загружаем данные пользователя
    const userCartKey = `cartItems_${userId}`;
    const userFavKey = `favoriteItems_${userId}`;
    
    const userCart = localStorage.getItem(userCartKey);
    const userFav = localStorage.getItem(userFavKey);
    
    // Если есть сохраненные данные пользователя, загружаем их в текущие ключи
    if (userCart) {
        localStorage.setItem('cartItems', userCart);
    } else {
        // Если данных нет, очищаем текущие
        localStorage.removeItem('cartItems');
    }
    
    if (userFav) {
        localStorage.setItem('favoriteItems', userFav);
    } else {
        localStorage.removeItem('favoriteItems');
    }
}

function saveUserData() {
    const userId = getUserId();
    if (!userId) return;
    
    // Сохраняем текущие данные в ключи пользователя
    const currentCart = localStorage.getItem('cartItems');
    const currentFav = localStorage.getItem('favoriteItems');
    
    if (currentCart !== null) {
        localStorage.setItem(`cartItems_${userId}`, currentCart);
    } else {
        // Если корзина пуста, сохраняем пустой массив
        localStorage.setItem(`cartItems_${userId}`, JSON.stringify([]));
    }
    if (currentFav !== null) {
        localStorage.setItem(`favoriteItems_${userId}`, currentFav);
    } else {
        // Если избранное пусто, сохраняем пустой массив
        localStorage.setItem(`favoriteItems_${userId}`, JSON.stringify([]));
    }
}

// Экспортируем функции для использования в других файлах
window.userStorage = {
    getStoredList,
    setStoredList,
    clearUserData,
    loadUserData,
    saveUserData,
    getUserId
};

