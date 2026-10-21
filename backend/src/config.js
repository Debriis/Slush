import { z } from 'zod';
import { isPublicSupabaseKey } from './utils/publicKey.js';

const databaseUrl = z.string().refine((value) => {
  try {
    const u = new URL(value);
    return (
      ['postgresql:', 'postgres:'].includes(u.protocol) &&
      !!u.username &&
      !!u.password &&
      !!u.hostname &&
      u.pathname.length > 1 &&
      !/^(HOST|YOUR_HOST)$/i.test(u.hostname) &&
      !(u.username === 'USER' && u.password === 'PASSWORD')
    );
  } catch {
    return false;
  }
});
const origins = z
  .string()
  .min(1)
  .refine((value) =>
    value.split(',').every((origin) => {
      try {
        const url = new URL(origin.trim());
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname === '/' &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    }),
  );

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  SUPABASE_URL: z.url().refine((v) => !v.includes('YOUR_PROJECT') && v.startsWith('https://')),
  SUPABASE_ANON_KEY: z.string().refine(isPublicSupabaseKey),
  CORS_ORIGINS: origins,
  REVIEWER_USER_IDS: z
    .string()
    .default('')
    .refine((value) =>
      value.split(',').every((id) => !id.trim() || z.uuid().safeParse(id.trim()).success),
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function readConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path[0]))];
    const error = new Error(
      `Missing or invalid backend configuration: ${fields.join(', ')}. Edit backend/.env; see docs/setup.md. Use npm run setup:env to create missing local files without overwriting existing values.`,
    );
    error.name = 'ConfigurationError';
    error.fields = fields;
    throw error;
  }
  return {
    ...result.data,
    origins: result.data.CORS_ORIGINS.split(',').map((s) => new URL(s.trim()).origin),
    reviewers: result.data.REVIEWER_USER_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
