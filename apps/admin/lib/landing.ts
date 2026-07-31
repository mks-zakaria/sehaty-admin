/**
 * Where the public pages live, from the console's point of view.
 *
 * The console needs this for exactly one thing that matters a lot at a desk:
 * opening the doctor's own page next to the design picker, on the operator's
 * phone, so the doctor sees what they are choosing rather than a word.
 *
 * Same default as the landing site's own `SITE_URL`, and the same env var name,
 * so one value configures both.
 */
export const LANDING_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sehaty.ma'
).replace(/\/$/, '');

/** Absolute URL of a doctor's public page. */
export function doctorPageUrl(slug: string): string {
  return `${LANDING_URL}/dr/${slug}`;
}
