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

let products = [];
let currentCarouselIndex = 0;
let itemsPerView = 5;

const productsContainer = document.getElementById('productsContainer');
const scrollToProductsBtn = document.getElementById('scrollToProducts');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
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

// Определяем количество элементов на экране в зависимости от размера
function updateItemsPerView() {
    const width = window.innerWidth;
    if (width < 480) {
        itemsPerView = 1;
    } else if (width < 768) {
        itemsPerView = 2;
    } else if (width < 1200) {
        itemsPerView = 3;
    } else {
        itemsPerView = 5;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Загружаем данные пользователя при загрузке страницы
    if (window.userStorage && window.userStorage.loadUserData) {
        window.userStorage.loadUserData();
    }
    updateItemsPerView();
    window.addEventListener('resize', () => {
        updateItemsPerView();
        updateCarouselIndicators();
        updateCarouselPosition();
    });
    
    await loadProducts();
    initMap();
    addEventListeners();
    initCarousel();
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
            products = result.data;
            displayProducts(products);
            updateCarouselIndicators();
        } else {
            console.error('Ошибка загрузки товаров:', result.error);
            displayError('Не удалось загрузить товары');
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        displayError('Ошибка подключения к серверу');
    }
}

function displayProducts(productsToShow) {
    if (productsToShow.length === 0) {
        productsContainer.innerHTML = '<p class="error-message">Товары не найдены</p>';
        return;
    }
    
    productsContainer.innerHTML = productsToShow.map((product) => {
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
                <button class="btn btn-primary" onclick="viewProduct(${product.id})">Подробнее</button>
            </div>
        </div>
        `;
    }).join('');
    
    updateCarouselPosition();
}

function displayError(message) {
    productsContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Повторить попытку</button>
        </div>
    `;
}

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

function initCarousel() {
    if (carouselPrev && carouselNext) {
        carouselPrev.addEventListener('click', () => {
            if (currentCarouselIndex > 0) {
                currentCarouselIndex--;
                updateCarouselPosition();
                updateCarouselIndicators();
            }
        });
        
        carouselNext.addEventListener('click', () => {
            const maxIndex = Math.max(0, products.length - itemsPerView);
            if (currentCarouselIndex < maxIndex) {
                currentCarouselIndex++;
                updateCarouselPosition();
                updateCarouselIndicators();
            } else {
                // Если достигли конца, прокручиваем до последнего товара
                const cardWidth = productsContainer.querySelector('.product-card')?.offsetWidth || 300;
                const gap = 32;
                const containerWidth = productsContainer.parentElement?.offsetWidth || window.innerWidth;
                const totalWidth = (products.length * (cardWidth + gap)) - gap;
                const maxTranslate = Math.max(0, totalWidth - containerWidth);
                
                if (maxTranslate > 0) {
                    currentCarouselIndex = products.length - 1;
                    updateCarouselPosition();
                    updateCarouselIndicators();
                }
            }
        });
    }
}

function updateCarouselPosition() {
    if (!productsContainer) return;
    
    const cardWidth = productsContainer.querySelector('.product-card')?.offsetWidth || 300;
    const gap = 32; // 2rem gap
    const containerWidth = productsContainer.parentElement?.offsetWidth || window.innerWidth;
    
    // Вычисляем максимальный сдвиг, чтобы последний товар был полностью виден
    const totalWidth = (products.length * (cardWidth + gap)) - gap;
    const maxTranslate = Math.max(0, totalWidth - containerWidth);
    
    // Вычисляем позицию на основе индекса
    let translateX = -(currentCarouselIndex * (cardWidth + gap));
    
    // Если это последний товар, убеждаемся, что он полностью виден
    if (currentCarouselIndex >= products.length - itemsPerView) {
        translateX = -maxTranslate;
    }
    
    // Ограничиваем сдвиг, чтобы не выйти за пределы
    translateX = Math.max(translateX, -maxTranslate);
    translateX = Math.min(translateX, 0);
    
    productsContainer.style.transform = `translateX(${translateX}px)`;
    productsContainer.style.transition = 'transform 0.5s ease-in-out';
}

function updateCarouselIndicators() {
    const indicators = document.getElementById('carouselIndicators');
    if (!indicators) return;
    
    const maxIndex = Math.max(0, products.length - itemsPerView);
    
    // Для главной страницы делаем намного больше индикаторов для лучшей навигации
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    
    if (isIndexPage) {
        // На главной странице: индикаторов столько, сколько позиций можно прокрутить, но не меньше 15 и не больше 30
        const calculatedIndicators = Math.max(1, maxIndex + 1);
        const totalIndicators = Math.min(Math.max(15, calculatedIndicators), 30);
        
        indicators.innerHTML = '';
        
        // Создаем индикатор для каждой позиции карусели
        for (let i = 0; i <= maxIndex; i++) {
            const indicator = document.createElement('span');
            const isActive = (currentCarouselIndex === i);
            
            indicator.className = `indicator ${isActive ? 'active' : ''}`;
            
            indicator.addEventListener('click', () => {
                currentCarouselIndex = i;
                updateCarouselPosition();
                updateCarouselIndicators();
            });
            
            indicators.appendChild(indicator);
        }
        return;
    }
    
    // Для других страниц: минимум 5, максимум 10
    const minIndicators = 5;
    const maxIndicators = 10;
    
    // Вычисляем количество индикаторов
    const totalIndicators = Math.min(Math.max(minIndicators, Math.ceil(products.length / itemsPerView)), maxIndicators);
    
    indicators.innerHTML = '';
    
    // Создаем индикаторы
    for (let i = 0; i < totalIndicators; i++) {
        const indicator = document.createElement('span');
        
        // Вычисляем позицию в карусели для каждого индикатора
        const targetIndex = maxIndex > 0 ? Math.round((i / (totalIndicators - 1)) * maxIndex) : 0;
        
        // Определяем, должен ли этот индикатор быть активным
        let isActive = false;
        if (maxIndex === 0) {
            isActive = (i === 0);
        } else {
            const rangeStart = i === 0 ? 0 : Math.round(((i - 0.5) / (totalIndicators - 1)) * maxIndex);
            const rangeEnd = i === totalIndicators - 1 ? maxIndex : Math.round(((i + 0.5) / (totalIndicators - 1)) * maxIndex);
            isActive = (currentCarouselIndex >= rangeStart && currentCarouselIndex <= rangeEnd);
        }
        
        indicator.className = `indicator ${isActive ? 'active' : ''}`;
        
        // Делаем индикатор кликабельным
        indicator.addEventListener('click', () => {
            currentCarouselIndex = targetIndex;
            updateCarouselPosition();
            updateCarouselIndicators();
        });
        
        indicators.appendChild(indicator);
    }
}

function initMap() {
    const map = L.map('map').setView([55.7558, 37.6176], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                map.setView([userLat, userLng], 13);
                
                const userIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                
                const userMarker = L.marker([userLat, userLng], {icon: userIcon})
                    .addTo(map)
                    .bindPopup('Вы находитесь здесь')
                    .openPopup();
            },
            (error) => {
                console.warn('Не удалось получить местоположение пользователя:', error);
                loadShops(map);
            }
        );
    } else {
        console.warn('Геолокация не поддерживается браузером');
        loadShops(map);
    }
    
    loadShops(map);
}

async function loadShops(map) {
    try {
        const response = await fetch(`${API_URL}/shops`);
        const result = await response.json();
        
        if (result.success) {
            displayShopsOnMap(result.data, map);
        } else {
            console.error('Ошибка загрузки магазинов:', result.error);
        }
    } catch (error) {
        console.error('Ошибка сети при загрузке магазинов:', error);
    }
}

function displayShopsOnMap(shops, map) {
    shops.forEach(shop => {
        if (shop.latitude && shop.longitude) {
            const marker = L.marker([shop.latitude, shop.longitude]).addTo(map);
            marker.bindPopup(`
                <div class="shop-popup">
                    <h4>Магазин</h4>
                    <p><strong>Адрес:</strong> ${shop.address}</p>
                    <p><strong>Телефон:</strong> ${shop.phone || 'Не указан'}</p>
                    <p><strong>Координаты:</strong> ${shop.latitude.toFixed(6)}, ${shop.longitude.toFixed(6)}</p>
                    <button onclick="getDirections(${shop.latitude}, ${shop.longitude})" class="btn btn-small">Проложить маршрут</button>
                </div>
            `);
        }
    });
}

function getDirections(lat, lng) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${lat},${lng}&travelmode=driving`;
                window.open(googleMapsUrl, '_blank');
            },
            (error) => {
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                window.open(googleMapsUrl, '_blank');
            }
        );
    } else {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(googleMapsUrl, '_blank');
    }
}

function addEventListeners() {
    if (scrollToProductsBtn) {
        scrollToProductsBtn.addEventListener('click', () => {
            document.querySelector('.products-section').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
    
    // Модальные окна
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
            registerModal.style.display = 'block';
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
    
    // Формы
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

    const soundBtn = document.getElementById('soundBtn');
    const soundAudio = document.getElementById('soundAudio');

    if (soundBtn && soundAudio) {
        let isPlaying = false;
        soundBtn.addEventListener('click', async () => {
            try {
                if (!isPlaying) {
                    soundAudio.currentTime = 0;
                    await soundAudio.play();
                    isPlaying = true;
                    soundBtn.textContent = 'Пауза';
                } else {
                    soundAudio.pause();
                    isPlaying = false;
                    soundBtn.textContent = 'Включить звук';
                }
            } catch (e) {
                console.error('Не удалось воспроизвести звук', e);
            }
        });
        soundAudio.addEventListener('ended', () => {
            isPlaying = false;
            soundBtn.textContent = 'Включить звук';
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
            registerModal.style.display = 'none';
            showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
            registerForm.reset();
            // Автоматически открываем форму входа
            setTimeout(() => {
                loginModal.style.display = 'block';
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

// Анимации при скролле
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.product-card, .section-title, .hero');
    animatedElements.forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
});

// Экспортируем функции для использования в onclick
window.viewProduct = viewProduct;
window.getDirections = getDirections;
