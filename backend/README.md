# Backend — WB Analyzer (Laravel + ЮKassa)

Минимальный срез Laravel-бэкенда, который обслуживает покупку PRO для расширения и лендинга. Файлы лежат с сохранением структуры Laravel — их можно перенести в любой Laravel 12-проект.

## Что делает
- Создаёт платёж в ЮKassa (СБП/карта) и выдаёт лицензионный ключ
- Проверяет статус платежа и активирует лицензию (`succeeded`)
- Принимает вебхуки ЮKassa
- Если ЮKassa не настроена — работает демо-режим (выдаёт ключ без оплаты)

## Состав
```
app/Services/YookassaService.php              — клиент ЮKassa (redirect-сценарий, возврат по app.url)
app/Http/Controllers/Api/WbLicenseController.php — create / check / webhook
app/Http/Controllers/Api/PaymentController.php    — общий (старый) контур платежей
app/Models/WbLicense.php                        — модель лицензии
database/migrations/…_create_wb_licenses_table.php
config/yookassa.php
routes/api.php   (routes: /api/wb/licenses, /licenses/check, /licenses/webhook)
routes/web.php   (routes: / — лендинг, /privacy)
```

## Роуты
| Метод | Путь | Описание |
|---|---|---|
| POST | /api/wb/licenses | создать платёж → license_key + confirmation_url |
| POST | /api/wb/licenses/check | проверить ключ (при оплате сам обновляет статус) |
| POST | /api/wb/licenses/webhook | вебхук ЮKassa (не обязателен) |
| GET  | /  | лендинг |
| GET  | /privacy | политика конфиденциальности |

## Установка
```bash
composer install --no-dev
cp .env.example .env            # вписать APP_KEY, ЮKassa-ключи
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve               # или за nginx/php-fpm
```

## Конфиг ЮKassa (в .env)
```
YOOKASSA_SHOP_ID=1455434
YOOKASSA_SECRET_KEY=live_...
YOOKASSA_CAPTURE=true
```
Пока `SECRET_KEY` плейсхолдер — API отвечает в демо-режиме (`demo: true`, ключ выдаётся без оплаты).

## Важно
- Не коммить реальный `.env` (в репо только `.env.example`)
- Секрет в YookassaService требует числовой ShopID — поэтому в .env ставим `1455434`
