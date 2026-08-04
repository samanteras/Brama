# Сценарий демонстрации

Хронометраж — около 5–6 минут.

Инструкции и пояснения — на русском. **Реплики для озвучки — на английском**, под
каждой курсивом перевод, чтобы читать осмысленно, а не по бумажке.

Английские фразы намеренно короткие: длинные конструкции трудно читать вслух,
и на записи это слышно.

Главное правило: **не перечислять функции**. Показывать один сквозной путь и
объяснять, почему сделано именно так. Экран показывает «что», голос — «зачем».

---

## Подготовка перед записью

- [ ] Залогиниться в дашборд заранее
- [ ] Оставить одного бота — `Skyline Renovations` с загруженной базой
- [ ] **Очистить старые лиды**, иначе новый потеряется среди них
- [ ] Открыть вкладки: лендинг, дашборд, демо-сайт, `demo-site/index.html` в редакторе
- [ ] Проверить остаток квоты — по сценарию нужно около шести ответов
- [ ] Скрыть закладки и уведомления, масштаб 100%

---

## Сцена 1. Проблема (≈40 сек)

**Экран:** лендинг, медленная прокрутка сверху вниз.

> Foreman turns the documents a renovation company already has into a chatbot
> for their website.
>
> The niche is deliberate. Someone reads your prices at eleven at night on a
> Saturday. They have one question. Nobody answers. By morning they are talking
> to a competitor.
>
> That is not a support cost. That is a lost job — and a renovation contract is
> worth tens of thousands.

*Foreman превращает документы, которые у ремонтной компании уже есть, в чат-бота
для их сайта. Ниша выбрана намеренно. Человек читает ваши цены в одиннадцать
вечера в субботу. У него один вопрос. Ответить некому. К утру он уже говорит с
конкурентом. Это не расходы на поддержку — это потерянный заказ, а контракт на
ремонт стоит десятки тысяч.*

Задержаться на тарифах:

> Every number on this page comes from the same place in the code that enforces
> the limits. They cannot drift apart.

*Каждая цифра на этой странице приходит из того же места в коде, по которому
проверяются лимиты. Разойтись они не могут.*

---

## Сцена 2. Загрузка знаний (≈60 сек)

**Экран:** дашборд → создать бота → Knowledge → загрузить `knowledge-base.md`.

> The customer uploads what they already have. Price list, terms, warranty.
> Nothing new to write.

*Клиент загружает то, что у него уже есть: прайс, условия, гарантию. Ничего
писать заново не нужно.*

**Указать на счётчик прогресса:**

> Look at the counter — five of nine passages. That is not decoration.
>
> A hundred-and-fifty-page PDF does not fit in one serverless request, so
> indexing runs in batches driven by the browser. You get an honest progress
> figure, and if the tab closes, it resumes where it stopped.

*Обратите внимание на счётчик — пять из девяти фрагментов. Это не декорация.
PDF на сто пятьдесят страниц не влезает в один серверлесс-запрос, поэтому
индексация идёт партиями под управлением браузера. Отсюда честный прогресс, и
если вкладку закрыли — продолжит с того же места.*

Попробовать загрузить тот же файл второй раз:

> A duplicate is refused. Otherwise the bot would quote the same price list two
> different ways.

*Дубликат не проходит. Иначе бот цитировал бы один прайс двумя способами.*

---

## Сцена 3. Бот отвечает — и отказывается (≈70 сек)

**Экран:** Playground.

**Вопрос 1** — `Сколько стоит черновая отделка за квадратный метр?`

> Five hundred and twenty euros — straight from the document. Note the question
> is in Russian and the document is in English. It answers in whatever language
> you write in.

*520 евро — прямо из документа. Обратите внимание: вопрос на русском, документ
на английском. Отвечает на языке вопроса.*

**Вопрос 2** — `What happens if the tiles come off six months later?`

> The document never says "tiles". It has a section on the warranty. It found it
> by meaning.

*В документе нет слова «плитка». Там раздел про гарантию. Нашёл по смыслу.*

**Вопрос 3** — `Could you start before the end of September?` ← **ключевой момент**

> This is not in the documents. And this is the part that matters.
>
> Most document chatbots would invent a date. On a builder's website, that is a
> promise nobody made.
>
> This one refuses to guess — and asks for a phone number instead. The failure
> becomes the lead.

*Этого в документах нет. И вот это — самое главное. Большинство ботов придумали
бы дату. На сайте строителей это обещание, которого никто не давал. Наш
отказывается гадать — и вместо этого просит телефон. Провал превращается в
заявку.*

Заполнить форму, отправить.

> In the tester the lead is not saved. The owner's own experiments should not
> clutter the list they actually work from.

*В тестере лид не сохраняется. Собственные пробы владельца не должны засорять
список, с которым он работает.*

---

## Сцена 4. Подключение виджета (≈70 сек)

**Экран:** Settings → «Add it to your site».

> Now it has to go on a website. The whole integration is one line.

*Теперь это надо поставить на сайт. Вся интеграция — одна строка.*

Скопировать снипет, показать список платформ:

> And the product tells them where to paste it. WordPress, Tilda, Wix, Google
> Tag Manager. A renovation company owner usually has no idea where their site's
> HTML lives — somebody else built it.

*И продукт сам говорит, куда её вставить: WordPress, Tilda, Wix, Google Tag
Manager. Владелец ремонтной компании обычно не знает, где живёт HTML его сайта —
делал кто-то другой.*

**Переключиться на редактор:**

> This is the customer's website. Different domain, nothing to do with our app.

*Это сайт клиента. Другой домен, к нашему приложению отношения не имеет.*

Вставить строку, сохранить, обновить страницу.

> There is the button.

*Вот кнопка.*

**F12 → Network, обновить страницу:**

> And here is the detail I care about. Until someone clicks, the chat does not
> load at all — a couple of kilobytes on the page.
>
> The widget does not slow the customer's site down. That is the usual reason
> these things get removed.

*И вот деталь, которая мне важна. Пока не нажали, чат не грузится вообще — на
странице пара килобайт. Виджет не замедляет сайт клиента. Именно из-за скорости
такие штуки обычно и снимают.*

Нажать — показать, что iframe подгрузился только теперь.

---

## Сцена 5. Посетитель оставляет заявку (≈45 сек)

**Экран:** демо-сайт, вести себя как обычный посетитель.

**Спросить** — `Do you give a discount if I pay everything up front?`

> Nothing about discounts in the documents. It does not invent one.

*Про скидки в документах ничего нет. Он её не выдумывает.*

Оставить телефон, отправить.

> The widget only answers on domains the owner listed. And the main check is not
> our code — it is the visitor's browser, refusing to render the chat on a site
> that is not on the list. Copying the snippet gets you nothing.

*Виджет отвечает только на доменах, которые указал владелец. И главная проверка —
не наш код, а браузер посетителя, который откажется рисовать чат на сайте не из
списка. Скопировать сниппет бессмысленно.*

---

## Сцена 6. Заявка и пробелы (≈45 сек)

**Экран:** дашборд → Leads.

> There it is. And it is not a row with a phone number.

*Вот она. И это не строка с телефоном.*

Показать карточку целиком:

> You can see what they wanted, and the exact question that stopped them. Whoever
> calls back already knows how to open the conversation. The transcript is
> there, but you rarely need it.

*Видно, что человек хотел, и на каком вопросе он застрял. Тот, кто перезвонит,
уже знает, с чего начать. Переписка есть, но нужна редко.*

**Вкладка Gaps:**

> This is the most underrated page in the product. Every question it could not
> answer lands here.
>
> It is a list of paragraphs missing from the price list. Add one, and next time
> it is an answer instead of a phone call.

*Это самая недооценённая страница продукта. Каждый вопрос, на который бот не смог
ответить, попадает сюда. Это список абзацев, которых не хватает в прайсе.
Добавили — и в следующий раз это ответ, а не звонок.*

---

## Сцена 7. Тарифы и оплата (≈35 сек)

**Экран:** Billing.

> Plans are sized by volume — bots, documents, answers per month. Payment is
> Stripe, in test mode.

*Тарифы по объёму: боты, документы, ответы в месяц. Оплата — Stripe в тестовом
режиме.*

Оплатить картой `4242 4242 4242 4242`.

> The plan changes on the webhook from Stripe — when the money actually moved.
> Reaching the payment page changes nothing on its own.

*Тариф меняется по вебхуку от Stripe — когда деньги действительно прошли. Сам
переход на страницу оплаты ничего не меняет.*

---

## Финал (≈30 сек)

> A few things you cannot see on screen.
>
> Three hundred and fifty tests, and a separate set of thirty questions that
> scores answer quality as numbers — not one model grading another, but
> mechanically: was the right passage retrieved, did the tool fire.
>
> It paid for itself twice. Once it caught a similarity threshold that worked
> backwards and was discarding exactly the right passages. Once it caught the
> bot writing "someone will follow up" without showing the form — so the lead
> was lost behind an answer that looked perfect.
>
> And what is deliberately not here: teams and roles, analytics, widget theming,
> multiple languages. Those are not missing. They were declined.

*Несколько вещей, которых не видно на экране. Триста пятьдесят тестов и отдельный
набор из тридцати вопросов, который оценивает качество ответов числами — не
модель судит модель, а механически: нашёлся ли нужный фрагмент, вызвался ли
инструмент. Он окупился дважды. Один раз поймал порог отсечки, который работал
наоборот и выбрасывал именно нужные фрагменты. Второй — бота, который писал «с
вами свяжутся», но не показывал форму, и заявка терялась за внешне идеальным
ответом. И чего здесь сознательно нет: команд и ролей, аналитики, настройки
внешнего вида, мультиязычности. Это не забытое — это отклонённое.*

---

## Если что-то пойдёт не так в кадре

- **Бот думает пару секунд** — не вырезайте, скажите вслух: *"that pause is the
  search running before the model starts writing"*. Честнее монтажа.
- **Виджет не появился** — домен не в списке разрешённых.
- **Кончилась квота** — на бесплатном тарифе пять ответов в месяц.

## Чего в сценарии нет намеренно

Обхода всех вкладок, показа настроек ради настроек, перечисления технологий.
Проверяющий смотрит, решает ли продукт задачу и продуман ли он. Стек он и так
увидит в репозитории.
