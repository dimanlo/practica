const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));

const db = new Database();

app.use((req, res, next) => {
    req.db = db;
    next();
});

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Токен доступа отсутствует'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Недействительный токен'
            });
        }
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const result = await db.register({ name, email, password });
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.login({ email, password });
        
        // Создаем JWT токен (добавляем имя для отображения в профиле)
        const token = jwt.sign(
            { id: result.id, email: result.email, name: result.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                ...result,
                token
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await db.getAllProducts();
        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await db.getProductById(productId);
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const reviews = await db.getReviewsByProductId(productId);
        res.json({
            success: true,
            data: reviews,
            count: reviews.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/users/:id/reviews', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const reviews = await db.getReviewsByUserId(userId);
        res.json({
            success: true,
            data: reviews,
            count: reviews.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { product_id, review, stars } = req.body;
        const user_id = req.user.id; // Получаем ID из токена
        const result = await db.createReview({
            user_id: parseInt(user_id),
            product_id: parseInt(product_id),
            review,
            stars: parseInt(stars)
        });
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/reviews/:id', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const review = await db.getReviewById(reviewId);
        res.json({
            success: true,
            data: review
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const { review, stars } = req.body;
        const userId = req.user.id; // Получаем ID из токена
        const result = await db.updateReview(reviewId, { review, stars }, userId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const userId = req.user.id; // Получаем ID из токена
        const result = await db.deleteReview(reviewId, userId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/shops', async (req, res) => {
    try {
        const shops = await db.getAllShops();
        res.json({
            success: true,
            data: shops,
            count: shops.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, description, image_url, category } = req.body;
        const result = await db.createProduct({
            name,
            price: parseFloat(price),
            description,
            image_url,
            category
        });
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/shops', async (req, res) => {
    try {
        const { address, phone, latitude, longitude } = req.body;
        const result = await db.createShop({
            address,
            phone,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null
        });
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API работает',
        endpoints: {
            auth: {
                register: 'POST /api/register',
                login: 'POST /api/login'
            },
            products: {
                getAll: 'GET /api/products',
                getById: 'GET /api/products/:id',
                create: 'POST /api/products'
            },
            reviews: {
                getByProduct: 'GET /api/products/:id/reviews',
                getByUser: 'GET /api/users/:id/reviews',
                create: 'POST /api/reviews'
            },
            shops: {
                getAll: 'GET /api/shops',
                create: 'POST /api/shops'
            }
        }
    });
});

app.use((error, req, res, next) => {
    console.error('Ошибка сервера:', error);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
    });
});

const startServer = async () => {
    try {
        const products = await db.getAllProducts();
        
        // Удаляем дубликаты MacBook (оставляем только первый)
        const macbookProducts = products.filter(p => p.name && p.name.toLowerCase().includes('macbook'));
        if (macbookProducts.length > 1) {
            // Удаляем все кроме первого
            for (let i = 1; i < macbookProducts.length; i++) {
                try {
                    await db.deleteProduct(macbookProducts[i].id);
                    console.log(`Удален дубликат: ${macbookProducts[i].name} (ID: ${macbookProducts[i].id})`);
                } catch (error) {
                    console.error(`Ошибка удаления дубликата: ${error.message}`);
                }
            }
        }
        
        // Обновляем список продуктов после удаления
        const updatedProducts = await db.getAllProducts();
        
        // Обновляем картинки для существующих товаров
        // Сопоставление товаров с правильными картинками
        // Правильно: ASUS ROG ноутбук (1547811285_07-asus-rog-zephyrus-s-gx701.jpg), Монитор 27 дюймов (1690877449_dellultrasharp4kmonitorfeatureimage.jpg)
        // Исправляем остальные по скриншоту
        const productImageMap = {
            'Смартфон iPhone 15': 'img/image.png',
            'Ноутбук Apple MacBook Pro': 'img/orig.webp',
            'Игровой ноутбук ASUS ROG': 'img/1547811285_07-asus-rog-zephyrus-s-gx701.jpg',
            'Беспроводные наушники': 'img/6870592334.jpg',
            'Планшет Samsung Galaxy Tab': 'img/scale_1200.jpg',
            'Игровая мышь Razer': 'img/orig (1).webp',
            'Клавиатура механическая': 'img/i.webp',
            'Монитор 27 дюймов': 'img/1690877449_dellultrasharp4kmonitorfeatureimage.jpg',
            'Веб-камера Logitech': 'img/671a22b07214354c99011d74-2.jpg',
            'Игровой монитор ASUS': 'img/i (1).webp',
            'Игровая клавиатура Corsair': 'img/corsar.jpg',
            'Внешний жесткий диск 2TB': 'img/disk.webp',
            'SSD накопитель 1TB': 'img/operativa.webp',
            'Игровой процессор AMD Ryzen 9': 'img/amd.webp',
            'Видеокарта NVIDIA RTX 4080': 'img/videokarta.jpg',
            'Блок питания 850W': 'img/block.jpg',
            'Материнская плата ASUS': 'img/asus.jpg',
            'Оперативная память 32GB DDR5': 'img/ddr5.webp',
            'Смартфон Samsung Galaxy S24': 'img/galaxsi.webp',
            'Ноутбук Dell XPS 15': 'img/dell.webp',
            'Наушники Sony WH-1000XM5': 'img/sony.jpg',
            'Графический планшет Wacom': 'img/wacom.jpg',
            'Игровой коврик Razer': 'img/razer.jpg',
            'Микрофон Blue Yeti': 'img/yeti.webp',
            'Смарт-часы Apple Watch': 'img/apple.webp'
        };
        
        // Принудительно обновляем все картинки для существующих товаров
        for (const product of updatedProducts) {
            if (productImageMap[product.name]) {
                try {
                    await db.updateProduct(product.id, { image_url: productImageMap[product.name] });
                    console.log(`Обновлена картинка для товара: ${product.name} -> ${productImageMap[product.name]}`);
                } catch (error) {
                    console.error(`Ошибка обновления картинки для ${product.name}:`, error.message);
                }
            }
        }
        
        // Получаем обновленный список после обновления картинок
        const finalProducts = await db.getAllProducts();
        
        if (finalProducts.length < 25) {
            // Список всех товаров
            const allProducts = [
                {
                    name: 'Смартфон iPhone 15',
                    price: 89999.00,
                    description: 'Новейший смартфон Apple с отличной камерой и производительностью',
                    image_url: 'img/image.png',
                    category: 'Электроника'
                },
                {
                    name: 'Ноутбук Apple MacBook Pro',
                    price: 159999.00,
                    description: 'Мощный ноутбук для работы и развлечений',
                    image_url: 'img/orig.webp',
                    category: 'Компьютеры'
                },
                {
                    name: 'Игровой ноутбук ASUS ROG',
                    price: 129999.00,
                    description: 'Мощный игровой ноутбук с видеокартой RTX 4060 и процессором Intel Core i7',
                    image_url: 'img/1547811285_07-asus-rog-zephyrus-s-gx701.jpg',
                    category: 'Компьютеры'
                },
                {
                    name: 'Беспроводные наушники',
                    price: 2999.00,
                    description: 'Качественные беспроводные наушники с шумоподавлением',
                    image_url: 'img/6870592334.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Планшет Samsung Galaxy Tab',
                    price: 24999.00,
                    description: 'Современный планшет с большим экраном и высокой производительностью',
                    image_url: 'img/scale_1200.jpg',
                    category: 'Электроника'
                },
                {
                    name: 'Игровая мышь Razer',
                    price: 4999.00,
                    description: 'Профессиональная игровая мышь с RGB подсветкой',
                    image_url: 'img/orig (1).webp',
                    category: 'Аксессуары'
                },
                {
                    name: 'Клавиатура механическая',
                    price: 7999.00,
                    description: 'Механическая клавиатура с переключателями Cherry MX',
                    image_url: 'img/i.webp',
                    category: 'Аксессуары'
                },
                {
                    name: 'Монитор 27 дюймов',
                    price: 19999.00,
                    description: '4K монитор с высокой частотой обновления',
                    image_url: 'img/1690877449_dellultrasharp4kmonitorfeatureimage.jpg',
                    category: 'Компьютеры'
                },
                {
                    name: 'Веб-камера Logitech',
                    price: 3999.00,
                    description: 'HD веб-камера для видеозвонков и стриминга',
                    image_url: 'img/671a22b07214354c99011d74-2.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Игровой монитор ASUS',
                    price: 34999.00,
                    description: 'Игровой монитор 144Hz с технологией G-Sync',
                    image_url: 'img/i (1).webp',
                    category: 'Компьютеры'
                },
                {
                    name: 'Смартфон Samsung Galaxy S24',
                    price: 79999.00,
                    description: 'Флагманский смартфон с камерой 200 МП и процессором Snapdragon 8 Gen 3',
                    image_url: 'img/galaxsi.webp',
                    category: 'Электроника'
                },
                {
                    name: 'Ноутбук Dell XPS 15',
                    price: 119999.00,
                    description: 'Премиальный ноутбук с OLED дисплеем и процессором Intel Core i9',
                    image_url: 'img/dell.webp',
                    category: 'Компьютеры'
                },
                {
                    name: 'Наушники Sony WH-1000XM5',
                    price: 24999.00,
                    description: 'Премиальные наушники с активным шумоподавлением и 30-часовой батареей',
                    image_url: 'img/sony.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Игровая клавиатура Corsair',
                    price: 12999.00,
                    description: 'Механическая игровая клавиатура с RGB подсветкой и программируемыми клавишами',
                    image_url: 'img/corsar.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Графический планшет Wacom',
                    price: 44999.00,
                    description: 'Профессиональный графический планшет для дизайнеров и художников',
                    image_url: 'img/wacom.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Внешний жесткий диск 2TB',
                    price: 5999.00,
                    description: 'Портативный жесткий диск USB 3.0 для хранения данных',
                    image_url: 'img/disk.webp',
                    category: 'Аксессуары'
                },
                {
                    name: 'SSD накопитель 1TB',
                    price: 7999.00,
                    description: 'Быстрый SSD накопитель NVMe для ускорения компьютера',
                    image_url: 'img/operativa.webp',
                    category: 'Аксессуары'
                },
                {
                    name: 'Игровой процессор AMD Ryzen 9',
                    price: 44999.00,
                    description: 'Мощный процессор для игр и профессиональных задач',
                    image_url: 'img/amd.webp',
                    category: 'Компьютеры'
                },
                {
                    name: 'Видеокарта NVIDIA RTX 4080',
                    price: 99999.00,
                    description: 'Топовая видеокарта для игр в 4K и профессиональной работы',
                    image_url: 'img/videokarta.jpg',
                    category: 'Компьютеры'
                },
                {
                    name: 'Блок питания 850W',
                    price: 8999.00,
                    description: 'Мощный блок питания с сертификатом 80 Plus Gold',
                    image_url: 'img/block.jpg',
                    category: 'Компьютеры'
                },
                {
                    name: 'Материнская плата ASUS',
                    price: 19999.00,
                    description: 'Премиальная материнская плата с поддержкой DDR5 и PCIe 5.0',
                    image_url: 'img/asus.jpg',
                    category: 'Компьютеры'
                },
                {
                    name: 'Оперативная память 32GB DDR5',
                    price: 12999.00,
                    description: 'Высокоскоростная оперативная память для игровых ПК',
                    image_url: 'img/ddr5.webp',
                    category: 'Компьютеры'
                },
                {
                    name: 'Игровой коврик Razer',
                    price: 1999.00,
                    description: 'Большой игровой коврик с RGB подсветкой',
                    image_url: 'img/razer.jpg',
                    category: 'Аксессуары'
                },
                {
                    name: 'Микрофон Blue Yeti',
                    price: 12999.00,
                    description: 'Профессиональный USB микрофон для стриминга и записи',
                    image_url: 'img/yeti.webp',
                    category: 'Аксессуары'
                },
                {
                    name: 'Смарт-часы Apple Watch',
                    price: 29999.00,
                    description: 'Умные часы с функциями фитнеса и уведомлениями',
                    image_url: 'img/apple.webp',
                    category: 'Электроника'
                }
            ];
            
            // Проверяем, какие товары уже есть
            const existingNames = finalProducts.map(p => p.name);
            let addedCount = 0;
            
            // Добавляем только те товары, которых еще нет
            for (const product of allProducts) {
                if (!existingNames.includes(product.name)) {
                    try {
                        await db.createProduct(product);
                        existingNames.push(product.name);
                        addedCount++;
                        console.log(`Добавлен товар: ${product.name}`);
                    } catch (error) {
                        console.error(`Ошибка добавления товара ${product.name}:`, error.message);
                    }
                } else {
                    // Если товар уже существует, обновляем его изображение, если оно изменилось
                    const existingProduct = finalProducts.find(p => p.name === product.name);
                    if (existingProduct && existingProduct.image_url !== product.image_url) {
                        try {
                            await db.updateProduct(existingProduct.id, { image_url: product.image_url });
                            console.log(`Обновлено изображение для товара: ${product.name} -> ${product.image_url}`);
                        } catch (error) {
                            console.error(`Ошибка обновления изображения для ${product.name}:`, error.message);
                        }
                    }
                }
            }
            
            const finalCount = await db.getAllProducts();
            console.log(`Товары обработаны. Добавлено новых: ${addedCount}, всего товаров в базе: ${finalCount.length}`);
        } else {
            console.log(`Товаров достаточно (${finalProducts.length}), пропускаем добавление. Обновляем изображения...`);
            // Обновляем изображения для существующих товаров
            for (const product of finalProducts) {
                if (productImageMap[product.name] && product.image_url !== productImageMap[product.name]) {
                    try {
                        await db.updateProduct(product.id, { image_url: productImageMap[product.name] });
                        console.log(`Обновлено изображение для товара: ${product.name} -> ${productImageMap[product.name]}`);
                    } catch (error) {
                        console.error(`Ошибка обновления изображения для ${product.name}:`, error.message);
                    }
                }
            }
        }
        
        const shops = await db.getAllShops();
        if (shops.length < 5) {
            const allShops = [
                {
                    address: 'ул. Тверская, 1',
                    phone: '+7 (495) 123-45-67',
                    latitude: 55.7558,
                    longitude: 37.6176
                },
                {
                    address: 'пр. Мира, 15',
                    phone: '+7 (495) 234-56-78',
                    latitude: 55.7950,
                    longitude: 37.6400
                },
                {
                    address: 'ул. Арбат, 25',
                    phone: '+7 (495) 345-67-89',
                    latitude: 55.7520,
                    longitude: 37.5920
                },
                {
                    address: 'Ленинский проспект, 50',
                    phone: '+7 (495) 456-78-90',
                    latitude: 55.7000,
                    longitude: 37.5700
                },
                {
                    address: 'ул. Новый Арбат, 10',
                    phone: '+7 (495) 567-89-01',
                    latitude: 55.7525,
                    longitude: 37.5900
                }
            ];
            
            // Проверяем, какие магазины уже есть
            const existingAddresses = shops.map(s => s.address);
            
            // Добавляем только те магазины, которых еще нет
            for (const shop of allShops) {
                if (!existingAddresses.includes(shop.address)) {
                    await db.createShop(shop);
                    existingAddresses.push(shop.address);
                }
            }
            
            console.log(`Магазины добавлены. Всего магазинов в базе: ${shops.length + (allShops.length - shops.length)}`);
        }
    } catch (error) {
        console.error('Ошибка при добавлении тестовых данных:', error.message);
    }
    
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
        console.log(`API доступно по адресу: http://localhost:${PORT}/api`);
    });
};

process.on('SIGINT', async () => {
    console.log('\nЗавершение работы сервера...');
    if (db) {
        await db.close();
    }
    process.exit(0);
});

startServer().catch(console.error);