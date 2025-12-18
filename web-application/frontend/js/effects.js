// WOW эффекты для улучшения UX

// Плавное появление элементов при прокрутке (оптимизировано)
// Глобальный observer для всех элементов
let scrollAnimationObserver = null;

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Создаем один observer для всех элементов
    if (!scrollAnimationObserver) {
        scrollAnimationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.hasAttribute('data-scroll-animated')) {
                    entry.target.setAttribute('data-scroll-animated', 'true');
                    entry.target.classList.add('visible');
                    scrollAnimationObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);
    }

    // Добавляем класс fade-in-on-scroll только к элементам, которые еще не были анимированы
    document.querySelectorAll('.product-card:not([data-scroll-animated]), .section-title:not([data-scroll-animated]), .hero:not([data-scroll-animated])').forEach(el => {
        // Пропускаем карточки в карусели
        if (el.classList.contains('product-card') && el.closest('.products-carousel')) {
            return;
        }
        
        // Пропускаем карточки, которые уже были анимированы через initScaleIn
        if (el.classList.contains('product-card') && el.hasAttribute('data-fade-animated')) {
            return;
        }
        
        el.classList.add('fade-in-on-scroll');
        scrollAnimationObserver.observe(el);
    });
}

// Stagger анимация для карточек товаров (упрощено - только для CSS переменных)
function applyStaggerAnimation() {
    const cards = document.querySelectorAll('.product-card:not([data-stagger-applied])');
    cards.forEach((card, index) => {
        // Пропускаем карточки в карусели
        if (card.closest('.products-carousel')) {
            return;
        }
        card.setAttribute('data-stagger-applied', 'true');
        card.style.setProperty('--index', index);
        // Убрали animationDelay - теперь анимация управляется через JavaScript
    });
}

// Магнитный эффект для кнопок (оптимизирован)
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary:not(.carousel-btn):not([data-magnetic-initialized]), .btn-secondary:not(.carousel-btn):not([data-magnetic-initialized])');
    
    buttons.forEach(button => {
        // Пропускаем только кнопки карусели, чтобы не мешать её работе
        if (button.classList.contains('carousel-btn')) {
            return;
        }
        
        // Помечаем кнопку как инициализированную
        button.setAttribute('data-magnetic-initialized', 'true');
        button.classList.add('btn-magnetic');
        
        // Используем requestAnimationFrame для оптимизации
        let rafId = null;
        let lastUpdate = 0;
        const throttleDelay = 16; // ~60fps
        
        const handleMouseMove = (e) => {
            const now = Date.now();
            if (now - lastUpdate < throttleDelay && rafId !== null) {
                return;
            }
            lastUpdate = now;
            
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            
            rafId = requestAnimationFrame(() => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const moveX = x * 0.2;
                const moveY = y * 0.2;
                
                button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
                rafId = null;
            });
        };
        
        const handleMouseLeave = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            button.style.transform = '';
        };
        
        button.addEventListener('mousemove', handleMouseMove, { passive: true });
        button.addEventListener('mouseleave', handleMouseLeave);
    });
}

// Анимация счетчиков корзины/избранного
function animateCounter(element) {
    if (!element) return;
    
    element.classList.add('counter-animate');
    element.classList.add('updated');
    
    setTimeout(() => {
        element.classList.remove('counter-animate');
        setTimeout(() => {
            element.classList.remove('updated');
        }, 600);
    }, 400);
}

// Улучшенные уведомления
function showEnhancedNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Добавляем иконку в зависимости от типа
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    notification.innerHTML = `<span style="margin-right: 8px; font-size: 1.2em;">${icon}</span>${message}`;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Эффект волны для кнопок
function initWaveEffect() {
    const buttons = document.querySelectorAll('.btn-primary:not(.carousel-btn), .btn-secondary:not(.carousel-btn)');
    buttons.forEach(button => {
        // Пропускаем только кнопки карусели
        if (button.classList.contains('carousel-btn')) {
            return;
        }
        button.classList.add('btn-wave');
    });
}

// Плавные переходы между страницами
function initPageTransitions() {
    const links = document.querySelectorAll('a[href]:not([href^="#"]):not([href^="javascript:"])');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Пропускаем внешние ссылки и якоря
            if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) {
                return;
            }
            
            // Плавный переход
            document.body.classList.add('page-transition');
            
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}

// Параллакс эффект для hero
function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroOffset = hero.offsetTop;
        const heroHeight = hero.offsetHeight;
        
        if (scrolled < heroOffset + heroHeight) {
            const parallaxSpeed = 0.3; // Уменьшил скорость для более плавного эффекта
            hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        }
    });
}

// Эффект glow для важных элементов
function initGlowEffect() {
    // Убираем glow эффект - не нужен
    return;
}

// Анимация при загрузке страницы
function initPageLoadAnimation() {
    document.body.style.opacity = '0';
    
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in-out';
        document.body.style.opacity = '1';
    }, 100);
}

// Улучшенные hover эффекты для карточек
function enhanceProductCards() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
        });
    });
}

// Анимация для формы при фокусе
function enhanceFormInputs() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = '';
        });
    });
}

// 3D эффект для карточек товаров - УЛУЧШЕННЫЙ В 10 РАЗ (оптимизирован)
function init3DCards() {
    const cards = document.querySelectorAll('.product-card:not([data-3d-initialized])');
    cards.forEach(card => {
        // Пропускаем карточки в карусели на главной странице, чтобы не мешать её работе
        if (card.closest('.products-carousel')) {
            return;
        }
        
        // Помечаем карточку как инициализированную, чтобы избежать повторной инициализации
        card.setAttribute('data-3d-initialized', 'true');
        card.classList.add('product-card-3d', 'product-card-enhanced', 'tilt-effect');
        
        // Используем requestAnimationFrame для оптимизации производительности
        let rafId = null;
        let lastUpdate = 0;
        const throttleDelay = 16; // ~60fps
        
        const handleMouseMove = (e) => {
            const now = Date.now();
            if (now - lastUpdate < throttleDelay && rafId !== null) {
                return;
            }
            lastUpdate = now;
            
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            
            rafId = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const rotateX = (y / rect.height) * 15;
                const rotateY = (x / rect.width) * -15;
                const translateY = -15 - Math.abs(y / rect.height) * 10;
                const scale = 1.05 + Math.abs(x / rect.width) * 0.05;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${translateY}px) scale(${scale})`;
                
                // Добавляем эффект свечения в зависимости от позиции мыши
                const glowX = (x / rect.width) * 100;
                const glowY = (y / rect.height) * 100;
                card.style.boxShadow = `
                    0 30px 60px rgba(0, 0, 0, 0.2),
                    0 0 50px rgba(102, 126, 234, 0.4),
                    0 0 100px rgba(118, 75, 162, 0.2),
                    ${glowX - 50}px ${glowY - 50}px 80px rgba(102, 126, 234, 0.3)
                `;
                
                rafId = null;
            });
        };
        
        const handleMouseLeave = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            card.style.transform = '';
            card.style.boxShadow = '';
        };
        
        card.addEventListener('mousemove', handleMouseMove, { passive: true });
        card.addEventListener('mouseleave', handleMouseLeave);
    });
}

// Эффект неона для заголовков
function initNeonText() {
    const titles = document.querySelectorAll('.section-title');
    titles.forEach(title => {
        title.classList.add('neon-text', 'gradient-text-animated');
    });
}

// Эффект частиц при клике - УЛУЧШЕННЫЙ В 10 РАЗ
function initParticleEffect() {
    const buttons = document.querySelectorAll('.btn-primary:not(.carousel-btn), .btn-secondary:not(.carousel-btn)');
    
    buttons.forEach(button => {
        // Пропускаем только кнопки карусели
        if (button.classList.contains('carousel-btn')) {
            return;
        }
        
        button.addEventListener('click', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Создаем намного больше частиц с разными размерами и цветами
            const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
            
            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                const angle = (Math.PI * 2 * i) / 30;
                const velocity = 80 + Math.random() * 120;
                const tx = Math.cos(angle) * velocity;
                const ty = Math.sin(angle) * velocity;
                const size = 4 + Math.random() * 8;
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                particle.style.background = `radial-gradient(circle, ${color}, transparent)`;
                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');
                particle.style.animation = `particle ${1 + Math.random()}s ease-out forwards`;
                
                button.style.position = 'relative';
                button.appendChild(particle);
                
                setTimeout(() => particle.remove(), 2000);
            }
            
            // Добавляем эффект ripple
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.width = '0px';
            ripple.style.height = '0px';
            ripple.style.borderRadius = '50%';
            ripple.style.border = '3px solid rgba(102, 126, 234, 0.6)';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.animation = 'ripple 0.8s ease-out';
            ripple.style.pointerEvents = 'none';
            button.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 800);
        });
    });
}

// Эффект shimmer для карточек - УЛУЧШЕННЫЙ (оптимизирован)
function initShimmerEffect() {
    const cards = document.querySelectorAll('.product-card:not([data-shimmer-initialized])');
    cards.forEach(card => {
        // Пропускаем карточки в карусели
        if (card.closest('.products-carousel')) {
            return;
        }
        
        // Помечаем карточку как инициализированную
        card.setAttribute('data-shimmer-initialized', 'true');
        card.classList.add('shimmer-effect');
        
        // Используем CSS-анимацию вместо setInterval для лучшей производительности
        // Анимация будет запускаться через CSS при hover, без JavaScript
    });
}

// Улучшенные кнопки
function initEnhancedButtons() {
    const buttons = document.querySelectorAll('.btn-primary:not(.carousel-btn), .btn-secondary:not(.carousel-btn)');
    buttons.forEach(button => {
        // Пропускаем только кнопки карусели
        if (button.classList.contains('carousel-btn')) {
            return;
        }
        button.classList.add('btn-enhanced', 'btn-morph', 'btn-neon');
    });
}

// Эффект жидкого фона
function initLiquidBackground() {
    const hero = document.querySelector('.hero');
    if (hero) {
        const liquid = document.createElement('div');
        liquid.className = 'liquid-bg';
        hero.style.position = 'relative';
        hero.style.overflow = 'hidden';
        hero.appendChild(liquid);
    }
}

// Эффект вращающегося фона
function initRotatingBackground() {
    // Пропускаем главную страницу - убираем вертящиеся элементы
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        return;
    }
    
    const sections = document.querySelectorAll('.products-section, .map-section');
    sections.forEach(section => {
        const rotating = document.createElement('div');
        rotating.className = 'rotating-bg';
        section.style.position = 'relative';
        section.style.overflow = 'hidden';
        section.insertBefore(rotating, section.firstChild);
    });
}

// Улучшенные уведомления
function enhanceNotifications() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notif => {
        notif.classList.add('notification-enhanced');
    });
}

// Простая анимация появления карточек (легкая версия)
let fadeInObserver = null;
const animatedCardIds = new Set();

function initScaleIn() {
    const cards = document.querySelectorAll('.product-card:not([data-fade-initialized])');
    
    // Создаем один observer для всех карточек
    if (!fadeInObserver) {
        fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const cardId = card.getAttribute('data-id');
                
                // Проверяем, что карточка видна и еще не была анимирована
                if (entry.isIntersecting && !card.hasAttribute('data-fade-animated') && !animatedCardIds.has(cardId)) {
                    card.setAttribute('data-fade-animated', 'true');
                    
                    // Сохраняем ID карточки, чтобы избежать повторной анимации
                    if (cardId) {
                        animatedCardIds.add(cardId);
                    }
                    
                    // Проверяем, что карточка не в карусели
                    if (card.closest('.products-carousel')) {
                        fadeInObserver.unobserve(card);
                        return;
                    }
                    
                    // Простая fade-in анимация
                    card.style.opacity = '0';
                    card.style.transition = 'opacity 0.4s ease-out';
                    
                    requestAnimationFrame(() => {
                        card.style.opacity = '1';
                    });
                    
                    // Отключаем observer для этой карточки после анимации
                    fadeInObserver.unobserve(card);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px'
        });
    }
    
    cards.forEach((card) => {
        // Пропускаем карточки в карусели
        if (card.closest('.products-carousel')) {
            return;
        }
        
        const cardId = card.getAttribute('data-id');
        
        // Если карточка с таким ID уже была анимирована, пропускаем её
        if (cardId && animatedCardIds.has(cardId)) {
            card.setAttribute('data-fade-initialized', 'true');
            card.setAttribute('data-fade-animated', 'true');
            card.style.opacity = '1';
            return;
        }
        
        // Помечаем карточку как инициализированную
        card.setAttribute('data-fade-initialized', 'true');
        
        // Если карточка уже видна при загрузке, сразу показываем её
        const rect = card.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible && !card.hasAttribute('data-fade-animated')) {
            card.setAttribute('data-fade-animated', 'true');
            if (cardId) {
                animatedCardIds.add(cardId);
            }
            card.style.opacity = '1';
        } else {
            // Начальное состояние для невидимых карточек
            card.style.opacity = '0';
            fadeInObserver.observe(card);
        }
    });
}

// Инициализация всех эффектов
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    applyStaggerAnimation();
    initMagneticButtons();
    initWaveEffect();
    initPageTransitions();
    initParallax();
    initGlowEffect();
    initPageLoadAnimation();
    enhanceProductCards();
    enhanceFormInputs();
    
    // БОМБОВЫЕ ЭФФЕКТЫ
    init3DCards();
    initNeonText();
    initParticleEffect();
    initShimmerEffect();
    initEnhancedButtons();
    initLiquidBackground();
    initRotatingBackground();
    enhanceNotifications();
    initScaleIn();
    
    // Обновляем анимации при изменении DOM (для динамически добавленных элементов)
    // Используем debounce для оптимизации производительности
    let mutationTimeout = null;
    const observer = new MutationObserver(() => {
        if (mutationTimeout) {
            clearTimeout(mutationTimeout);
        }
        mutationTimeout = setTimeout(() => {
            applyStaggerAnimation();
            initMagneticButtons();
            init3DCards();
            initNeonText();
            initShimmerEffect();
            initEnhancedButtons();
            initScaleIn();
        }, 100); // Задержка 100ms для группировки изменений
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Экспортируем функции для использования в других файлах
window.effects = {
    animateCounter,
    showEnhancedNotification
};

