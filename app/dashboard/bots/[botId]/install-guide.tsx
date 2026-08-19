import { EmbedSnippet } from './embed-snippet'

/**
 * Where to put the snippet.
 *
 * The snippet on its own assumes the reader knows where a site's HTML lives.
 * Small businesses mostly do not — their site was built by somebody else,
 * and the honest question is "which box do I paste this into". Naming the
 * platforms turns a developer instruction into something the owner can act on,
 * or forward to whoever can.
 */
const PLACES = [
  {
    platform: 'WordPress',
    where: 'Внешний вид → Редактор файлов темы → footer.php, перед </body>. Или любой плагин вида «insert headers and footers».',
  },
  {
    platform: 'Tilda',
    where: 'Настройки сайта → Ещё → HTML-код для вставки внутрь body.',
  },
  {
    platform: 'Wix / Squarespace',
    where: 'Settings → Custom Code → добавить в Body End.',
  },
  {
    platform: 'Google Tag Manager',
    where: 'Новый тег → Пользовательский HTML → вставить → триггер All Pages. Доступ к сайту не нужен.',
  },
  {
    platform: 'Самописный сайт',
    where: 'В любое место перед закрывающим тегом </body>.',
  },
]

export function InstallGuide({ snippet }: { snippet: string }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm text-muted-foreground text-pretty">
          Одна строка, вставляется один раз. Окно чата загружается только по клику посетителя,
          так что скорость сайта не пострадает.
        </p>
        <EmbedSnippet snippet={snippet} />
      </div>

      <div>
        <p className="text-sm font-medium">Куда вставлять</p>

        <dl className="mt-3 space-y-3">
          {PLACES.map((place) => (
            <div key={place.platform} className="text-sm">
              <dt className="font-medium">{place.platform}</dt>
              <dd className="text-muted-foreground text-pretty">{place.where}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="border-t pt-4 text-sm text-muted-foreground text-pretty">
        Не знаете, кто занимается вашим сайтом? Отправьте эту строку тому, кто занимается, — это
        всё, что нужно, и это займёт минуты две.
      </p>
    </div>
  )
}
