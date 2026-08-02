import { Router } from 'express';
import { bodyPartsRouter } from './bodyParts';
import { bodySystemsRouter } from './bodySystems';
import { diseasesRouter } from './diseases';
import { healthRouter } from './health';
import { searchRouter } from './search';

/** Rute API canonical (kebab-case) yang dipakai frontend. */
export const createApiRouter = (): Router => {
  const api = Router();

  api.use('/health', healthRouter);
  api.use('/body-parts', bodyPartsRouter);
  api.use('/body-systems', bodySystemsRouter);
  api.use('/diseases', diseasesRouter);
  api.use('/search', searchRouter);

  return api;
};
