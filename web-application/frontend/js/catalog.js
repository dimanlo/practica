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

let allProducts = [];
let filteredProducts = [];

const catalogProducts = document.getElementById('catalogProducts');
const catalogSearch = document.getElementById('catalogSearch');
const catalogCategory = document.getElementById('catalogCategory');
const catalogSort = document.getElementById('catalogSort');
const catalogStats = document.getElementById('catalogStats');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const cartBadge = document.getElementById('cartCount');
const favBadge = document.getElementById('favCount');

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

function getProductForStore(product) {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    // Загружаем данные пользователя при загрузке страницы
    if (window.userStorage && window.userStorage.loadUserData) {
        window.userStorage.loadUserData();
    }
    await loadProducts();
    addEventListeners();
    checkAuthStatus();
    updateBadges();
});

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token && loginBtn) {
        loginBtn.classList.add('btn-auth-logout');
        loginBtn.title = 'Выйти';
        if (registerBtn) registerBtn.style.display = 'none';
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const result = await response.json();
        
        if (result.success) {
            allProducts = result.data;
            filteredProducts = [...allProducts];
            populateCategories();
            displayProducts(filteredProducts);
            updateStats();
        } else {
            catalogProducts.innerHTML = '<p class="error-message">Не удалось загрузить товары</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        catalogProducts.innerHTML = '<p class="error-message">Ошибка подключения к серверу</p>';
    }
}

function populateCategories() {
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const categorySelect = document.getElementById('catalogCategory');
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

function displayProducts(products) {
    if (products.length === 0) {
        catalogProducts.innerHTML = '<p class="error-message">Товары не найдены</p>';
        return;
    }
    
    catalogProducts.innerHTML = products.map(product => {
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
        
        return `
        <div class="product-card" data-id="${product.id}">
            <img src="${productImage}" alt="${product.name}" class="product-image" data-product-id="${product.id}" onerror="this.src='${LOCAL_IMAGES[0]}'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'Описание отсутствует'}</p>
                <p class="product-price">${product.price ? product.price.toFixed(2) : '0.00'} ₽</p>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="viewProduct(${product.id})">Подробнее</button>
                    <button class="btn btn-primary add-to-cart" data-id="${product.id}">В корзину</button>
                    <button class="btn btn-primary add-to-fav" data-id="${product.id}">В избранное</button>
                    <button class="btn btn-primary btn-quick" data-id="${product.id}">Быстрый просмотр</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    attachProductActions();
}

function openQuickView(product) {
    const modal = document.getElementById('quickViewModal');
    const body = document.getElementById('quickViewBody');
    if (!modal || !body) return;

    let productImage = product.image_url;
    if (productImage && productImage.startsWith('img/')) productImage = '../' + productImage;
    if (!productImage || productImage.startsWith('http')) {
        productImage = LOCAL_IMAGES[(product.id - 1) % LOCAL_IMAGES.length];
    }
    body.innerHTML = `
        <div class="product-detail-container" style="gap:1.5rem; margin-bottom:0;">
            <div>
                <img src="${productImage}" alt="${product.name}" class="product-detail-image" style="max-height:320px;object-fit:cover;">
            </div>
            <div class="product-detail-info">
                <span class="product-detail-category">${product.category || 'Без категории'}</span>
                <h2 style="margin:0.5rem 0 0.5rem 0;">${product.name}</h2>
                <div class="product-detail-price">${product.price ? product.price.toFixed(2) : '0.00'} ₽</div>
                <p class="product-detail-description">${product.description || 'Описание отсутствует'}</p>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary add-to-cart" data-id="${product.id}">В корзину</button>
                    <button class="btn btn-primary add-to-fav" data-id="${product.id}">В избранное</button>
                    <button class="btn btn-primary" onclick="viewProduct(${product.id})">Открыть страницу</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    attachProductActions();
}

function attachQuickView() {
    const modal = document.getElementById('quickViewModal');
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const product = allProducts.find(p => p.id === id);
            if (product) openQuickView(product);
        });
    });
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    document.querySelectorAll('[data-modal="quickViewModal"]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const m = document.getElementById('quickViewModal');
            if (m) m.style.display = 'none';
        });
    });
}

function attachProductActions() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const product = allProducts.find(p => p.id === id);
            if (product) {
                toggleItem('cartItems', getProductForStore(product));
            }
        });
    });

    document.querySelectorAll('.add-to-fav').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const product = allProducts.find(p => p.id === id);
            if (product) {
                toggleItem('favoriteItems', getProductForStore(product));
            }
        });
    });
    attachQuickView();
}

function filterAndSortProducts() {
    const searchValue = catalogSearch.value.toLowerCase();
    const categoryValue = catalogCategory.value;
    const sortValue = catalogSort.value;
    
    // Фильтрация
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = searchValue === '' ||
            product.name.toLowerCase().includes(searchValue) ||
            (product.description || '').toLowerCase().includes(searchValue);
        const matchesCategory = categoryValue === '' || product.category === categoryValue;
        return matchesSearch && matchesCategory;
    });
    
    // Сортировка
    filteredProducts.sort((a, b) => {
        switch(sortValue) {
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            default:
                return 0;
        }
    });
    
    displayProducts(filteredProducts);
    updateStats();
}

function updateStats() {
    const total = allProducts.length;
    const showing = filteredProducts.length;
    catalogStats.textContent = `Показано ${showing} из ${total} товаров`;
}

function addEventListeners() {
    if (catalogSearch) {
        catalogSearch.addEventListener('input', filterAndSortProducts);
    }
    
    if (catalogCategory) {
        catalogCategory.addEventListener('change', filterAndSortProducts);
    }
    
    if (catalogSort) {
        catalogSort.addEventListener('change', filterAndSortProducts);
    }
    
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
            if (loginModal) loginModal.style.display = 'none';
            if (loginBtn) {
                loginBtn.classList.add('btn-auth-logout');
                loginBtn.title = 'Выйти';
            }
            if (registerBtn) registerBtn.style.display = 'none';
            showNotification('Вход выполнен успешно!', 'success');
            if (loginForm) loginForm.reset();
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
            if (registerModal) registerModal.style.display = 'none';
            showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
            if (registerForm) registerForm.reset();
            setTimeout(() => {
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

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

window.viewProduct = viewProduct;

