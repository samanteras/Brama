const STORAGE_KEY = 'brama.visitor'

/**
 * A stable id for grouping one visitor's conversations.
 *
 * Not identity and not tracking: it is a random value in the visitor's own
 * browser, scoped to the widget, carrying nothing about who they are. It exists
 * so a returning visitor's messages join up instead of starting a new
 * conversation with every question.
 *
 * Read on demand rather than held in state, because localStorage does not exist
 * during server rendering and reaching for it in an effect would mean an extra
 * render for a value only needed when a message is sent.
 */
export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing

    const id = crypto.randomUUID()
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // Private browsing can refuse storage entirely. A per-call id still groups
    // nothing, but the conversation id already threads a single session, so the
    // chat works exactly as well — it just will not be recognised on a return
    // visit.
    return null
  }
}
