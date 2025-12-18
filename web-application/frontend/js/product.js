const API_URL = 'http://localhost:3000/api';
const LOCAL_IMAGES = [
    '../img/i.webp',
    '../img/1547811285_07-asus-rog-zephyrus-s-gx701.jpg',
    '../img/671a22b07214354c99011d74-2.jpg',
    '../img/image.png',
    '../img/orig.webp',
    '../img/scale_1200.jpg',
    '../img/1690877449_dellultrasharp4kmonitorfeatureimage.jpg',
    '../img/orig (1).webp',
    '../img/6870592334.jpg'
];

// Получаем ID товара из URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const cartBadge = document.getElementById('cartCount');
const favBadge = document.getElementById('favCount');
let currentProduct = null;
let allProductsCache = [];

function getStoredList(key) {
    if (window.userStorage && window.userStorage.getStoredList) {
        return window.userStorage.getStoredList(key);
    }
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function setStoredList(key, list) {
    if (window.userStorage && window.userStorage.setStoredList) {
        window.userStorage.setStoredList(key, list);
        // Сохраняем данные пользователя
        if (window.userStorage.saveUserData) {
            window.userStorage.saveUserData();
        }
    } else {
        localStorage.setItem(key, JSON.stringify(list));
    }
}

function updateBadges() {
    const cart = getStoredList('cartItems');
    const favs = getStoredList('favoriteItems');
    if (cartBadge) {
        const oldCount = parseInt(cartBadge.textContent) || 0;
        cartBadge.textContent = cart.length;
        cartBadge.classList.toggle('hidden', cart.length === 0);
        if (oldCount !== cart.length && window.effects && window.effects.animateCounter) {
            window.effects.animateCounter(cartBadge);
        }
    }
    if (favBadge) {
        const oldCount = parseInt(favBadge.textContent) || 0;
        favBadge.textContent = favs.length;
        favBadge.classList.toggle('hidden', favs.length === 0);
        if (oldCount !== favs.length && window.effects && window.effects.animateCounter) {
            window.effects.animateCounter(favBadge);
        }
    }
}

function toggleItem(key, product) {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Войдите, чтобы использовать корзину и избранное', 'info');
        sessionStorage.setItem('redirectAfterAuth', window.location.href);
        return;
    }

    const list = getStoredList(key);
    const exists = list.some(p => p.id === product.id);
    const updated = exists ? list.filter(p => p.id !== product.id) : [...list, product];
    setStoredList(key, updated);
    updateBadges();
    showNotification(
        exists ? `${product.name} удален` : `${product.name} добавлен`,
        'success'
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    // Загружаем данные пользователя при загрузке страницы
    if (window.userStorage && window.userStorage.loadUserData) {
        window.userStorage.loadUserData();
    }
    if (productId) {
        await loadProduct(productId);
        await loadReviews(productId);
    } else {
        document.getElementById('productLoading').textContent = 'Товар не найден';
    }
    await loadAllProducts();
    renderRecommendations();
    addEventListeners();
    checkAuthStatus();
    updateBadges();
});

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

async function loadProduct(id) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`);
        const result = await response.json();
        
        if (result.success) {
            displayProduct(result.data);
        } else {
            document.getElementById('productLoading').textContent = 'Товар не найден';
        }
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        document.getElementById('productLoading').textContent = 'Ошибка загрузки товара';
    }
}

function displayProduct(product) {
    currentProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url
    };
    trackView(product.id);
    // Используем image_url из базы данных
    let productImage = product.image_url;
    
    // Если путь начинается с 'img/', добавляем '../' для правильного пути относительно frontend/
    if (productImage && productImage.startsWith('img/')) {
        productImage = '../' + productImage;
    }
    
    // Если image_url отсутствует или это внешняя ссылка, используем резервную картинку
    if (!productImage || productImage.startsWith('http')) {
        productImage = LOCAL_IMAGES[(product.id - 1) % LOCAL_IMAGES.length];
    }
    
    const imgElement = document.getElementById('productImage');
    imgElement.src = productImage;
    imgElement.onerror = function() {
        this.src = LOCAL_IMAGES[0];
    };
    document.getElementById('productImage').alt = product.name;
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = `${product.price ? product.price.toFixed(2) : '0.00'} ₽`;
    document.getElementById('productDescription').textContent = product.description || 'Описание отсутствует';
    document.getElementById('productCategory').textContent = product.category || 'Без категории';
    document.getElementById('reviewProductId').value = product.id;
    
    document.getElementById('productLoading').style.display = 'none';
    document.getElementById('productContainer').style.display = 'block';
}

async function loadReviews(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}/reviews`);
        const result = await response.json();
        
        if (result.success) {
            displayReviews(result.data);
        } else {
            document.getElementById('reviewsContainer').innerHTML = '<p>Ошибка загрузки отзывов</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        document.getElementById('reviewsContainer').innerHTML = '<p>Ошибка загрузки отзывов</p>';
    }
}

function displayReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = '<p>Отзывов пока нет. Будьте первым!</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => {
        const date = new Date(review.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
        <div class="review-card">
            <div class="review-header">
                <span class="review-author">${review.user_name || 'Анонимный пользователь'}</span>
                <span class="review-date">${formattedDate}</span>
            </div>
            <div class="review-stars">
                ${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}
            </div>
            <p class="review-text">${review.review}</p>
        </div>
        `;
    }).join('');
}

function addEventListeners() {
    const addReviewBtn = document.getElementById('addReviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    const reviewForm = document.getElementById('reviewForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const addCartBtn = document.getElementById('addCartBtn');
    const addFavBtn = document.getElementById('addFavBtn');

    if (addCartBtn) {
        addCartBtn.addEventListener('click', () => {
            if (currentProduct) {
                toggleItem('cartItems', currentProduct);
            }
        });
    }

    if (addFavBtn) {
        addFavBtn.addEventListener('click', () => {
            if (currentProduct) {
                toggleItem('favoriteItems', currentProduct);
            }
        });
    }
    
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token) {
                reviewModal.style.display = 'block';
            } else {
                showNotification('Для оставления отзыва необходимо войти в систему', 'info');
                if (loginModal) loginModal.style.display = 'block';
            }
        });
    }
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('reviewProductId').value;
            const review = document.getElementById('reviewText').value;
            const stars = parseInt(document.getElementById('reviewStars').value);
            
            await submitReview(productId, review, stars);
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                document.getElementById(modalId).style.display = 'none';
            } else {
                e.target.closest('.modal').style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Авторизация
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token) {
                localStorage.removeItem('token');
                loginBtn.classList.remove('btn-auth-logout');
                loginBtn.title = 'Войти';
                if (registerBtn) registerBtn.style.display = '';
                showNotification('Вы вышли из системы', 'info');
            } else {
                if (loginModal) loginModal.style.display = 'block';
            }
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'block';
        });
    }
    
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
}

async function submitReview(productId, review, stars) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Необходимо войти в систему', 'error');
            return;
        }
        
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ product_id: parseInt(productId), review, stars })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('reviewModal').style.display = 'none';
            document.getElementById('reviewForm').reset();
            await loadReviews(productId);
            showNotification('Отзыв успешно добавлен!', 'success');
        } else {
            showNotification(result.error || 'Ошибка при добавлении отзыва', 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления отзыва:', error);
        showNotification('Не удалось добавить отзыв', 'error');
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
            document.getElementById('loginModal').style.display = 'none';
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.classList.add('btn-auth-logout');
                loginBtn.title = 'Выйти';
            }
            const registerBtn = document.getElementById('registerBtn');
            if (registerBtn) registerBtn.style.display = 'none';
            showNotification('Вход выполнен успешно!', 'success');
            if (document.getElementById('loginForm')) document.getElementById('loginForm').reset();
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
            document.getElementById('registerModal').style.display = 'none';
            showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
            if (document.getElementById('registerForm')) document.getElementById('registerForm').reset();
            setTimeout(() => {
                document.getElementById('loginModal').style.display = 'block';
            }, 1000);
        } else {
            showNotification(result.error || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Не удалось зарегистрироваться. Проверьте подключение к серверу.', 'error');
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
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function trackView(id) {
    try {
        const key = 'viewedProducts';
        const arr = JSON.parse(localStorage.getItem(key)) || [];
        const filtered = arr.filter(pid => pid !== id);
        filtered.unshift(id);
        localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
    } catch (e) {}
}

async function loadAllProducts() {
    if (allProductsCache.length) return allProductsCache;
    try {
        const resp = await fetch(`${API_URL}/products`);
        const result = await resp.json();
        if (result.success) {
            allProductsCache = result.data || [];
        }
    } catch (e) {
        console.error('Не удалось загрузить товары для рекомендаций', e);
    }
    return allProductsCache;
}

function renderRecommendations() {
    const container = document.getElementById('recommendContainer');
    if (!container) return;
    const viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]').filter(id => id !== Number(productId));
    if (!allProductsCache.length) {
        container.innerHTML = '<p class="error-message">Рекомендации недоступны</p>';
        return;
    }
    const recs = [];
    for (const id of viewed) {
        const p = allProductsCache.find(prod => prod.id === id);
        if (p && recs.length < 4) recs.push(p);
    }
    if (recs.length === 0) {
        recs.push(...allProductsCache.filter(p => p.id !== Number(productId)).slice(0, 4));
    }
    container.innerHTML = recs.map(p => {
        let img = p.image_url;
        if (img && img.startsWith('img/')) img = '../' + img;
        if (!img || img.startsWith('http')) img = LOCAL_IMAGES[(p.id - 1) % LOCAL_IMAGES.length];
        return `
        <div class="product-card" style="min-width:240px;">
            <img src="${img}" alt="${p.name}" class="product-image" onclick="viewProduct(${p.id})" style="cursor:pointer;" onerror="this.src='${LOCAL_IMAGES[0]}'">
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-price">${p.price ? p.price.toFixed(2) : '0.00'} ₽</p>
                <button class="btn btn-primary" onclick="viewProduct(${p.id})">Открыть</button>
            </div>
        </div>
        `;
    }).join('');
}

