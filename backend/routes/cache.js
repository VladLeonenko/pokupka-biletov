import express from 'express';
import { getCacheVersion, bumpCacheVersion } from '../services/cacheManager.js';

export const cachePublicRouter = express.Router();
export const cacheAdminRouter = express.Router();

cachePublicRouter.get('/version', (_req, res) => {
  res.json({ version: getCacheVersion() });
});

cacheAdminRouter.post('/clear', (req, res) => {
  const { reason } = req.body || {};
  const version = bumpCacheVersion({
    reason: reason || 'manual',
    userId: req.user?.id,
  });
  res.json({ ok: true, version });
});

