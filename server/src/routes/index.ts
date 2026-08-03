import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import express from 'express';
import { bodyPartsRouter } from './bodyParts';
import { bodySystemsRouter } from './bodySystems';
import { diseasesRouter } from './diseases';
import { healthRouter } from './health';
import { searchRouter } from './search';

/**
 * Direktori root file upload.
 *
 * SENG AJA di-resolve terhadap lokasi modul ini (`server/src/routes/index.ts`)
 * memakai `import.meta.url`, BUKAN `process.cwd()`. `process.cwd()` mengikuti
 * direktori saat server dijalankan (mis. root repo atau production) dan akan
 * membuat `express.static` menunjuk ke direktori yang tidak ada → semua gambar
 * 404. Dengan `import.meta.url`, path selalu `server/uploads` dari mana pun
 * server dijalankan.
 */
const UPLOADS_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));

/** Rute API canonical (kebab-case) yang dipakai frontend. */
export const createApiRouter = (): Router => {
  const api = Router();

  api.use('/health', healthRouter);
  api.use('/body-parts', bodyPartsRouter);
  api.use('/body-systems', bodySystemsRouter);
  api.use('/diseases', diseasesRouter);
  api.use('/search', searchRouter);

  // Static uploads served through API to keep files out of public web root.
  api.use('/uploads/penyakit', express.static(path.join(UPLOADS_DIR, 'penyakit')));

  return api;
};
