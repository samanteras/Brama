const STEPS = [
  {
    title: 'Upload what you already have',
    body: 'The price list, the terms, the stages of work, the warranty page. PDF, plain text, or pasted straight in. Nothing new to write.',
    detail: 'If a PDF turns out to be a scan, Brama says so instead of quietly indexing nothing.',
  },
  {
    title: 'Ask it what your customers ask',
    body: 'Try it in the dashboard before anyone else sees it. If it gets something wrong, the fix is adding a paragraph to your documents, not editing prompts.',
    detail: 'Every question it could not answer is listed for you, so you know what to add next.',
  },
  {
    title: 'Paste one line into your site',
    body: 'A single script tag, anywhere in the page. The chat window only loads once a visitor clicks the button, so your page speed stays exactly where it was.',
    detail: 'On paid plans the widget refuses to run on any domain but yours.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Live in an afternoon, not a project
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            There is no content to write and no developer to book.
          </p>
        </div>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>

              <h3 className="mt-4 font-semibold">{step.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.body}
              </p>

              <p className="mt-3 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground/80 text-pretty">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
