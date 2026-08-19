'use client'

import { X } from 'lucide-react'

import { ChatWindow } from '@/components/chat/chat-window'
import { WIDGET_CLOSE_MESSAGE } from '@/lib/widget-contract'

/**
 * Chat chrome for the iframe.
 *
 * Everything below the header is the same component the owner tested in the
 * dashboard, so what a visitor sees cannot quietly differ from what was
 * approved.
 */
export function EmbeddedChat({
  botId,
  botName,
  greeting,
  accentColor,
  showWatermark,
  hostSite,
}: {
  botId: string
  botName: string
  greeting: string
  accentColor: string
  showWatermark: boolean
  /** Hostname of the page the widget is embedded in, passed by the loader. */
  hostSite: string | null
}) {
  function close() {
    // The launcher script owns the iframe, so closing it is its decision. The
    // frame cannot remove itself from a page it does not control.
    window.parent.postMessage({ type: WIDGET_CLOSE_MESSAGE }, '*')
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <p className="font-semibold">{botName}</p>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть чат"
          className="rounded p-1 transition-opacity hover:opacity-80"
        >
          <X className="size-5" />
        </button>
      </header>

      <ChatWindow
        botId={botId}
        botName={botName}
        greeting={greeting}
        accentColor={accentColor}
        endpoint="/api/public/chat"
        leadEndpoint="/api/public/leads"
        hostSite={hostSite}
        trackVisitor
        showWatermark={showWatermark}
        className="flex-1"
      />
    </div>
  )
}
