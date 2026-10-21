import { z } from 'zod';
export const id = z.uuid();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export function pageQuery(query) {
  const { page, limit } = pagination.parse(query);
  return { skip: (page - 1) * limit, take: limit + 1, page, limit };
}
export function pageResult(items, { page, limit }) {
  return {
    items: items.slice(0, limit),
    nextPage: items.length > limit ? page + 1 : null,
  };
}
export const text = (max) => z.string().trim().min(1).max(max);
export const username = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,30}$/, 'Use 3–30 letters, numbers or underscores.')
  .transform((s) => s.toLowerCase());
export const profileInput = z
  .object({
    username: username.optional(),
    bio: z.string().trim().max(500).optional(),
    avatarUrl: z.union([z.url().startsWith('https://'), z.literal('')]).optional(),
    timeZone: z
      .string()
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, 'Choose a valid IANA time zone.')
      .optional(),
  })
  .strict();
export const clanInput = z
  .object({
    name: text(60),
    description: z.string().trim().max(500).default(''),
    private: z.boolean().default(false),
  })
  .strict();
export const postInput = z
  .object({
    body: text(2000),
    clanId: id.optional(),
    activityId: id.optional(),
  })
  .strict();
export const claimInput = z
  .object({
    provider: z.enum(['leetcode', 'codeforces', 'github']),
    problemId: text(200)
      .transform((value) => value.toLowerCase())
      .pipe(z.string().regex(/^[a-z0-9_-]+$/, 'Use the canonical problem slug, not a URL.')),
    title: text(200),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    occurredAt: z.iso
      .datetime()
      .refine(
        (s) => new Date(s) <= new Date() && new Date(s).getUTCFullYear() >= 2000,
        'Use the actual past submission time.',
      ),
    evidenceUrl: z.url().startsWith('https://').max(2000),
  })
  .strict();
