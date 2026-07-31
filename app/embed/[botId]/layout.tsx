import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat',
  // Nothing here should ever appear in search results — it is a fragment of
  // somebody else's website, not a page.
  robots: { index: false, follow: false },
}

/**
 * Layout for the iframe contents.
 *
 * Bypasses the marketing chrome entirely: inside the frame there is no header,
 * no footer and no navigation, only the chat.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children
}
