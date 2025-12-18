const API_URL = 'http://localhost:3000/api';

let map = null;
let markers = [];
let shops = [];
let markerCluster = null;

const shopsList = document.getElementById('shopsList');
const shopsMap = document.getElementById('shopsMap');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const cartBadge = document.getElementById('cartCount');
const favBadge = document.getElementById('favCount');

function updateBadges() {
    try {
        const cart = window.userStorage && window.userStorage.getStoredList 
            ? window.userStorage.getStoredList('cartItems')
            : (JSON.parse(localStorage.getItem('cartItems')) || []);
        const favs = window.userStorage && window.userStorage.getStoredList
            ? window.userStorage.getStoredList('favoriteItems')
            : (JSON.parse(localStorage.getItem('favoriteItems')) || []);
        if (cartBadge) {
            cartBadge.textContent = cart.length;
            cartBadge.classList.toggle('hidden', cart.length === 0);
        }
        if (favBadge) {
            favBadge.textContent = favs.length;
            favBadge.classList.toggle('hidden', favs.length === 0);
        }
    } catch (e) {
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
    // Инициализируем карту
    initMap();
    
    // Ждем, пока карта полностью инициализируется
    let attempts = 0;
    while (!map && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // Если карта все еще не инициализирована, ждем еще немного
    if (map) {
        await new Promise(resolve => {
            map.whenReady(() => resolve());
        });
    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await loadShops();
    addEventListeners();
    checkAuthStatus();
    updateBadges();

    const nearestBtn = document.getElementById('btnNearestShop');
    if (nearestBtn) {
        nearestBtn.addEventListener('click', focusNearestShop);
    }
});

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token && loginBtn) {
        loginBtn.classList.add('btn-auth-logout');
        loginBtn.title = 'Выйти';
        if (registerBtn) registerBtn.style.display = 'none';
    }
}

async function loadShops() {
    try {
        const response = await fetch(`${API_URL}/shops`);
        const result = await response.json();
        
        if (result.success) {
            shops = result.data;
            displayShopsList(shops);
            displayShopsOnMap(shops);
        } else {
            shopsList.innerHTML = '<p class="error-message">Не удалось загрузить магазины</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки магазинов:', error);
        shopsList.innerHTML = '<p class="error-message">Ошибка подключения к серверу</p>';
    }
}

function displayShopsList(shopsListData) {
    if (shopsListData.length === 0) {
        shopsList.innerHTML = '<p class="error-message">Магазины не найдены</p>';
        return;
    }
    
    shopsList.innerHTML = shopsListData.map((shop, index) => {
        const coords = shop.latitude && shop.longitude 
            ? `${shop.latitude.toFixed(6)}, ${shop.longitude.toFixed(6)}`
            : 'Координаты не указаны';
        
        return `
        <div class="shop-item" data-shop-id="${shop.id}" data-index="${index}">
            <h3>Магазин #${shop.id}</h3>
            <p><strong>Адрес:</strong> ${shop.address || 'Не указан'}</p>
            <p class="shop-phone"><strong>Телефон:</strong> ${shop.phone || 'Не указан'}</p>
            <p class="shop-coords"><strong>Координаты:</strong> ${coords}</p>
        </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов
    document.querySelectorAll('.shop-item').forEach(item => {
        item.addEventListener('click', () => {
            const shopId = parseInt(item.getAttribute('data-shop-id'));
            const shop = shops.find(s => s.id === shopId);
            if (shop && shop.latitude && shop.longitude) {
                // Убираем активный класс со всех элементов
                document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('active'));
                // Добавляем активный класс к выбранному
                item.classList.add('active');
                // Центрируем карту на выбранном магазине
                map.setView([shop.latitude, shop.longitude], 15);
                // Открываем попап
                const marker = markers.find(m => m.shopId === shopId);
                if (marker) {
                    marker.openPopup();
                }
            }
        });
    });
}

function initMap() {
    if (!shopsMap) {
        console.error('Элемент карты не найден');
        return;
    }
    
    try {
        // Базовые слои
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        });
        const osmGray = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap & CARTO'
        });

        // Инициализируем карту с центром в Москве
        map = L.map('shopsMap', {
            preferCanvas: false,
            layers: [osm]
        }).setView([55.7558, 37.6176], 10);

        const baseLayers = {
            'Обычная карта': osm,
            'Светлая карта': osmGray
        };
        L.control.layers(baseLayers, null, { position: 'topleft' }).addTo(map);

        markerCluster = L.markerClusterGroup();
        map.addLayer(markerCluster);
        
        // Ждем, пока карта полностью загрузится
        map.whenReady(() => {
            console.log('Карта готова');
        });
        
        // Получаем геолокацию пользователя
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!map) return;
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    
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
                }
            );
        }
    } catch (error) {
        console.error('Ошибка инициализации карты:', error);
    }
}

function displayShopsOnMap(shopsData) {
    if (!map) {
        console.error('Карта не инициализирована, повторная попытка через 500мс...');
        setTimeout(() => displayShopsOnMap(shopsData), 500);
        return;
    }
    
    try {
        // Очищаем существующие маркеры
        if (markerCluster) {
            markerCluster.clearLayers();
        }
        markers = [];
        
        shopsData.forEach(shop => {
            if (shop.latitude && shop.longitude) {
                try {
                    const marker = L.marker([shop.latitude, shop.longitude]);
                    marker.shopId = shop.id;
                    
                    marker.bindPopup(`
                        <div class="shop-popup">
                            <h4>Магазин #${shop.id}</h4>
                            <p><strong>Адрес:</strong> ${shop.address || 'Не указан'}</p>
                            <p><strong>Телефон:</strong> ${shop.phone || 'Не указан'}</p>
                            <p><strong>Координаты:</strong> ${shop.latitude.toFixed(6)}, ${shop.longitude.toFixed(6)}</p>
                            <button onclick="getDirections(${shop.latitude}, ${shop.longitude})" class="btn btn-small">Проложить маршрут</button>
                        </div>
                    `);
                    
                    marker.on('click', () => {
                        // Подсвечиваем соответствующий элемент в списке
                        document.querySelectorAll('.shop-item').forEach(item => {
                            item.classList.remove('active');
                            if (parseInt(item.getAttribute('data-shop-id')) === shop.id) {
                                item.classList.add('active');
                                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        });
                    });
                    
                    markers.push(marker);
                    if (markerCluster) {
                        markerCluster.addLayer(marker);
                    } else {
                        marker.addTo(map);
                    }
                } catch (error) {
                    console.error('Ошибка добавления маркера:', error);
                }
            }
        });
        
        // Если есть магазины, подстраиваем карту под них
        if (shopsData.length > 0 && shopsData.some(s => s.latitude && s.longitude)) {
            try {
                const bounds = L.latLngBounds(
                    shopsData
                        .filter(s => s.latitude && s.longitude)
                        .map(s => [s.latitude, s.longitude])
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            } catch (error) {
                console.error('Ошибка подстройки карты:', error);
            }
        }
    } catch (error) {
        console.error('Ошибка отображения магазинов на карте:', error);
    }
}

async function focusNearestShop() {
    if (!shops || shops.length === 0 || !map) return;

    function distance(lat1, lon1, lat2, lon2) {
        const toRad = x => x * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const locateAndFocus = (userLat, userLng) => {
        let best = null;
        let bestDist = Infinity;
        shops.forEach(shop => {
            if (shop.latitude && shop.longitude) {
                const d = distance(userLat, userLng, shop.latitude, shop.longitude);
                if (d < bestDist) {
                    bestDist = d;
                    best = shop;
                }
            }
        });
        if (!best) return;
        map.setView([best.latitude, best.longitude], 15);
        const marker = markers.find(m => m.shopId === best.id);
        if (marker) marker.openPopup();
        document.querySelectorAll('.shop-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.getAttribute('data-shop-id')) === best.id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => locateAndFocus(pos.coords.latitude, pos.coords.longitude),
            () => {
                const center = map.getCenter();
                locateAndFocus(center.lat, center.lng);
            }
        );
    } else {
        const center = map.getCenter();
        locateAndFocus(center.lat, center.lng);
    }
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

window.getDirections = getDirections;

