# Развёртывание Brama

Рабочий runbook: что нужно приложению, как переехать за домен `brama.vuzel.dev`,
и где платформенная развилка. Платформо-независимые шаги (env, домен, post-deploy)
одинаковы везде; платформо-специфичное — в разделе «Пути деплоя».

## Что это за приложение

- **Next.js 16** (App Router), рантайм **Node.js** — не статика.
- **Node ≥ 20.9** (локально проверено на 24).
- Внешние сервисы: **Supabase** (БД + Auth), **OpenAI** (эмбеддинги + чат),
  **Stripe** (оплата), **Resend** (почта — через SMTP, настроенный в Supabase Auth).
- Особенности рантайма (важно при выборе платформы):
  - `lib/security/url-guard.ts` использует **`node:dns`** (резолв хоста для
    SSRF-защиты импорта сайта). Работает на Node, **НЕ работает на Cloudflare
    Workers** — там DNS-резолва нет.
  - `lib/ingest/hash.ts` — `node:crypto` (есть и на Node, и на Workers).
  - PDF-парсинг — `unpdf`, **edge-совместим** (работает и на Workers).
  - `app/api/site-import/route.ts` — `maxDuration = 60` (лимит Vercel; на другой
    платформе смотреть её лимиты CPU/времени для краулера).

## Переменные окружения

Полный список и пояснения — в `.env.example`. Коротко:

| Переменная | Назначение | Примечание |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | базовый URL приложения | **build-time**: вшивается в сборку, при смене домена — пересобрать |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | доступ к Supabase из браузера | публичные |
| `SUPABASE_SERVICE_ROLE_KEY` | админ-доступ к БД | **только сервер**, никогда не в браузер |
| `OPENAI_API_KEY` | эмбеддинги + чат | сервер |
| `COHERE_API_KEY` | реранкинг (опц.) | можно не задавать |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | оплата | |
| `STRIPE_WEBHOOK_SECRET` | подпись вебхука Stripe | **сейчас пуст — вебхук не настроен** |
| `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_BUSINESS` | id тарифов | из дашборда Stripe |

`NEXT_PUBLIC_*` попадают в клиентский бандл на этапе сборки — менять их надо
до `next build`, а не в рантайме.

## Домен

- **Приложение** → `brama.vuzel.dev` (A/CNAME на сервер/платформу).
- **Почтовые записи** уже настроены и к приложению отношения не имеют — не трогать:
  `send.brama.vuzel.dev` (SPF/MX), `resend._domainkey.brama.vuzel.dev` (DKIM).
  Отправитель писем `no-reply@brama.vuzel.dev` уже совпадает с целевым доменом.

## Пути деплоя (выбрать один)

### A. Node-сервер (VPS / Docker) — near-drop-in для этого кода

1. В `next.config.ts` добавить `output: 'standalone'`.
2. `npm ci && npm run build` → получаем `.next/standalone`.
3. Запуск: `node .next/standalone/server.js` (порт из `PORT`, по умолчанию 3000),
   рядом положить `.next/static` и `public` (стандартная раскладка standalone).
4. Процесс держать под systemd / pm2 / в контейнере.
5. Reverse-proxy (nginx / Caddy) на 443 → на порт приложения, TLS-сертификат.
6. Env-переменные — из окружения процесса (не из `.env.local`).
- Плюс: код не переписывается, `node:dns` SSRF-гард работает как есть.

### B. Cloudflare (Workers) через OpenNext — под стандарт студии

1. Подключить адаптер **`@opennextjs/cloudflare`** (не устаревший
   `@cloudflare/next-on-pages`).
2. **Блокер:** переписать SSRF-резолв в `lib/security/url-guard.ts` — `node:dns`
   на Workers недоступен. Вариант: резолвить через DNS-over-HTTPS Cloudflare
   (`https://cloudflare-dns.com/dns-query`) и прогонять адреса через тот же
   `isPrivateAddress`. Юнит-тесты гарда (`url-guard.test.ts`) переиспользовать.
3. `wrangler.jsonc` + секреты как Workers Secrets (не `.env`).
4. Проверить под Workers: стриминг чата, server actions, middleware (`proxy.ts`),
   лимиты времени у краулера импорта.
- Минус: реальная миграция, есть код-рискИ. Плюс: единая инфраструктура студии.

## После деплоя — обязательно при любом пути

1. `NEXT_PUBLIC_APP_URL = https://brama.vuzel.dev` и **пересобрать** (build-time).
2. **Supabase Auth** → `site_url` и redirect allow-list на `https://brama.vuzel.dev/**`
   (иначе ссылки подтверждения из писем ведут на старый адрес).
3. **Сниппет виджета** на демо-сайте и у клиентов → `src` на новый домен.
   Сам сниппет строится из `NEXT_PUBLIC_APP_URL` (`lib/widget-contract.ts`), так
   что после п.1 новые сниппеты уже верные — обновить вставленные вручную.
4. **Stripe webhook** → эндпоинт `https://brama.vuzel.dev/api/stripe/webhook`,
   его signing secret положить в `STRIPE_WEBHOOK_SECRET` (сейчас пуст — без него
   оплата не обновляет тарифы).
5. Прогнать смоук: лендинг, вход, регистрация (письмо доходит), виджет отвечает.

## Открытые вопросы (уточнить до деплоя)

- **Платформа:** Cloudflare-only или есть Linux-VPS? От этого зависит путь A/B.
- **`STRIPE_WEBHOOK_SECRET`** не настроен — оплата без него неполная.
