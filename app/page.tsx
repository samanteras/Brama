import type { Metadata } from 'next'

import { ClosingCta } from '@/components/marketing/closing-cta'
import { MARKETING_COPY } from '@/components/marketing/copy'
import { Faq } from '@/components/marketing/faq'
import { Hero } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { LeadCapture } from '@/components/marketing/lead-capture'
import { Pricing } from '@/components/marketing/pricing'
import { Problem } from '@/components/marketing/problem'
import { SetDocumentLang } from '@/components/marketing/set-document-lang'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export const metadata: Metadata = {
  // `absolute` sidesteps the root layout's "%s · Brama" template — the brand
  // is already in the title.
  title: { absolute: 'Brama — отвечает вашим клиентам круглосуточно' },
  description:
    'Превратите прайс и условия, которые у вас уже есть, в чат-бота: он отвечает клиентам днём и ночью, а когда не знает ответа — берёт номер телефона.',
}

export default function LandingPage() {
  const copy = MARKETING_COPY.ru

  return (
    <>
      <SetDocumentLang lang="ru" />
      <SiteHeader copy={copy} />
      <main>
        <Hero copy={copy.hero} />
        <Problem copy={copy.problem} />
        <HowItWorks copy={copy.howItWorks} />
        <LeadCapture copy={copy.leadCapture} />
        <Pricing copy={copy.pricing} locale={copy.locale} />
        <Faq copy={copy.faq} />
        <ClosingCta copy={copy.closing} />
      </main>
      <SiteFooter copy={copy.footer} />
    </>
  )
}
