/**
 * Strips Markdown from a reply before it is shown.
 *
 * The chat bubble renders text, not Markdown, so a model that writes
 * "**from 520 EUR/m2**" puts the asterisks on screen. Found in the widget on a
 * price answer, which is the worst possible place for it: the number is what
 * the visitor came for and it arrives wrapped in punctuation.
 *
 * The prompt also asks for plain text, but asking is not the same as knowing.
 * This is the half that cannot fail, and it is deliberately not a Markdown
 * renderer — inside an iframe on someone else's website, turning model output
 * into HTML would be a new injection surface for the sake of bold text nobody
 * asked for.
 *
 * Runs on every render during streaming, so it must cope with half-arrived
 * markup: "**fro" is a real intermediate state and must not flash asterisks.
 */

/** Matches a fenced code block's opening or closing line. */
const CODE_FENCE = /^ {0,3}(?:`{3,}|~{3,}).*$/gm

/** Matches a heading's leading hashes, keeping the text after them. */
const HEADING = /^ {0,3}#{1,6}[ \t]+/gm

/** Matches `[label](target)`, keeping the label. */
const LINK = /\[([^\]\n]*)\]\([^)\n]*\)/g

/** Matches `code`, keeping the contents. */
const INLINE_CODE = /`([^`\n]+)`/g

/** Matches *text* or _text_ on a single line, keeping the text. */
const EMPHASIS = /(?<![*\w])\*([^*\n]+)\*(?!\*)|(?<![_\w])_([^_\n]+)_(?![_\w])/g

/**
 * Matches any leftover run of two or more asterisks or underscores.
 *
 * Deliberately last and deliberately unconditional. A pair split across two
 * streamed tokens never matches the paired rules above, and "**" does not occur
 * in the prose a renovation company writes, so removing it outright is safe in
 * a way that removing a lone "*" would not be.
 */
const LEFTOVER_MARKERS = /\*{2,}|_{2,}/g

export function toPlainText(markdown: string): string {
  return markdown
    .replace(CODE_FENCE, '')
    .replace(HEADING, '')
    .replace(LINK, '$1')
    .replace(INLINE_CODE, '$1')
    .replace(EMPHASIS, (_match, asterisked, underscored) => asterisked ?? underscored)
    .replace(LEFTOVER_MARKERS, '')
}
