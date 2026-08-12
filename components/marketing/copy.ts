import type { PreviewMessage } from '@/components/marketing/chat-preview'
import type { CopyLocale } from '@/lib/plan-copy'
import { PLANS } from '@/lib/plans'

/**
 * Every word on the marketing page, in both languages.
 *
 * One type for both locales, so a sentence added to the English page without
 * its Russian counterpart is a compile error rather than a page that quietly
 * mixes languages. Numbers are never written out — they come from
 * `lib/plans.ts` at module load, the same guarantee the pricing cards have.
 *
 * The dashboard is deliberately not localized; this dictionary covers the
 * landing page only.
 */

export type MarketingCopy = {
  locale: CopyLocale
  header: {
    howItWorks: string
    leads: string
    pricing: string
    signIn: string
    startFree: string
  }
  hero: {
    badge: string
    titleLead: string
    titleAccent: string
    sub: string
    ctaPrimary: string
    ctaSecondary: string
    note: string
    conversation: PreviewMessage[]
    chatHost: string
    chatCaption: string
  }
  problem: {
    title: string
    sub: string
    leaks: { title: string; body: string }[]
  }
  howItWorks: {
    title: string
    sub: string
    steps: { title: string; body: string; detail: string }[]
  }
  leadCapture: {
    badge: string
    title: string
    paragraphs: [string, string]
    pullQuote: string
    card: {
      header: string
      timestamp: string
      name: string
      phone: string
      rows: { label: string; value: string }[]
      footnote: string
    }
  }
  pricing: {
    title: string
    sub: string
    featuredBadge: string
    perMonth: string
    startFree: string
    choosePlan: (name: string) => string
    footnote: string
  }
  faq: {
    title: string
    questions: { question: string; answer: string }[]
  }
  closing: {
    title: string
    sub: string
    cta: string
    note: string
  }
  footer: {
    tagline: string
    howItWorks: string
    pricing: string
    signIn: string
  }
}

const FREE_ANSWERS = PLANS.free.limits.answersPerMonth
const FREE_LEADS = PLANS.free.limits.visibleLeads

const EN: MarketingCopy = {
  locale: 'en',
  header: {
    howItWorks: 'How it works',
    leads: 'Leads',
    pricing: 'Pricing',
    signIn: 'Sign in',
    startFree: 'Start free',
  },
  hero: {
    badge: 'For businesses whose answers already live in their documents',
    titleLead: 'Your best enquiries arrive after hours.',
    titleAccent: 'Brama is still awake.',
    sub: "Upload the price list and terms you already have. Brama answers customers in your own words, around the clock — and when it doesn't know, it takes their number instead of guessing.",
    ctaPrimary: 'Build your bot free',
    ctaSecondary: 'See how it works',
    note: `No card required. ${FREE_ANSWERS} answers a month on the free plan.`,
    conversation: [
      {
        role: 'visitor',
        text: 'Hi — roughly what does a full renovation of a 54 m² flat cost, and does that include demolition?',
      },
      {
        role: 'bot',
        text: 'For 54 m² turnkey we start at €520/m², so around €28,000. Demolition and waste removal are included; furniture and appliances are not. Materials are billed separately at cost.',
      },
      {
        role: 'visitor',
        text: 'And could you start before September?',
      },
      {
        role: 'bot',
        text: "That depends on the current schedule, which I can't see. Leave your number and the site manager will confirm dates tomorrow morning.",
        showLeadForm: true,
      },
    ],
    chatHost: 'renovation-company.com',
    chatCaption: 'A real limitation, handled well: no invented date, a captured phone number.',
  },
  problem: {
    title: 'Where enquiries quietly leak away',
    sub: 'Not from bad work or bad prices. From nobody being there at the moment somebody was ready to ask.',
    leaks: [
      {
        title: 'The evening enquiry',
        body: 'People weigh up a big purchase after work, on the sofa, at half past ten. Your office is closed, the form promises a reply “within a working day”, and the next tab is already a competitor.',
      },
      {
        title: 'The same five questions',
        body: 'What is included. How long it takes. Who buys materials. Whether there is a warranty. How payment is staged. Answered by hand, again, every week.',
      },
      {
        title: 'The enquiry with no number',
        body: 'Someone read three pages, decided you were too expensive because nothing said otherwise, and left. You never knew they were there.',
      },
    ],
  },
  howItWorks: {
    title: 'Live in an afternoon, not a project',
    sub: 'There is no content to write and no developer to book.',
    steps: [
      {
        title: 'Upload what you already have',
        body: 'The price list, the terms, the stages of work, the warranty page. PDF, plain text, or pasted straight in. Nothing new to write.',
        detail:
          'If a PDF turns out to be a scan, Brama says so instead of quietly indexing nothing.',
      },
      {
        title: 'Ask it what your customers ask',
        body: 'Try it in the dashboard before anyone else sees it. If it gets something wrong, the fix is adding a paragraph to your documents, not editing prompts.',
        detail:
          'Every question it could not answer is listed for you, so you know what to add next.',
      },
      {
        title: 'Paste one line into your site',
        body: 'A single script tag, anywhere in the page. The chat window only loads once a visitor clicks the button, so your page speed stays exactly where it was.',
        detail: 'On paid plans the widget refuses to run on any domain but yours.',
      },
    ],
  },
  leadCapture: {
    badge: 'What most chatbots get backwards',
    title: "The question it can't answer is worth the most",
    paragraphs: [
      'Ask most document chatbots something outside their documents and they invent an answer. On your own website that is a price nobody agreed to.',
      "Brama does the opposite. When the answer isn't in your files, it says so, says a person should confirm, and asks for a number. The gap in your documents becomes a callback instead of an apology.",
    ],
    pullQuote: 'One captured job pays for a year of Brama.',
    card: {
      header: 'New lead',
      timestamp: '23:41, from the website',
      name: 'Anna Kowalska',
      phone: '+48 601 234 567',
      rows: [
        { label: 'Wants', value: 'Turnkey renovation, 54 m² two-room flat' },
        { label: 'Budget', value: 'Around €28,000, asked twice about what is included' },
        { label: 'Timing', value: 'Hoping to start before September' },
        {
          label: 'Stalled on',
          value: '“Could you start before September?” — not in your documents',
        },
      ],
      footnote:
        'Four questions asked. Full conversation attached, so nobody has to open the call with “so, tell me what you need”.',
    },
  },
  pricing: {
    title: 'Priced against one job, not per seat',
    sub: 'Start free and keep the leads it collects. Upgrade when the volume says you should.',
    featuredBadge: 'Most chosen',
    perMonth: '/month',
    startFree: 'Start free',
    choosePlan: (name) => `Choose ${name}`,
    footnote:
      'An answer is one reply from your bot, whether it came from the widget or from you testing it. Leads are never counted or capped as a separate charge.',
  },
  faq: {
    title: 'Questions we get asked',
    questions: [
      {
        question: 'Will it make up prices?',
        answer:
          'It answers only from the documents you upload. When the answer isn’t there, it says so and asks for a phone number rather than guessing — which is also how you find out what your price list is missing.',
      },
      {
        question: 'What happens when my prices change?',
        answer:
          'Upload the new file and the old one stops being used. Uploading the same document twice is refused, so you can’t end up with the bot quoting two different prices from two copies.',
      },
      {
        question: 'Will it slow my website down?',
        answer:
          'The snippet is a few kilobytes of plain JavaScript that draws a button. The chat itself only loads after someone clicks it, so visitors who never open the chat download almost nothing.',
      },
      {
        question: 'Can somebody copy my snippet onto their own site?',
        answer:
          'They can copy the line, but on paid plans the widget refuses to answer anywhere except the domains you list. You can see exactly which domains are allowed in the bot’s settings.',
      },
      {
        question: 'What happens when I run out of answers for the month?',
        answer:
          'The widget stops answering questions, but it still offers to take the visitor’s contact details — so a busy month costs you answers, never leads. Visitors are never told anything about your plan.',
      },
      {
        question: 'Do I need a developer?',
        answer:
          'To upload documents, no. To add the snippet, you need whoever can edit your website template — usually the same person who added your analytics tag.',
      },
      {
        question: 'Is the free plan a trial?',
        answer: `No, it stays free. It is capped at ${FREE_ANSWERS} answers a month and shows your ${FREE_LEADS} most recent leads, which is enough to see whether it earns its place.`,
      },
    ],
  },
  closing: {
    title: 'Somebody is reading your prices tonight',
    sub: 'Upload one price list and ask your bot the question you get asked most. It takes about ten minutes to find out whether this is worth it.',
    cta: 'Build your bot free',
    note: `No card required. ${FREE_ANSWERS} answers a month, and you keep the leads.`,
  },
  footer: {
    tagline: '— the answer desk for businesses that run on documents',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    signIn: 'Sign in',
  },
}

const RU: MarketingCopy = {
  locale: 'ru',
  header: {
    howItWorks: 'Как это работает',
    leads: 'Заявки',
    pricing: 'Тарифы',
    signIn: 'Войти',
    startFree: 'Начать бесплатно',
  },
  hero: {
    badge: 'Для бизнеса, у которого ответы уже лежат в документах',
    titleLead: 'Лучшие заявки приходят после закрытия.',
    titleAccent: 'Brama ещё не спит.',
    sub: 'Загрузите прайс и условия, которые у вас уже есть. Brama отвечает клиентам вашими словами, круглосуточно — а когда не знает ответа, берёт номер телефона вместо того, чтобы выдумывать.',
    ctaPrimary: 'Создать бота бесплатно',
    ctaSecondary: 'Как это работает',
    note: `Без карты. ${FREE_ANSWERS} ответов в месяц на бесплатном тарифе.`,
    conversation: [
      {
        role: 'visitor',
        text: 'Здравствуйте! Сколько примерно стоит ремонт под ключ в квартире 54 м², и входит ли демонтаж?',
      },
      {
        role: 'bot',
        text: 'За 54 м² под ключ — от €520/м², то есть около €28 000. Демонтаж и вывоз мусора входят; мебель и техника — нет. Материалы оплачиваются отдельно по чекам.',
      },
      {
        role: 'visitor',
        text: 'А начать до сентября успеете?',
      },
      {
        role: 'bot',
        text: 'Это зависит от текущего графика, которого я не вижу. Оставьте номер — прораб подтвердит даты завтра утром.',
        showLeadForm: true,
      },
    ],
    chatHost: 'renovation-company.com',
    chatCaption: 'Честное ограничение, обработанное правильно: никакой выдуманной даты — и номер в базе.',
  },
  problem: {
    title: 'Где тихо утекают заявки',
    sub: 'Не из-за плохой работы и не из-за цен. Просто рядом никого не было в момент, когда человек был готов спросить.',
    leaks: [
      {
        title: 'Вечерний запрос',
        body: 'Крупные покупки обдумывают после работы, на диване, в половине одиннадцатого. Офис закрыт, форма обещает ответ «в течение рабочего дня», а в соседней вкладке уже открыт конкурент.',
      },
      {
        title: 'Одни и те же пять вопросов',
        body: 'Что входит в цену. Сколько это займёт. Кто покупает материалы. Есть ли гарантия. Как устроена оплата. Каждую неделю — вручную, заново.',
      },
      {
        title: 'Заявка без номера',
        body: 'Кто-то прочитал три страницы, решил, что у вас дорого — потому что ничто не сказало обратного, — и ушёл. Вы даже не узнали, что он был.',
      },
    ],
  },
  howItWorks: {
    title: 'Запуск за вечер, а не проект',
    sub: 'Не нужно писать контент и звать разработчика.',
    steps: [
      {
        title: 'Загрузите то, что уже есть',
        body: 'Прайс, условия, этапы работ, страница о гарантии. PDF, обычный текст или просто вставьте из буфера. Ничего нового писать не нужно.',
        detail:
          'Если PDF окажется сканом, Brama честно скажет об этом, а не молча проиндексирует пустоту.',
      },
      {
        title: 'Спросите его о том, о чём спрашивают клиенты',
        body: 'Проверьте бота в кабинете до того, как его увидят посетители. Если он ошибается — лечится это абзацем в ваших документах, а не правкой промптов.',
        detail:
          'Каждый вопрос без ответа попадает в отдельный список — вы всегда знаете, что дописать.',
      },
      {
        title: 'Вставьте одну строку на сайт',
        body: 'Один script-тег в любом месте страницы. Окно чата загружается только после клика по кнопке, так что скорость вашего сайта не меняется вовсе.',
        detail: 'На платных тарифах виджет отказывается работать на чужих доменах.',
      },
    ],
  },
  leadCapture: {
    badge: 'Что большинство чат-ботов делают наоборот',
    title: 'Вопрос без ответа — самый ценный',
    paragraphs: [
      'Спросите обычного чат-бота о том, чего нет в его документах, — он выдумает ответ. На вашем собственном сайте это цена, на которую никто не соглашался.',
      'Brama делает наоборот. Когда ответа нет в ваших файлах, она говорит об этом прямо, предлагает уточнить у человека и просит номер. Пробел в документах превращается в звонок, а не в извинение.',
    ],
    pullQuote: 'Одна пойманная заявка окупает год Brama.',
    card: {
      header: 'Новая заявка',
      timestamp: '23:41, с сайта',
      name: 'Анна Ковальская',
      phone: '+48 601 234 567',
      rows: [
        { label: 'Хочет', value: 'Ремонт под ключ, двухкомнатная квартира 54 м²' },
        { label: 'Бюджет', value: 'Около €28 000, дважды спросила, что входит в цену' },
        { label: 'Сроки', value: 'Надеется начать до сентября' },
        {
          label: 'Застряла на',
          value: '«А начать до сентября успеете?» — этого нет в ваших документах',
        },
      ],
      footnote:
        'Четыре заданных вопроса. Переписка приложена целиком — никому не придётся начинать звонок с «расскажите, что вам нужно».',
    },
  },
  pricing: {
    title: 'Окупается одним заказом, а не берёт «за место»',
    sub: 'Начните бесплатно и оставьте себе собранные заявки. Переходите выше, когда объём сам об этом попросит.',
    featuredBadge: 'Выбирают чаще всего',
    perMonth: '/мес',
    startFree: 'Начать бесплатно',
    choosePlan: (name) => `Выбрать ${name}`,
    footnote:
      'Ответ — это одна реплика вашего бота, из виджета или из вашего же теста в кабинете. Заявки не тарифицируются и не ограничиваются отдельно.',
  },
  faq: {
    title: 'Что у нас спрашивают',
    questions: [
      {
        question: 'Он будет выдумывать цены?',
        answer:
          'Он отвечает только по документам, которые вы загрузили. Когда ответа там нет, он говорит об этом и просит номер телефона, а не гадает — заодно так вы узнаёте, чего не хватает в вашем прайсе.',
      },
      {
        question: 'Что будет, когда цены изменятся?',
        answer:
          'Загрузите новый файл — старый перестанет использоваться. Один и тот же документ дважды загрузить нельзя, так что бот не будет цитировать две разные цены из двух копий.',
      },
      {
        question: 'Он замедлит мой сайт?',
        answer:
          'Сниппет — это несколько килобайт обычного JavaScript, которые рисуют кнопку. Сам чат загружается только после клика, так что посетители, не открывшие его, не скачивают почти ничего.',
      },
      {
        question: 'А если кто-то скопирует мой сниппет на свой сайт?',
        answer:
          'Скопировать строку можно, но на платных тарифах виджет отказывается отвечать где-либо, кроме доменов из вашего списка. Разрешённые домены видны в настройках бота.',
      },
      {
        question: 'Что будет, когда закончатся ответы за месяц?',
        answer:
          'Виджет перестаёт отвечать на вопросы, но по-прежнему предлагает оставить контакты — загруженный месяц стоит вам ответов, но никогда не стоит заявок. Посетителям ничего не сообщают о вашем тарифе.',
      },
      {
        question: 'Нужен ли разработчик?',
        answer:
          'Чтобы загрузить документы — нет. Чтобы вставить сниппет, нужен тот, кто умеет править шаблон вашего сайта — обычно тот же человек, который ставил вам счётчик аналитики.',
      },
      {
        question: 'Бесплатный тариф — это пробный период?',
        answer: `Нет, он бесплатный навсегда. Ограничение — ${FREE_ANSWERS} ответов в месяц и ${FREE_LEADS} последних заявок в списке; этого достаточно, чтобы понять, окупает ли бот своё место.`,
      },
    ],
  },
  closing: {
    title: 'Кто-то читает ваш прайс сегодня вечером',
    sub: 'Загрузите один прайс и задайте боту вопрос, который вам задают чаще всего. Минут через десять станет ясно, стоит ли оно того.',
    cta: 'Создать бота бесплатно',
    note: `Без карты. ${FREE_ANSWERS} ответов в месяц — и заявки остаются вашими.`,
  },
  footer: {
    tagline: '— справочная служба для бизнеса, который живёт в документах',
    howItWorks: 'Как это работает',
    pricing: 'Тарифы',
    signIn: 'Войти',
  },
}

export const MARKETING_COPY: Record<CopyLocale, MarketingCopy> = { en: EN, ru: RU }
