# Схема базы данных

## Описание

База данных SQLite содержит 4 таблицы для хранения информации о пользователях, товарах, отзывах и магазинах.

## Таблицы

### Users (Пользователи)
```sqlite-sql
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT
email TEXT UNIQUE
password TEXT NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Products (Товары)
```sqlite-sql
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT
price REAL
description TEXT
image_url TEXT
category TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Reviews (Отзывы)
```sqlite-sql
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id INTEGER NOT NULL
product_id INTEGER NOT NULL
review TEXT NOT NULL
stars INTEGER CHECK (stars >= 1 AND stars <= 5) NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY(user_id) REFERENCES users(id)
FOREIGN KEY(product_id) REFERENCES products(id)
```

### Shops (Магазины)
```sqlite-sql
id INTEGER PRIMARY KEY AUTOINCREMENT
address TEXT
phone TEXT
latitude REAL
longitude REAL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Связи между таблицами

- `reviews.user_id` ссылается на `users.id`
- `reviews.product_id` ссылается на `products.id`