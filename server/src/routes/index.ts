import { Router } from 'express';
import { bodyPartsRouter } from './bodyParts';
import { bodySystemsRouter } from './bodySystems';
import { diseasesRouter } from './diseases';
import { searchRouter } from './search';

/** Rute API canonical (kebab-case) yang dipakai frontend. */
export const createApiRouter = (): Router => {
  const api = Router();

  api.use('/body-parts', bodyPartsRouter);
  api.use('/body-systems', bodySystemsRouter);
  api.use('/diseases', diseasesRouter);
  api.use('/search', searchRouter);

  return api;
};

/**
 * Alias camelCase untuk kompatibilitas mundur.
 * Dipertahankan agar klien lama yang memakai `/api/bodyParts` dan
 * `/api/bodySystems` tidak rusak. Bisa dihapus setelah dipastikan
 * tidak ada konsumen lama lagi.
 */
export const createLegacyAliasRouter = (): Router => {
  const legacy = Router();

  legacy.use('/bodyParts', bodyPartsRouter);
  legacy.use('/bodySystems', bodySystemsRouter);

  return legacy;
};
