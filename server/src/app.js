import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import expiryRoutes from './routes/expiryRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const configuredOrigins = env.CLIENT_ORIGIN.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const normalizeOrigin = (origin = '') => origin.replace(/\/$/, '');

const isPrivateIpv4 = (hostname = '') => {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
};

const isDevLocalOrigin = (origin = '') => {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      isPrivateIpv4(hostname)
    );
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin) => {
  const normalized = normalizeOrigin(origin || '');
  if (!normalized) return true;

  const normalizedConfigured = configuredOrigins.map(normalizeOrigin);
  if (normalizedConfigured.includes(normalized)) return true;
  if (env.NODE_ENV !== 'production' && isDevLocalOrigin(normalized)) return true;
  return false;
};

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', requireAuth, productRoutes);
  app.use('/api/analysis', requireAuth, analysisRoutes);
  app.use('/api/expiry', requireAuth, expiryRoutes);
  app.use('/api/history', requireAuth, historyRoutes);
  app.use('/api/gamification', requireAuth, gamificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
