import { useFetch } from './useFetch';
import type { BodySystem } from '../lib/types';

/** Mengambil daftar sistem tubuh dari `GET /api/body-systems`. */
export const useBodySystems = () => useFetch<BodySystem[]>('/body-systems', [], { initialLoading: true });
