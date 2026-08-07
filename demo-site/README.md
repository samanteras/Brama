# Demo site

A fake renovation company's website, used to prove the widget works where it
actually has to work: **on a different origin from the app**.

Testing the widget inside the Brama app itself would prove nothing. Every
interesting failure — the Origin check, CORS, the iframe, cookies that are not
there — only appears across origins.

## Running it locally

The app runs on `localhost:3000`. Serve this on a different port:

```bash
npx serve demo-site -l 3001
```

Then open <http://localhost:3001>.

Before that, two things:

1. In `index.html`, replace `REPLACE_WITH_BOT_ID` with a real bot id from the
   dashboard (it is in the URL, and in the snippet on the bot's Settings tab).
2. If the bot has domains locked, add `localhost` to its allow-list — otherwise
   the widget will load and politely refuse to answer, which is exactly what it
   is supposed to do to a site that is not on the list.

## Deploying

Deployed as its own Vercel project, separate from the app, so the two end up on
genuinely different domains. Point the script `src` at the deployed app URL
instead of `localhost:3000`.
