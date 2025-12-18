function initContactsMap() {
    const mapEl = document.getElementById('contactsMap');
    if (!mapEl) return;

    const map = L.map('contactsMap').setView([55.7558, 37.6176], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const office = {
        coords: [55.7558, 37.6176],
        title: 'Офис на Тверской, 1'
    };
    L.marker(office.coords).addTo(map).bindPopup(office.title).openPopup();
}

function handleContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('contactStatus');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !message) {
            status.textContent = 'Заполните все поля';
            status.className = 'auth-message auth-error';
            return;
        }

        // Имитация отправки (можно заменить на реальный endpoint)
        status.textContent = 'Сообщение отправлено! Мы свяжемся с вами.';
        status.className = 'auth-message auth-success';
        form.reset();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initContactsMap();
    handleContactForm();
});

