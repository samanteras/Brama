import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal } from '@/components/marketing/motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function Faq({ copy }: { copy: MarketingCopy['faq'] }) {
  return (
    <section className="border-b bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:py-32">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.title}
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <Accordion type="single" collapsible className="w-full">
            {copy.questions.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground text-pretty">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
