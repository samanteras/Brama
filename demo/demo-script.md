# Сценарий демонстрации

Хронометраж — около 5–6 минут.

Инструкции — на русском. **Реплики для озвучки — на английском**, под каждой
курсивом перевод.

Стиль намеренно разговорный: короткие фразы, сокращения, никакого пафоса. Читать
надо так, будто объясняешь коллеге, а не зачитываешь презентацию. Если фраза
неудобно ложится на язык — меняй её, это нормально.

Главное правило: **не перечислять функции**. Один сквозной путь, и по дороге
объяснять, почему сделано именно так.

---

## Подготовка перед записью

- [ ] Завести аккаунт заранее и **выйти из него** — по сценарию вход показывается,
      а регистрация нет
- [ ] Удалить всех ботов: по сценарию бот создаётся в кадре
- [ ] Держать под рукой `demo/knowledge-base.md`
- [ ] Открыть вкладки: лендинг, демо-сайт, `demo-site/index.html` в редакторе
- [ ] Проверить остаток квоты — нужно около шести ответов
- [ ] Скрыть закладки и уведомления, масштаб 100%

---

## Сцена 1. Лендинг (≈40 сек)

**Экран:** лендинг, прокрутка сверху вниз, не спеша.

> So this is Foreman. It takes the documents a company already has,
> and turns them into a chatbot for their site.
>
> This is the landing page on it you can find all of the information about the profuct, how it's work, and what the price of it. Three plans, by volume — bots, documents, answers per month.


*Итак, это Foreman. Берёт документы, которые у компании уже есть, и
делает из них чат-бота для сайта. Это лендинг — что за продукт, как он работает
и сколько стоит.*

Прокрутить до секции с карточкой лида:

> The main thing it does is here. When the bot can't answer something, it
> doesn't guess — it asks for a phone number or mail and name of the customer, so company can reach and answer required information by themself. I'll show that working in a minute.

*Главное, что он делает — вот здесь. Когда бот не может ответить, он не гадает,
а берёт телефон. Сейчас покажу, как это работает.*

**Остановиться на тарифах:**

> Three plans, by volume — bots, documents, answers per month.
>
> And every number you see here comes from the same file the server checks the
> limits against. So the page can't promise a thousand answers while the code
> stops you at five hundred.

*Три тарифа, по объёму — боты, документы, ответы в месяц. И каждая цифра, которую
вы тут видите, берётся из того же файла, по которому сервер проверяет лимиты. То
есть на странице не может быть обещана тысяча ответов, если код режет на пятистах.*

---

## Сцена 2. Вход в кабинет (≈15 сек)

**Экран:** нажать «Sign in», войти под заранее подготовленным аккаунтом.

Регистрацию не показываем — она обычная, почта и пароль, и на записи это просто
пауза на заполнение формы. Аккаунт логичнее подготовить заранее.

> I've already signed up, so I'll just go straight in.
>
> And this is the dashboard. Nothing here yet.

*Я уже зарегистрирован, поэтому просто зайду. Вот дашборд. Пока тут ничего нет.*

---

## Сцена 3. Загрузка знаний (≈60 сек)

**Экран:** дашборд → New bot → имя и домен → Create.

> Let's start by creating a bot. A name, and the domain your site runs on — the
> widget won't work anywhere else.

*Начнём с создания бота. Название и домен вашего сайта — больше нигде виджет
работать не будет.*

**Вкладка Knowledge, загрузить `knowledge-base.md`:**

> Then you upload what you've already got. Price list, terms, warranty. Nothing
> to write from scratch.

*Дальше загружаете то, что уже есть. Прайс, условия, гарантию. Ничего писать
заново не надо.*

**Указать на счётчик:**

> See the counter — five of nine. That's not just a spinner with numbers on it.
>
> A big PDF won't fit in one request, so the indexing runs in chunks, and the
> browser drives it. Which means you get a real progress number, and if you close
> the tab it picks up where it left off.

*Видите счётчик — пять из девяти. Это не спиннер с цифрами. Большой PDF не влезет
в один запрос, поэтому индексация идёт кусками, и управляет ей браузер. Отсюда
настоящий прогресс, и если закрыть вкладку — продолжит с того места.*

Попробовать загрузить тот же файл второй раз:

> Same file twice — it won't take it. Otherwise you'd have the bot quoting the
> same prices from two copies.

*Тот же файл второй раз — не примет. Иначе бот цитировал бы одни и те же цены из
двух копий.*

---

## Сцена 4. Бот отвечает — и отказывается (≈70 сек)

**Экран:** вкладка Playground.

> This is the playground — the same chat visitors get, so you can check it
> before anyone else sees it.

*Это плейграунд — тот же самый чат, который увидят посетители, чтобы проверить
его до того, как его увидит кто-то ещё.*

**Вопрос 1** — `Сколько стоит черновая отделка за квадратный метр?`

> Five twenty a metre — that's straight out of the document. And notice I asked
> in Russian, the document's in English. It just answers in whatever you write
> in.

*520 за метр — это прямо из документа. И заметьте, я спросил по-русски, а
документ на английском. Он просто отвечает на том языке, на котором пишешь.*

**Вопрос 2** — `What happens if the tiles come off six months later?`

> The document doesn't say "tiles" anywhere. It's got a bit about the warranty.
> Found it by meaning.

*В документе нигде нет слова «плитка». Есть кусок про гарантию. Нашёл по смыслу.*

**Вопрос 3** — `` ← **ключевой момент**

Пауза перед репликой.

> Now — this isn't in the documents at all. And this bit is the whole point.
>
> Most of these bots would just make up a date.
>
> This one won't guess. It says so, and asks for a phone number instead. So the
> thing it couldn't answer turns into a lead.

*Так — вот этого в документах нет вообще. И вот это — самое главное. Большинство
таких ботов просто придумали бы дату. На сайте строителей это обещание, которого
никто не давал. Этот гадать не станет. Он так и говорит и просит телефон. То
есть то, на что он не смог ответить, превращается в заявку.*

Заполнить форму, отправить.

> In the tester it doesn't actually save the lead. You don't want your own
> poking around ending up in the list you work from.

*В тестере лид не сохраняется. Не хочется, чтобы твои же тыканья попадали в
список, с которым ты работаешь.*

---

## Сцена 5. Подключение виджета (≈70 сек)

**Экран:** Settings → «Add it to your site».

> Right, now it needs to go on a website. It's one line.

*Так, теперь это надо поставить на сайт. Одна строка.*

Скопировать снипет, показать список платформ:

> And it tells you where to paste it — WordPress, Tilda, Wix, Tag Manager.
> Because honestly, most people running a renovation company have no idea where
> their site's HTML is. Someone else built it.

*И тут написано, куда её вставить — WordPress, Tilda, Wix, Tag Manager. Потому
что, честно говоря, большинство владельцев ремонтных компаний понятия не имеют,
где у их сайта HTML. Делал кто-то другой.*

**Переключиться на редактор:**
  
I'm running it locally.
> This is the customer's site. Different domain, nothing to do with our app.

*Это сайт клиента. Другой домен, к нашему приложению отношения не имеет.*

Вставить строку, сохранить, обновить страницу.

> And there's the button.

*И вот кнопка.*

**F12 → Network, обновить страницу:**

> Here's the bit I like. Until you click, the chat doesn't load at all. Couple of
> kilobytes, that's it.
>
> So it doesn't slow their site down — which is usually why people rip these
> things out.

*Вот что мне нравится. Пока не нажал, чат не грузится вообще. Пара килобайт, и
всё. То есть сайт от него не тормозит — а обычно именно поэтому такие штуки и
выкидывают.*

Нажать — показать, что iframe подгрузился только теперь.

---

## Сцена 6. Посетитель оставляет заявку (≈45 сек)

**Экран:** демо-сайт, вести себя как обычный посетитель.

**Спросить** — `Do you give a discount if I pay everything up front?`

> Nothing about discounts in there. It's not going to invent one.

*Про скидки там ничего нет. Он её выдумывать не станет.*

Оставить телефон, отправить.

> And it only works on the domains you list. The main check isn't even our code
> — it's the browser refusing to show the chat on a site that isn't on the list.
> So copying the snippet doesn't get you anywhere.

*И работает он только на тех доменах, которые указал. Главная проверка — даже не
наш код, а браузер, который откажется показывать чат на сайте не из списка. Так
что скопировать сниппет ничего не даст.*

---

## Сцена 7. Заявка и пробелы (≈45 сек)

**Экран:** дашборд → Leads.

> There it is. And it's not just a phone number in a table.

*Вот она. И это не просто телефон в таблице.*

Показать карточку целиком:

> You can see what they wanted and exactly where they got stuck. So whoever calls
> back already knows how to start. The transcript's there too, but you don't
> usually need it.

*Видно, что человек хотел и на чём именно застрял. Тот, кто перезвонит, уже
знает, с чего начать. Переписка тоже есть, но обычно не нужна.*

**Вкладка Gaps:**

> This page is my favourite, actually. Everything it couldn't answer ends up
> here.
>
> It's basically a list of what's missing from your price list. Add a paragraph,
> and next time it's an answer instead of a phone call.

*Эта страница, если честно, моя любимая. Всё, на что он не смог ответить,
попадает сюда. По сути это список того, чего не хватает в прайсе. Добавил абзац —
и в следующий раз это ответ, а не звонок.*

---

## Сцена 8. Тарифы и оплата (≈35 сек)

**Экран:** Billing.

> Plans go by volume — bots, documents, answers a month. Payment's Stripe, test
> mode.

*Тарифы по объёму — боты, документы, ответы в месяц. Оплата через Stripe, тестовый
режим.*

Оплатить картой `4242 4242 4242 4242`.

> The plan only changes when Stripe tells us the money went through. Just landing
> on the payment page doesn't do anything by itself.

*Тариф меняется только когда Stripe скажет, что деньги прошли. Просто попасть на
страницу оплаты само по себе ничего не меняет.*

---

## Финал (≈40 сек)

> Quick word on what's underneath, since none of it shows on screen.
>
> It's Next.js, one deployment, and Supabase for the rest — Postgres, auth, file
> storage, and pgvector for the search.
>
> Retrieval is plain RAG. Your document gets split into chunks, each chunk
> becomes a vector, and every question pulls back the handful of passages
> closest to it. Only those go to the model. That's why it can't invent a price
> — it never sees anything except your own text.
>
> The contact form isn't the model writing some magic word into the reply. It's
> a tool call, so it either fired or it didn't. Billing is Stripe. And there's
> around three hundred and fifty tests, plus a set of questions that scores the
> answers as numbers rather than asking a model to grade another model.
>
> What's not here on purpose: teams, analytics, theming, multiple languages.
> Those aren't missing. I said no to them.

*Коротко о том, что под капотом — на экране этого не видно. Next.js, один
деплой, и Supabase на всё остальное: Postgres, авторизация, хранение файлов и
pgvector для поиска. Поиск — обычный RAG. Документ режется на куски, каждый
кусок превращается в вектор, и на каждый вопрос достаются несколько ближайших
кусков. В модель уходят только они. Поэтому она и не может выдумать цену — она
не видит ничего, кроме вашего же текста. Форма контактов — это не волшебное
слово в тексте ответа, а вызов инструмента: он либо сработал, либо нет. Оплата
на Stripe. И около трёхсот пятидесяти тестов плюс набор вопросов, который
оценивает ответы числами, а не просит одну модель судить другую. Чего тут нет
специально: команд, аналитики, настройки внешнего вида, мультиязычности. Это не
забыл. Это отказался.*

---

## Если что-то пойдёт не так в кадре

- **Бот думает пару секунд** — не вырезайте, скажите: *"that pause is it
  searching the documents before it starts writing"*. Живее, чем монтаж.
- **Виджет не появился** — домена нет в списке разрешённых.
- **Кончилась квота** — на бесплатном тарифе пять ответов в месяц.

## Чего в сценарии нет намеренно

Обхода всех вкладок и показа настроек ради настроек. Стек назван один раз в
финале и словами — какие версии и какие библиотеки, видно в репозитории.
