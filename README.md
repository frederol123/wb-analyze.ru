# WB Analyzer

Анализ цен и выгодности ниш на Wildberries, выгрузка в CSV. Расширение для Chrome + лендинг + оплата через ЮKassa.

## Структура
```
wb-analyzer/   — Chrome-расширение (Manifest V3)
landing/       — страницы сайта (product.html, privacy.html; на сервере отдаёт Laravel)
backend/       — Laravel-бэкенд: лицензии + платежи ЮKassa
widget/        — автономный виджет «Купить PRO» (встраиваемый)
```

## Сайт
https://wb-analazuer.ru · https://wb-analazuer.ru/privacy

## API
- `POST /api/wb/licenses` — создать платёж (ЮKassa) → `license_key` + `confirmation_url`
- `POST /api/wb/licenses/check` — проверить ключ
- `POST /api/wb/licenses/webhook` — вебхук ЮKassa
