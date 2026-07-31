import { useFetch } from './useFetch';
import type { BodyPartRecord } from '../lib/types';

/**
 * Mengambil daftar bagian tubuh dari `GET /api/body-parts/filter`.
 * `tampilan` opsional, nilainya mengikuti tabel `bagian_tubuh`
 * (mis. `tampilan="depan"`).
 */
export const useBodyParts = (tampilan?: 'depan' | 'belakang') => {
  const query = new URLSearchParams();
  if (tampilan) query.set('tampilan', tampilan);

  const queryString = query.toString();
  const path = queryString ? `/body-parts/filter?${queryString}` : '/body-parts/filter';

  return useFetch<BodyPartRecord[]>(path, [], { initialLoading: true });
};
