const API_URL = 'http://localhost:3000/api';
let allReviews = [];
let starsChart = null;
let reviewsChart = null;

// Получаем элементы DOM
const reviewsTableBody = document.getElementById('reviewsTableBody');
const reviewsFilter = document.getElementById('reviewsFilter');
const reviewsSearch = document.getElementById('reviewsSearch');
const reviewsSort = document.getElementById('reviewsSort');
const editModal = document.getElementById('editModal');
const editReviewForm = document.getElementById('editReviewForm');
const closeModal = document.querySelector('.close');

// Получаем токен из localStorage
function getToken() {
    return localStorage.getItem('token');
}

function parseToken() {
    const token = getToken();
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// Получаем ID пользователя из токена
function getUserId() {
    const payload = parseToken();
    return payload ? payload.id : null;
}

function requireAuth() {
    const payload = parseToken();
    if (!payload) {
        sessionStorage.setItem('redirectAfterAuth', 'dashboard.html');
        window.location.href = 'login.html';
        return null;
    }
    return payload;
}

function updateBadges() {
    try {
        const cart = window.userStorage && window.userStorage.getStoredList 
            ? window.userStorage.getStoredList('cartItems')
            : (JSON.parse(localStorage.getItem('cartItems')) || []);
        const favs = window.userStorage && window.userStorage.getStoredList
            ? window.userStorage.getStoredList('favoriteItems')
            : (JSON.parse(localStorage.getItem('favoriteItems')) || []);
        const cartBadge = document.getElementById('cartCount');
        const favBadge = document.getElementById('favCount');
        if (cartBadge) {
            cartBadge.textContent = cart.length;
            cartBadge.classList.toggle('hidden', cart.length === 0);
        }
        if (favBadge) {
            favBadge.textContent = favs.length;
            favBadge.classList.toggle('hidden', favs.length === 0);
        }
    } catch (e) {
        const cartBadge = document.getElementById('cartCount');
        const favBadge = document.getElementById('favCount');
        if (cartBadge) {
            cartBadge.textContent = 0;
            cartBadge.classList.add('hidden');
        }
        if (favBadge) {
            favBadge.textContent = 0;
            favBadge.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Загружаем данные пользователя при загрузке страницы
    if (window.userStorage && window.userStorage.loadUserData) {
        window.userStorage.loadUserData();
    }
    const payload = requireAuth();
    if (!payload) return;
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    if (profileName) profileName.textContent = payload.name || 'Пользователь';
    if (profileEmail) profileEmail.textContent = payload.email || '—';
    await loadReviews(payload.id);
    updateBadges();
    addEventListeners();
});

async function loadReviews(userId) {
    try {
        reviewsTableBody.innerHTML = '<tr><td colspan="5" class="loading">Загрузка отзывов...</td></tr>';
        const response = await fetch(`${API_URL}/users/${userId}/reviews`, {
            headers: {
                'Authorization': `Bearer ${getToken() || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            allReviews = result.data || [];
            // Применяем текущие фильтры при загрузке
            filterAndSortReviews();
            updateCharts(allReviews);
        } else {
            console.error('Ошибка загрузки отзывов:', result.error);
            allReviews = [];
            displayReviewsError('Не удалось загрузить отзывы');
        }
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        displayReviewsError('Не удалось загрузить отзывы. Проверьте подключение к серверу.');
    }
}

function displayReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        const searchValue = reviewsSearch ? reviewsSearch.value.trim() : '';
        const filterValue = reviewsFilter ? reviewsFilter.value : 'all';
        
        let message = 'Отзывы не найдены';
        if (searchValue || (filterValue && filterValue !== 'all')) {
            message = 'По вашему запросу отзывы не найдены';
        } else if (allReviews && allReviews.length === 0) {
            message = 'У вас пока нет отзывов';
        }
        
        reviewsTableBody.innerHTML = `<tr><td colspan="5" class="loading">${message}</td></tr>`;
        return;
    }
    
    reviewsTableBody.innerHTML = reviews.map(review => {
        const date = new Date(review.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
        <tr data-id="${review.id}">
            <td>${review.product_name || 'Неизвестный товар'}</td>
            <td>${review.review}</td>
            <td>
                <div class="stars-rating">
                    ${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}
                </div>
            </td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-small btn-edit" onclick="editReview(${review.id})">Редактировать</button>
                <button class="btn btn-small btn-delete" onclick="deleteReview(${review.id})">Удалить</button>
            </td>
        </tr>
        `;
    }).join('');
}

function displayReviewsError(message) {
    reviewsTableBody.innerHTML = `<tr><td colspan="5" class="loading">${message}</td></tr>`;
}

function updateCharts(reviews) {
    // График распределения оценок
    const starsData = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
        starsData[review.stars - 1]++;
    });

    const starsCtx = document.getElementById('starsChart');
    if (starsChart) {
        starsChart.destroy();
    }
    starsChart = new Chart(starsCtx, {
        type: 'bar',
        data: {
            labels: ['1 звезда', '2 звезды', '3 звезды', '4 звезды', '5 звезд'],
            datasets: [{
                label: 'Количество отзывов',
                data: starsData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    top: 15,
                    bottom: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // График отзывов по месяцам
    const monthlyData = {};
    reviews.forEach(review => {
        const date = new Date(review.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const monthlyLabels = sortedMonths.map(monthKey => {
        const [year, monthNum] = monthKey.split('-');
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
    });
    const monthlyValues = sortedMonths.map(monthKey => monthlyData[monthKey]);

    const reviewsCtx = document.getElementById('reviewsChart');
    if (reviewsChart) {
        reviewsChart.destroy();
    }
    reviewsChart = new Chart(reviewsCtx, {
        type: 'line',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Количество отзывов',
                data: monthlyValues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    top: 15,
                    bottom: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function sortReviews(reviews, sortValue) {
    const sorted = [...reviews];
    
    switch(sortValue) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'stars-desc':
            sorted.sort((a, b) => b.stars - a.stars);
            break;
        case 'stars-asc':
            sorted.sort((a, b) => a.stars - b.stars);
            break;
        case 'product-asc':
            sorted.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
            break;
        case 'product-desc':
            sorted.sort((a, b) => (b.product_name || '').localeCompare(a.product_name || ''));
            break;
    }
    
    return sorted;
}

function filterAndSortReviews() {
    if (!allReviews || allReviews.length === 0) {
        displayReviews([]);
        return;
    }
    
    const filterValue = reviewsFilter ? reviewsFilter.value : 'all';
    const searchValue = reviewsSearch ? reviewsSearch.value.toLowerCase().trim() : '';
    const sortValue = reviewsSort ? reviewsSort.value : 'date-desc';
    
    let filtered = allReviews.filter(review => {
        const starsMatch = filterValue === 'all' || review.stars == filterValue;
        
        // Улучшенный поиск - ищем в тексте отзыва и названии товара
        let searchMatch = true;
        if (searchValue) {
            const reviewText = (review.review || '').toLowerCase();
            const productName = (review.product_name || '').toLowerCase();
            // Разбиваем поисковый запрос на слова для более гибкого поиска
            const searchWords = searchValue.split(/\s+/).filter(word => word.length > 0);
            searchMatch = searchWords.some(word => 
                reviewText.includes(word) || productName.includes(word)
            );
        }
        
        return starsMatch && searchMatch;
    });
    
    filtered = sortReviews(filtered, sortValue);
    displayReviews(filtered);
}

function addEventListeners() {
    if (reviewsFilter) {
        reviewsFilter.addEventListener('change', filterAndSortReviews);
    }
    
    if (reviewsSearch) {
        reviewsSearch.addEventListener('input', filterAndSortReviews);
    }
    
    if (reviewsSort) {
        reviewsSort.addEventListener('change', filterAndSortReviews);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    if (editReviewForm) {
        editReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reviewId = document.getElementById('editReviewId').value;
            const review = document.getElementById('editReviewText').value;
            const stars = parseInt(document.getElementById('editReviewStars').value);
            
            await updateReview(reviewId, review, stars);
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Авторизация
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token) {
                localStorage.removeItem('token');
                loginBtn.classList.remove('btn-auth-logout');
                loginBtn.title = 'Войти';
                if (registerBtn) registerBtn.style.display = '';
                showNotification('Вы вышли из системы', 'info');
                window.location.href = 'login.html';
            } else {
                if (loginModal) loginModal.style.display = 'block';
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            showNotification('Вы вышли из системы', 'info');
            window.location.href = 'login.html';
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'block';
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                document.getElementById(modalId).style.display = 'none';
            } else {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            await handleRegister(name, email, password);
        });
    }
    
    // Обновляем статус кнопок
    checkAuthStatus();
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (token && loginBtn) {
        loginBtn.classList.add('btn-auth-logout');
        loginBtn.title = 'Выйти';
        if (registerBtn) registerBtn.style.display = 'none';
    }
}

async function handleLogin(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success && result.data.token) {
            localStorage.setItem('token', result.data.token);
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.style.display = 'none';
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.classList.add('btn-auth-logout');
                loginBtn.title = 'Выйти';
            }
            const registerBtn = document.getElementById('registerBtn');
            if (registerBtn) registerBtn.style.display = 'none';
            showNotification('Вход выполнен успешно!', 'success');
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.reset();
            const payload = parseToken();
            if (payload) {
                if (document.getElementById('profileName')) document.getElementById('profileName').textContent = payload.name || 'Пользователь';
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = payload.email || '—';
                await loadReviews(payload.id);
            } else {
                window.location.reload();
            }
        } else {
            showNotification(result.error || 'Ошибка входа', 'error');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Не удалось войти. Проверьте подключение к серверу.', 'error');
    }
}

async function handleRegister(name, email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const registerModal = document.getElementById('registerModal');
            if (registerModal) registerModal.style.display = 'none';
            showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
            const registerForm = document.getElementById('registerForm');
            if (registerForm) registerForm.reset();
            setTimeout(() => {
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.style.display = 'block';
            }, 1000);
        } else {
            showNotification(result.error || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Не удалось зарегистрироваться. Проверьте подключение к серверу.', 'error');
    }
}

async function editReview(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    document.getElementById('editReviewId').value = reviewId;
    document.getElementById('editReviewText').value = review.review;
    document.getElementById('editReviewStars').value = review.stars;
    editModal.style.display = 'block';
}

async function updateReview(reviewId, review, stars) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify({ review, stars })
        });
        
        const result = await response.json();
        
        if (result.success) {
            editModal.style.display = 'none';
            const userId = getUserId();
            if (userId) {
                await loadReviews(userId);
            }
            showNotification('Отзыв успешно обновлен', 'success');
        } else {
            showNotification(result.error || 'Ошибка при обновлении отзыва', 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления отзыва:', error);
        showNotification('Не удалось обновить отзыв', 'error');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token || ''}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const userId = getUserId();
            if (userId) {
                await loadReviews(userId);
            }
            showNotification('Отзыв успешно удален', 'success');
        } else {
            showNotification(result.error || 'Ошибка при удалении отзыва', 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        showNotification('Не удалось удалить отзыв', 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Экспортируем функции для использования в onclick
window.editReview = editReview;
window.deleteReview = deleteReview;
