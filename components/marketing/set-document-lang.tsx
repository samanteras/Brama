'use client'

import { useEffect } from 'react'

/**
 * Sets `<html lang>` for the Russian landing page.
 *
 * The root layout owns the `<html>` element and hardcodes `lang="en"`; the
 * canonical fix is restructuring the whole app under `app/[lang]`, which is
 * not worth doing for one translated page while the dashboard stays English.
 * Until that day, this corrects the attribute on the client — screen readers
 * switch voices after hydration, and search engines get the language from the
 * hreflang alternates and the content itself.
 */
export function SetDocumentLang({ lang }: { lang: string }) {
  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = lang

    return () => {
      document.documentElement.lang = previous
    }
  }, [lang])

  return null
}
