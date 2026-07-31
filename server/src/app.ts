import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { createApiRouter, createLegacyAliasRouter } from './routes';

/** Membangun aplikasi Express (dipisahkan dari entry agar mudah diuji). */
export const createApp = (): Express => {
  const app = express();

  app.use(cors());

  app.use('/api', createApiRouter());
  app.use('/api', createLegacyAliasRouter()); // alias lama (deprecated)
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
};
