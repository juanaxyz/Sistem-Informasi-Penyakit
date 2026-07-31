import { HttpError } from './httpError';

/**
 * Validasi parameter path yang harus berupa ID positif.
 * Mengembalikan 400 bila tidak valid (sebelumnya memicu error 500 dari database).
 */
export const parseIdParam = (value: string | string[] | undefined, label = 'ID'): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    throw new HttpError(400, `${label} tidak diberikan.`);
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} tidak valid.`);
  }
  return id;
};
