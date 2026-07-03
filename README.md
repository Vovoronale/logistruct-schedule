# Графік випуску креслень

Вебверсія Excel-графіка для публічного перегляду та захищеного редагування. Інтерфейс містить 68 початкових креслень, пошук і фільтри, календар Ганта, кольорові позначки виконавців та автоматичний розрахунок завершення в робочих днях.

## Можливості

- публічний перегляд без входу;
- редагування після введення пароля адміністратора;
- зміна всіх полів, додавання, видалення та переставляння рядків;
- збереження даних у Cloudflare D1;
- Excel-подібні кольори: блакитне чергування рядків, рожеві вихідні та окремий колір кожного виконавця;
- адаптивний вигляд із горизонтальним прокручуванням таблиці на телефоні.

## Локальний запуск

Потрібен Node.js 20 або новіший.

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run build
npx wrangler d1 migrations apply logistruct-schedule-db --local
npm run dev:cf
```

Після запуску відкрийте адресу, яку покаже Wrangler. Пароль задається у `.dev.vars` змінною `ADMIN_PASSWORD`.

Швидкі перевірки:

```powershell
npm test
npm run lint
npm run build
```

## Розгортання на Cloudflare Pages

Проєкт розрахований на Pages Functions і D1 та може працювати в межах безкоштовних лімітів Cloudflare для невеликого робочого графіка.

1. Увійдіть у Cloudflare:

   ```powershell
   npx wrangler login
   ```

2. Створіть базу та скопіюйте виданий `database_id`:

   ```powershell
   npx wrangler d1 create logistruct-schedule-db
   ```

3. Додайте `"database_id": "отриманий-id"` до об'єкта `d1_databases` у `wrangler.jsonc`.

4. Створіть Pages-проєкт:

   ```powershell
   npx wrangler pages project create logistruct-schedule
   ```

5. У Cloudflare Dashboard відкрийте **Workers & Pages → logistruct-schedule → Settings → Variables and Secrets** та додайте зашифровані секрети:

   - `ADMIN_PASSWORD` — ваш складний пароль адміністратора;
   - `SESSION_SECRET` — довгий випадковий рядок, щонайменше 32 символи.

6. Застосуйте початкову міграцію до віддаленої D1:

   ```powershell
   npx wrangler d1 migrations apply logistruct-schedule-db --remote
   ```

7. Зберіть і опублікуйте сайт:

   ```powershell
   npm run deploy
   ```

Після публікації сайт буде доступний за адресою `https://logistruct-schedule.pages.dev`. Якщо назва вже зайнята, використайте іншу назву проєкту і таку саму назву в команді `pages deploy` у `package.json`.

## Структура

- `src/` — React-інтерфейс і логіка графіка;
- `functions/api/` — Pages Functions для входу та збереження;
- `migrations/` — схема D1 і початкові 68 рядків;
- `tests/` — модульні й API-тести;
- `docs/` — погоджений дизайн та план реалізації.

Локальні `.dev.vars`, дані Wrangler і згенеровані файли не додаються до Git.
