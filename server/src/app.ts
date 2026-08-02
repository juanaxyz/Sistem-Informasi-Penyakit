import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Express } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { createApiRouter } from './routes';

/** Membangun aplikasi Express (dipisahkan dari entry agar mudah diuji). */
export const createApp = (): Express => {
  const app = express();

  // Keamanan dasar + parsing body
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Log satu baris per request
  app.use(requestLogger);

  // Rute canonical (kebab-case); tanpa alias legacy
  app.use('/api', createApiRouter());
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
};
