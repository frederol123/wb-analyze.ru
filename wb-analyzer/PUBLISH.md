# Публикация в Chrome Web Store — чек-лист

## 1. Файл для загрузки
`wb-analyzer.zip` (13 КБ) — уже собран, manifest в корне. Файл лежит на машине:
`F:\Temp\opencode\wb-analyzer.zip`
(при пересборке: скопировать папку `Desktop\wb-analyzer` → zip через правый клик → «Сжать» — папка, а не содержимое, нужен правильный уровень вложенности: manifest.json должен быть сразу внутри zip).

## 2. Аккаунт разработчика
- Зайди https://developer.chrome.com/docs/webstore/register/ → Register as developer
- Разовый взнос **$5** (карта)
- Оплати и заполни профиль

## 3. Загрузить
- https://chrome.google.com/webstore/devconsole → New item → Upload → выбери `wb-analyzer.zip`
- Заполни форму (тексты уже в `STORE.md`, скопировать оттуда)

## 4. Скриншоты 1280×800 (обязательно, 4-5 шт)
Сделать с реального расширения на wildberries.ru:
1. Попап с кнопкой «Анализировать страницу»
2. Сводка: медиана, спрос (Σ отзывов), насыщенность, скидки
3. Таблица с бейджами 🟢 Выгодно / 🟡 Средне / 🔴 Сложно
4. Скачанный CSV в Excel
5. Лендинг https://wb-analazuer.ru/ (опционально)

Как снять попап 1280×800: DevTools → Ctrl+Shift+M (device mode) → размер 1280×800 → открыть попап.

## 5. Поля формы
- Имя: WB Analyzer — анализ цен Wildberries + CSV
- Краткое описание: см. STORE.md (≤132 симв)
- Описание полное: см. STORE.md
- Категория: Shopping
- Язык: Русский, English
- Кнопки: нет
- Сайт: https://wb-analazuer.ru/
- Приватность: https://wb-analazuer.ru/ (policy на лендинге) — или приложи privacy.html

## 6. Проверка/публикация
- Статус Pending review 1-3 дня
- После одобрения → нажать Publish
- Учти: данные о доступе к хостам wildberries + webhook URL → вебхук ЮKassa, оплата через расширение

## 7. После публикации
- Трафик: Product Hunt, VC.ru, Telegram-каналы продавцов WB, r/chrome_extensions
- Замени демо-PRO на реальную ЮKassa (ключ уже придет)
