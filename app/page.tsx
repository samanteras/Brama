import type { Metadata } from 'next'

import { ClosingCta } from '@/components/marketing/closing-cta'
import { Faq } from '@/components/marketing/faq'
import { Hero } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { LeadCapture } from '@/components/marketing/lead-capture'
import { Pricing } from '@/components/marketing/pricing'
import { Problem } from '@/components/marketing/problem'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export const metadata: Metadata = {
  title: 'Brama — answer customer enquiries around the clock',
  description:
    'Turn the price list and terms you already have into a chatbot that answers customers day and night, and takes a phone number when it cannot answer.',
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <LeadCapture />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  )
}
