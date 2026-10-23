import type { SeedContext } from "@/lib/app";

/**
 * The demo data of this app (copy to src/app/seed.ts and replace the body).
 *
 * Typed rows with stable string ids, timestamps relative to `ctx.now` (`ctx.now - 5 * 60_000`), 8 to 14 rows of whatever the screens show
 * (people, channels, messages, lessons, items, numbers): specific and believable, a mix of short and long, some unread, some old. No lorem
 * ipsum, no placeholder rows. The demo accounts are added to the `accounts` collection by the kit: refer to them as "u-admin" and "u-member".
 * Sample people, messages and numbers are allowed because the app says "Demo data, stored in this browser"; never invent facts about the
 * client's real business (prices, customers, awards, testimonials).
 */
export function seed(ctx: SeedContext) {
  void ctx;
  return {};
}
