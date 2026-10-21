import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { leetcodeController } from '../controllers/leetcodeController.js';
export function leetcodeRoutes(db) {
  const r = Router(),
    c = leetcodeController(db);
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 20,
      keyGenerator: (req) => req.user.id,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Too many LeetCode requests. Please wait a minute.' } },
    }),
  );
  r.use(express.json({ limit: '1mb' }));
  r.get('/', c.overview);
  r.put('/account', c.connect);
  r.delete('/account', c.disconnect);
  r.post('/import/preview', c.preview);
  r.post('/import', c.commit);
  r.post('/sync', c.sync);
  return r;
}
