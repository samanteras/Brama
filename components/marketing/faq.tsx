import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { PLANS } from '@/lib/plans'

const QUESTIONS = [
  {
    question: 'Will it make up prices?',
    answer:
      'It answers only from the documents you upload. When the answer isn’t there, it says so and asks for a phone number rather than guessing — which is also how you find out what your price list is missing.',
  },
  {
    question: 'What happens when my prices change?',
    answer:
      'Upload the new file and the old one stops being used. Uploading the same document twice is refused, so you can’t end up with the bot quoting two different prices from two copies.',
  },
  {
    question: 'Will it slow my website down?',
    answer:
      'The snippet is a few kilobytes of plain JavaScript that draws a button. The chat itself only loads after someone clicks it, so visitors who never open the chat download almost nothing.',
  },
  {
    question: 'Can somebody copy my snippet onto their own site?',
    answer:
      'They can copy the line, but on paid plans the widget refuses to answer anywhere except the domains you list. You can see exactly which domains are allowed in the bot’s settings.',
  },
  {
    question: 'What happens when I run out of answers for the month?',
    answer: `The widget stops answering questions, but it still offers to take the visitor’s contact details — so a busy month costs you answers, never leads. Visitors are never told anything about your plan.`,
  },
  {
    question: 'Do I need a developer?',
    answer:
      'To upload documents, no. To add the snippet, you need whoever can edit your website template — usually the same person who added your analytics tag.',
  },
  {
    question: 'Is the free plan a trial?',
    answer: `No, it stays free. It is capped at ${PLANS.free.limits.answersPerMonth} answers a month and shows your ${PLANS.free.limits.visibleLeads} most recent leads, which is enough to see whether it earns its place.`,
  },
]

export function Faq() {
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Questions we get asked
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {QUESTIONS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground text-pretty">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
