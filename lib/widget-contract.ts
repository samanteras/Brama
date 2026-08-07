/**
 * The contract between the widget loader and the app.
 *
 * `public/widget.js` runs on other people's websites and is deliberately plain
 * JavaScript with no build step, so it cannot import these constants. That
 * makes the contract easy to break silently: rename an attribute here, forget
 * the loader, and the widget stops opening with no error anywhere.
 *
 * These constants are therefore the single source of truth for everything the
 * app side generates or listens to, and `widget-contract.test.ts` reads the
 * loader as text to prove the loader still speaks the same names. The test is
 * red until every side of a rename lands together.
 */

/** Script-tag attribute carrying the bot id. The one required attribute. */
export const WIDGET_BOT_ATTRIBUTE = 'data-brama-bot'

/** Optional script-tag attribute overriding the launcher colour. */
export const WIDGET_COLOR_ATTRIBUTE = 'data-brama-color'

/** Optional script-tag attribute overriding the launcher label. */
export const WIDGET_LABEL_ATTRIBUTE = 'data-brama-label'

/** DOM id of the loader's host element; guards against the snippet being pasted twice. */
export const WIDGET_ROOT_ID = 'brama-widget-root'

/** postMessage type the embed sends to ask the loader to close the frame. */
export const WIDGET_CLOSE_MESSAGE = 'brama:close'

/**
 * The install snippet shown to the customer.
 *
 * Built here rather than at the call site so the page that renders it and the
 * loader that reads it cannot disagree on the attribute name.
 */
export function buildEmbedSnippet(appUrl: string, botId: string): string {
  return `<script src="${appUrl}/widget.js" ${WIDGET_BOT_ATTRIBUTE}="${botId}" async></script>`
}
