function getListKey(mode) {
    return mode === 'favorites' ? 'favoriteItems' : 'cartItems';
}

function readItems(key) {
    if (window.userStorage && window.userStorage.getStoredList) {
        return window.userStorage.getStoredList(key);
    }
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

function saveItems(key, items) {
    if (window.userStorage && window.userStorage.setStoredList) {
        window.userStorage.setStoredList(key, items);
        // Сохраняем данные пользователя
        if (window.userStorage.saveUserData) {
            window.userStorage.saveUserData();
        }
    } else {
        localStorage.setItem(key, JSON.stringify(items));
    }
}

function formatPrice(num) {
    return (num || 0).toFixed(2) + ' ₽';
}

function updateBadges() {
    const cart = readItems('cartItems');
    const favs = readItems('favoriteItems');
    const cartBadge = document.getElementById('cartCount');
    const favBadge = document.getElementById('favCount');
    if (cartBadge) {
        const oldCount = parseInt(cartBadge.textContent) || 0;
        cartBadge.textContent = cart.length;
        cartBadge.classList.toggle('hidden', cart.length === 0);
        // Анимация при изменении счетчика
        if (oldCount !== cart.length && window.effects && window.effects.animateCounter) {
            window.effects.animateCounter(cartBadge);
        }
    }
    if (favBadge) {
        const oldCount = parseInt(favBadge.textContent) || 0;
        favBadge.textContent = favs.length;
        favBadge.classList.toggle('hidden', favs.length === 0);
        // Анимация при изменении счетчика
        if (oldCount !== favs.length && window.effects && window.effects.animateCounter) {
            window.effects.animateCounter(favBadge);
        }
    }
}

function renderList(mode) {
    const key = getListKey(mode);
    const items = readItems(key);
    const container = document.getElementById('listContainer');
    const empty = document.getElementById('emptyState');
    const summary = document.getElementById('summary');
    const checkoutBlock = document.getElementById('checkoutBlock');
    const checkoutStatus = document.getElementById('checkoutStatus');
    const hasSuccess = checkoutStatus && checkoutStatus.dataset.success === 'true';

    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        if (summary) summary.textContent = '';
        if (checkoutBlock) {
            // Оставляем блок видимым, если уже есть успешное оформление
            checkoutBlock.style.display = hasSuccess ? 'block' : 'none';
        }
        return;
    }

    if (empty) empty.style.display = 'none';
    if (checkoutBlock) checkoutBlock.style.display = 'block';

    container.innerHTML = items.map(item => `
        <div class="product-card">
            <img src="${item.image_url?.startsWith('img/') ? '../' + item.image_url : (item.image_url || '../img/i.webp')}"
                 alt="${item.name}" class="product-image" onerror="this.src='../img/i.webp'">
            <div class="product-info">
                <h3 class="product-title">${item.name}</h3>
                <p class="product-price">${formatPrice(item.price)}</p>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary" data-action="remove" data-id="${item.id}">Убрать</button>
                    <a class="btn btn-primary" href="product.html?id=${item.id}">К товару</a>
                </div>
            </div>
        </div>
    `).join('');

    if (summary && mode === 'cart') {
        const total = items.reduce((acc, item) => acc + (item.price || 0), 0);
        summary.textContent = `Итого: ${formatPrice(total)} · Товаров: ${items.length}`;
    } else if (summary) {
        summary.textContent = '';
    }

    container.querySelectorAll('button[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const filtered = items.filter(i => i.id !== id);
            saveItems(key, filtered);
            renderList(mode);
            updateBadges();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Загружаем данные пользователя при загрузке страницы
    if (window.userStorage && window.userStorage.loadUserData) {
        window.userStorage.loadUserData();
    }
    const mode = document.body.getAttribute('data-mode') === 'favorites' ? 'favorites' : 'cart';
    updateBadges();
    renderList(mode);

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            saveItems(getListKey(mode), []);
            renderList(mode);
            updateBadges();
        });
    }

    if (mode === 'cart') {
        const form = document.getElementById('checkoutForm');
        const status = document.getElementById('checkoutStatus');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const items = readItems('cartItems');
                if (items.length === 0) {
                    if (status) {
                        status.textContent = 'Корзина пуста';
                        status.className = 'auth-message auth-error';
                        status.dataset.success = 'false';
                    }
                    return;
                }
                const name = document.getElementById('checkoutName').value.trim();
                const email = document.getElementById('checkoutEmail').value.trim();
                const phone = document.getElementById('checkoutPhone').value.trim();
                const address = document.getElementById('checkoutAddress').value.trim();
                if (!name || !email || !phone || !address) {
                    if (status) {
                        status.textContent = 'Заполните обязательные поля';
                        status.className = 'auth-message auth-error';
                        status.dataset.success = 'false';
                    }
                    return;
                }
                const total = items.reduce((acc, item) => acc + (item.price || 0), 0);
                const message = `Заказ принят! ${items.length} товаров на сумму ${formatPrice(total)}. Мы свяжемся с вами.`;
                if (status) {
                    status.textContent = message;
                    status.className = 'auth-message auth-success';
                    status.dataset.success = 'true';
                    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                form.reset();
                // Блокируем повторную отправку
                Array.from(form.elements).forEach(el => el.disabled = true);
                saveItems('cartItems', []);
                renderList(mode);
                updateBadges();
            });
        }
    }
});

