# 🚀 Деплой Bosinn Clicker в Telegram

## Шаг 1: Подготовка

```bash
# Установите зависимости
npm install

# Создайте .gitignore (уже есть)
# Создайте .env.example (уже есть)
```

## Шаг 2: GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ваш-username/bosinn-clicker.git
git push -u origin main
```

## Шаг 3: Telegram бот

1. @BotFather → `/newbot`
2. Название: `Bosinn Elite Clicker`
3. Username: `bosinn_elite_bot`
4. **Сохраните токен!**

## Шаг 4: Render.com

1. Зарегистрируйтесь на https://render.com
2. New + → Web Service → выберите репозиторий
3. Настройки:
   - Build: `npm install`
   - Start: `npm start`
   - Instance: Free

4. Environment Variables:
   ```
   TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
   NODE_ENV=production
   STRICT_TELEGRAM_MODE=true
   ```

5. Create Web Service → скопируйте URL

## Шаг 5: Web App

1. @BotFather → `/newapp`
2. Выберите бота
3. Название: `Bosinn Elite`
4. Описание: `Кликер игра`
5. Загрузите фото (512x512)
6. **URL**: ваш URL с Render
7. Короткое название: `bosinn`

## Шаг 6: Кнопка меню

```
@BotFather → /setmenubutton
Выберите бота
Текст: 🎮 Играть
URL: ваш URL с Render
```

## Готово! 🎉

Откройте бота → нажмите кнопку → играйте!

---

## Обновление

```bash
git add .
git commit -m "update"
git push
```

Render автоматически задеплоит новую версию.

---

## Проблемы?

- Проверьте логи на Render (Dashboard → Logs)
- Убедитесь, что все 3 переменные окружения установлены
- URL в @BotFather должен быть с https://
- В браузере должна быть страница "Доступ запрещен"
- В Telegram должна работать игра
