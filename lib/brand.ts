/**
 * The product's name, in one place.
 *
 * Everything chrome-like — page titles, headers, the watermark badge, the
 * pricing line that promises the badge — reads this constant, for the same
 * reason plan limits live in `lib/plans.ts`: two places stating the same fact
 * is how they come to disagree. Marketing prose spells the name out in full
 * sentences and is not templated; a rename rewrites those sentences anyway.
 *
 * `public/widget.js` cannot import this (plain JavaScript, no build step); its
 * contract with the app is enforced by `lib/widget-contract.test.ts` instead.
 */
export const APP_NAME = 'Brama'
