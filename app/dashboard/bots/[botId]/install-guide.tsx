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
    where: 'Appearance → Theme File Editor → footer.php, before </body>. Or any "insert headers and footers" plugin.',
  },
  {
    platform: 'Tilda',
    where: 'Site Settings → More → HTML code for the body section.',
  },
  {
    platform: 'Wix / Squarespace',
    where: 'Settings → Custom Code → add to Body End.',
  },
  {
    platform: 'Google Tag Manager',
    where: 'New tag → Custom HTML → paste → trigger on All Pages. No site access needed.',
  },
  {
    platform: 'A hand-built site',
    where: 'Anywhere before the closing </body> tag.',
  },
]

export function InstallGuide({ snippet }: { snippet: string }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm text-muted-foreground text-pretty">
          One line, pasted once. The chat window only loads when a visitor clicks the button, so
          your page speed is unaffected.
        </p>
        <EmbedSnippet snippet={snippet} />
      </div>

      <div>
        <p className="text-sm font-medium">Where it goes</p>

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
        Not sure who manages your site? Send them this line — it is everything they need, and it
        takes about two minutes.
      </p>
    </div>
  )
}
