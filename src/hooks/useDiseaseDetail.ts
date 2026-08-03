import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { BodyPartRecord, DiseaseContent, DiseaseDetail } from '../lib/types';

type SistemTubuhRow = {
  id: number;
  nama: string;
  slug: string;
  deskripsi: string | null;
};

type PenyakitDetailRow = {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  tingkat_urgensi: string;
  sistem_tubuh: SistemTubuhRow | null;
};

type KontenRow = {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  urutan: number;
  gambar_konten: NonNullable<DiseaseContent['gambar_konten']>;
};

type BagianTubuhLink = {
  bagian_tubuh: BodyPartRecord | null;
};

/**
 * Mengambil detail lengkap satu penyakit (Supabase). Menyusun `penyakit`
 * beserta `sistem_tubuh` (embedded FK), `konten_penyakit` (+ gambar),
 * `bagian_tubuh` (via relasi many-to-many), dan `referensi`.
 * Mengembalikan null bila penyakit tidak ditemukan.
 */
export const useDiseaseDetail = (diseaseId: number | null) => {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<DiseaseDetail | null> => {
      const [diseaseRes, kontenRes, bagianRes, referensiRes] = await Promise.all([
        supabase
          .from('penyakit')
          .select('id,id_sistem_tubuh,nama,slug,ringkasan,tingkat_urgensi,sistem_tubuh(id,nama,slug,deskripsi)')
          .eq('id', diseaseId)
          .abortSignal(signal)
          .maybeSingle<PenyakitDetailRow>(),
        supabase
          .from('konten_penyakit')
          .select('id,judul,slug,isi,urutan,gambar_konten(id,url_gambar,caption,urutan)')
          .eq('id_penyakit', diseaseId)
          .eq('tampilkan', true)
          .order('urutan')
          .abortSignal(signal)
          .returns<KontenRow[]>(),
        supabase
          .from('penyakit_bagian_tubuh')
          .select('bagian_tubuh(id,nama,slug,tampilan)')
          .eq('id_penyakit', diseaseId)
          .order('id', { referencedTable: 'bagian_tubuh' })
          .abortSignal(signal)
          .returns<BagianTubuhLink[]>(),
        supabase
          .from('referensi')
          .select('id,judul,sumber,url,tahun')
          .eq('id_penyakit', diseaseId)
          .order('id')
          .abortSignal(signal)
          .returns<DiseaseDetail['referensi']>(),
      ]);

      if (diseaseRes.error) throw new Error(diseaseRes.error.message);
      if (kontenRes.error) throw new Error(kontenRes.error.message);
      if (bagianRes.error) throw new Error(bagianRes.error.message);
      if (referensiRes.error) throw new Error(referensiRes.error.message);

      const disease = diseaseRes.data;
      if (!disease) return null;

      const konten: DiseaseContent[] = (kontenRes.data ?? []).map((k) => ({
        id: k.id,
        judul: k.judul,
        slug: k.slug,
        isi: k.isi,
        urutan: k.urutan,
        gambar_konten: k.gambar_konten ?? [],
      }));

      const bagian_tubuh: BodyPartRecord[] = (bagianRes.data ?? []).flatMap((r) =>
        r.bagian_tubuh ? [r.bagian_tubuh] : []
      );

      return {
        id: disease.id,
        id_sistem_tubuh: disease.id_sistem_tubuh,
        nama: disease.nama,
        slug: disease.slug,
        ringkasan: disease.ringkasan,
        tingkat_urgensi: disease.tingkat_urgensi,
        sistem_tubuh: disease.sistem_tubuh ?? null,
        konten,
        bagian_tubuh,
        referensi: referensiRes.data ?? [],
      };
    },
    [diseaseId]
  );

  return useSupabaseQuery(diseaseId == null ? null : fetcher, null, [diseaseId]);
};
