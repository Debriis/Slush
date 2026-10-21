import { leetcodeRoutes } from './routes/leetcodeRoutes.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { authentication } from './middleware/auth.js';
import { ApiError, errorHandler } from './utils/errors.js';
import { userRoutes } from './routes/users.js';
import { socialRoutes } from './routes/social.js';
import { clanRoutes } from './routes/clans.js';
import { leaderboardRoutes } from './routes/leaderboards.js';

export function createApp({ db, supabase, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || config.origins.includes(origin));
      },
    }),
  );
  app.use('/api/leetcode', authentication(supabase), leetcodeRoutes(db));
  app.use(express.json({ limit: '32kb' }));
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { message: 'Too many requests. Please wait a minute.' },
      },
    }),
  );
  app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ data: { database: 'connected' } });
    } catch {
      throw new ApiError(503, 'Database is unavailable.');
    }
  });
  app.use('/api', authentication(supabase));
  app.use('/api', userRoutes(db, config), socialRoutes(db), clanRoutes(db), leaderboardRoutes(db));
  app.use((_req, _res, next) => next(new ApiError(404, 'Endpoint not found.')));
  app.use(errorHandler);
  return app;
}
