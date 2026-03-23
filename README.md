# 🎮 Bosinn Elite Clicker

Telegram Web App кликер игра с системой перерождений, улучшений и автокликером.

![Bosinn Elite](public/bosinn_elite.jpg)

## 🌟 Особенности

- 🔐 Безопасная авторизация через Telegram
- 💰 Система токенов и улучшений
- 🔄 5 уровней перерождений
- 🤖 Автокликер
- ✖️ Множители
- 🎨 Красивый дизайн в черно-серо-белых тонах
- 🛡️ Защита от XSS атак и rate limiting
- 📱 Адаптивный интерфейс

## 🚀 Быстрый старт

### Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Запустите сервер:
```bash
npm start
```

3. Откройте http://localhost:3000

**Примечание**: В режиме разработки (без TELEGRAM_BOT_TOKEN) на клиенте будет показана страница блокировки, но сервер будет работать.

### Деплой в Telegram

Следуйте инструкциям в [QUICK_START.md](QUICK_START.md) или [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 📋 Требования

- Node.js 14+
- npm или yarn
- Telegram бот (создается через @BotFather)

## 🎯 Игровая механика

### Основы
- Кликайте по круглой кнопке для получения токенов
- Покупайте улучшения для увеличения эффективности
- Переродитесь для получения постоянных бонусов

### Улучшения
- **Сила клика**: Увеличивает токены за клик
- **Авто-кликер**: Автоматически кликает (макс 20 уровней)
- **Множитель**: Умножает все токены (макс 50 уровней)

### Перерождения
- **Уровень 0**: Новичок Босинн
- **Уровень 1**: Босинн Cheap
- **Уровень 2**: Босинн Smiley
- **Уровень 3**: Босинн Brutal
- **Уровень 4**: Босинн Elite
- **Уровень 5**: Босинн Omega (максимум)

Каждое перерождение сбрасывает прогресс, но дает постоянный бонус к множителю!

## 🔒 Безопасность

- ✅ PBKDF2 хеширование (для будущих расширений)
- ✅ HMAC-SHA256 валидация Telegram initData
- ✅ XSS защита через санитизацию
- ✅ Rate limiting (клики, улучшения, авторизация)
- ✅ Helmet.js для HTTP заголовков
- ✅ Валидация всех входных данных
- ✅ Защита от переполнения чисел
- ✅ Атомарная запись файлов

## 🛠️ Технологии

### Backend
- Node.js
- Express.js
- express-session
- express-validator
- express-rate-limit
- helmet

### Frontend
- Vanilla JavaScript
- CSS3 (градиенты, анимации)
- Telegram Web App SDK

### Хранилище
- JSON файлы (users.json, gamedata.json)
- Легко мигрировать на MongoDB/PostgreSQL

## 📁 Структура проекта

```
bosinn-clicker/
├── public/              # Клиентские файлы
│   ├── index.html      # Главная страница
│   ├── style.css       # Стили
│   ├── script.js       # Игровая логика
│   └── *.png/jpg       # Изображения Босинна
├── server.js           # Express сервер
├── package.json        # Зависимости
├── .gitignore         # Игнорируемые файлы
├── .env.example       # Шаблон переменных окружения
├── README.md          # Этот файл
├── QUICK_START.md     # Быстрый старт
├── DEPLOYMENT_GUIDE.md # Полное руководство
└── TELEGRAM_SETUP.md  # Настройка Telegram
```

## 🌐 Деплой

### Рекомендуемые платформы

1. **Render.com** (бесплатно, рекомендуется)
   - Автоматический деплой из GitHub
   - HTTPS из коробки
   - Простая настройка

2. **Railway.app** (альтернатива)
   - Быстрый деплой
   - Удобный интерфейс

3. **Heroku** (платно)
   - Надежный хостинг
   - Много дополнений

### Переменные окружения

Обязательные:
- `TELEGRAM_BOT_TOKEN` - токен от @BotFather
- `SESSION_SECRET` - случайная строка 32+ символов
- `NODE_ENV=production`
- `STRICT_TELEGRAM_MODE=true`

## 📝 Лицензия

MIT License - используйте свободно!

## 🤝 Вклад

Pull requests приветствуются! Для больших изменений сначала откройте issue.

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Посмотрите логи на хостинге
3. Убедитесь, что все переменные окружения установлены

## 🎨 Кастомизация

### Изменить изображения Босинна
Замените файлы в `public/`:
- `bosinn_cheap.png`
- `bosinn_smiley.png`
- `bosinn_brutal.png`
- `bosinn_elite.jpg`
- `bosinn_omega.png`

### Изменить цвета
Отредактируйте `public/style.css`:
```css
/* Основной градиент */
background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);

/* Акцентный цвет */
background: linear-gradient(45deg, #FF6B6B, #FF5252);
```

### Изменить балансировку
В `server.js` измените формулы стоимости:
```javascript
const costs = {
    click_power: Math.floor(10 * Math.pow(1.5, currentData.click_power - 1)),
    auto_clicker: Math.floor(100 * Math.pow(2, currentData.auto_clicker)),
    multiplier: Math.floor(1000 * Math.pow(3, currentData.multiplier - 1))
};
```

## 🔮 Будущие улучшения

- [ ] База данных (MongoDB/PostgreSQL)
- [ ] Таблица лидеров
- [ ] Достижения
- [ ] Ежедневные награды
- [ ] Реферальная система
- [ ] Звуковые эффекты
- [ ] Больше уровней перерождений
- [ ] Магазин скинов

## 📊 Статистика

- Языки: JavaScript, HTML, CSS
- Размер: ~50KB (без node_modules)
- Зависимости: 6 основных пакетов
- Поддержка: Node.js 14+

---

Сделано с ❤️ для Telegram Web Apps
