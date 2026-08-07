import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildEmbedSnippet,
  WIDGET_BOT_ATTRIBUTE,
  WIDGET_CLOSE_MESSAGE,
  WIDGET_COLOR_ATTRIBUTE,
  WIDGET_LABEL_ATTRIBUTE,
  WIDGET_ROOT_ID,
} from './widget-contract'

/**
 * The loader cannot import the contract constants — it is plain JavaScript
 * with no build step, running on other people's websites. So the contract is
 * enforced the only way left: by reading the loader as text. A rename that
 * touches the constants but not the loader (or the reverse) fails here instead
 * of failing silently on a customer's page.
 */
const loader = readFileSync('public/widget.js', 'utf8')

describe('the widget loader speaks the contract', () => {
  it.each([
    ['bot attribute', WIDGET_BOT_ATTRIBUTE],
    ['color attribute', WIDGET_COLOR_ATTRIBUTE],
    ['label attribute', WIDGET_LABEL_ATTRIBUTE],
    ['root id', WIDGET_ROOT_ID],
    ['close message', WIDGET_CLOSE_MESSAGE],
  ])('reads the %s the app generates', (_name, literal) => {
    expect(loader).toContain(`'${literal}'`)
  })

  it('carries no stale contract names', () => {
    // After a rename, an old attribute left in the loader would still be read
    // in preference to nothing — a snippet built from the old constants would
    // keep working while the documented contract says otherwise.
    const attributes = loader.match(/data-[a-z]+-(?:bot|color|label)/g) ?? []

    for (const attribute of attributes) {
      expect([WIDGET_BOT_ATTRIBUTE, WIDGET_COLOR_ATTRIBUTE, WIDGET_LABEL_ATTRIBUTE]).toContain(
        attribute,
      )
    }
  })
})

describe('buildEmbedSnippet', () => {
  const snippet = buildEmbedSnippet('https://app.example.com', 'bot-123')

  it('points at the loader on the app origin', () => {
    expect(snippet).toContain('src="https://app.example.com/widget.js"')
  })

  it('carries the bot id under the attribute the loader reads', () => {
    expect(snippet).toContain(`${WIDGET_BOT_ATTRIBUTE}="bot-123"`)
  })

  it('loads async so it cannot block the host page', () => {
    expect(snippet).toContain(' async')
  })
})
