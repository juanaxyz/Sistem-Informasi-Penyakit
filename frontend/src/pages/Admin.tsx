import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { FadeIn } from "@/components/FadeIn";
import { ArticleProse } from "@/components/ArticleProse";
import Dashboard from "./AdminDashboard";
import { BodyMap } from "@/components/bodyMap/BodyMap";
import type { UrgencyLevel, BodyPartRecord, SystemRecord, ArtikelBagian, Patogen } from "@/lib/types";

interface PenyakitListItem {
  id: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  thumbnail: string | null;
  tingkat_urgensi: UrgencyLevel;
  id_sistem_tubuh?: number;
  sistem_tubuh_nama?: string;
  sistem_tubuh?: { id: number; nama: string } | null;
  code?: string | null;
}

interface ArtikelListItem {
  id: number;
  /** Wajib: BFF selalu menyertakannya di daftar dan respons pembuatan artikel. */
  id_penyakit: number;
  judul: string;
  konten: string;
  penyakit_nama: string;
}

/** Tombol kecil di toolbar formatting Markdown. */
function ToolbarButton({
  label,
  title,
  onClick,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className="flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-ink transition hover:bg-pine/10 hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
    >
      {children}
    </button>
  );
}

export default function Admin() {
  const { user } = useAuth();
  
  // Lists data
  const [penyakitList, setPenyakitList] = useState<PenyakitListItem[]>([]);
  const [artikelList, setArtikelList] = useState<ArtikelListItem[]>([]);
  const [sistemTubuhList, setSistemTubuhList] = useState<SystemRecord[]>([]);
  const [bodyPartList, setBodyPartList] = useState<BodyPartRecord[]>([]);
  const [patogenList, setPatogenList] = useState<Patogen[]>([]);
  
  // Selection & Mode
  const [editMode, setEditMode] = useState<"penyakit" | "artikel" | "patogen" | null>(null);
  const [selectedPenyakit, setSelectedPenyakit] = useState<PenyakitListItem | null>(null);
  const [selectedArtikel, setSelectedArtikel] = useState<ArtikelListItem | null>(null);

  // Patogen editor modal state
  const [showPatogenModal, setShowPatogenModal] = useState(false);
  const patogenModalRef = useRef<HTMLDialogElement>(null);
  const [editingPatogen, setEditingPatogen] = useState<Patogen | null>(null);
  const [patogenForm, setPatogenForm] = useState({
    nama: "",
    jenis: "virus",
    deskripsi: "",
    penyakitIds: [] as number[],
  });

  // Modal state for penyakit form
  const [showPenyakitModal, setShowPenyakitModal] = useState(false);
  const penyakitModalRef = useRef<HTMLDialogElement>(null);

  // Modal state for buat artikel
  const [showArtikelModal, setShowArtikelModal] = useState(false);
  const artikelModalRef = useRef<HTMLDialogElement>(null);
  
  // Penyakit Form State
  const [penyakitForm, setPenyakitForm] = useState<{
    nama: string;
    slug: string;
    ringkasan: string;
    thumbnail: string;
    tingkat_urgensi: UrgencyLevel;
    id_sistem_tubuh: number | "";
    code: string;
    bagian_tubuhIds: number[];
    patogenIds: number[];
  }>({
    nama: "",
    slug: "",
    ringkasan: "",
    thumbnail: "",
    tingkat_urgensi: "normal",
    id_sistem_tubuh: "",
    code: "",
    bagian_tubuhIds: [],
    patogenIds: [],
  });

  // Artikel Multi-Bagian State
  const [bagianList, setBagianList] = useState<ArtikelBagian[]>([]);

  // Referensi (URL sumber) — hanya muncul di editor artikel. `referensiSaved`
  // dipakai untuk menandai daftar yang belum tersimpan (dirty state).
  const [referensiList, setReferensiList] = useState<string[]>([]);
  const [referensiSaved, setReferensiSaved] = useState<string[]>([]);
  const [referensiInput, setReferensiInput] = useState("");
  const [referensiDraft, setReferensiDraft] = useState("");
  const [referensiError, setReferensiError] = useState<string | null>(null);
  const [referensiSaving, setReferensiSaving] = useState(false);
  const [editingReferensi, setEditingReferensi] = useState<number | null>(null);
  const referensiDirty =
    referensiList.length !== referensiSaved.length ||
    referensiList.some((url, i) => url !== referensiSaved[i]);

  // Editor Markdown: pratinjau per bagian + akses ke textarea untuk toolbar.
  const [previewBagian, setPreviewBagian] = useState<number | null>(null);
  const bagianRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openPenyakitModal = () => setShowPenyakitModal(true);
  const closePenyakitModal = () => setShowPenyakitModal(false);

  const openArtikelModal = () => setShowArtikelModal(true);
  const closeArtikelModal = () => setShowArtikelModal(false);

  // Helper untuk memuat daftar penyakit (all atau fallback ke pencarian)
  const loadPenyakitList = async (): Promise<PenyakitListItem[]> => {
    const all = await api.getAllPenyakit().catch(() => null);
    if (all) return all.penyakit ?? [];
    const fallback = await api.searchDiseases("");
    return fallback.penyakit.map((p) => ({
      id: p.id,
      nama: p.nama,
      slug: p.slug,
      ringkasan: p.ringkasan,
      thumbnail: p.thumbnail,
      tingkat_urgensi: p.tingkat_urgensi,
    }));
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [penyakitList, artikelRes, sistemRes, bodyPartsRes, patogenRes] = await Promise.all([
        loadPenyakitList(),
        api.getArtikelList(),
        api.getSistemTubuh(),
        api.getBodyParts(),
        api.patogen.list(),
      ]);
      setPenyakitList(penyakitList);
      setArtikelList(artikelRes.artikel || []);
      setSistemTubuhList(sistemRes.sistem_tubuh || []);
      setBodyPartList(bodyPartsRes.bagian_tubuh || []);
      setPatogenList(patogenRes.patogen || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal memuat data master");
      }
    } finally {
      setLoading(false);
    }
  };

  // Jalankan setelah fetchInitialData dideklarasikan
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan state modal ke native <dialog>
  useEffect(() => {
    const dialog = penyakitModalRef.current;
    if (!dialog) return;
    if (showPenyakitModal && !dialog.open) {
      dialog.showModal();
    } else if (!showPenyakitModal && dialog.open) {
      dialog.close();
    }
  }, [showPenyakitModal]);

  useEffect(() => {
    const dialog = artikelModalRef.current;
    if (!dialog) return;
    if (showArtikelModal && !dialog.open) {
      dialog.showModal();
    } else if (!showArtikelModal && dialog.open) {
      dialog.close();
    }
  }, [showArtikelModal]);

  useEffect(() => {
    const dialog = patogenModalRef.current;
    if (!dialog) return;
    if (showPatogenModal && !dialog.open) {
      dialog.showModal();
    } else if (!showPatogenModal && dialog.open) {
      dialog.close();
    }
  }, [showPatogenModal]);

  // --- HANDLER PENYAKIT ---
  const handleNewPenyakit = () => {
    setSelectedPenyakit(null);
    setPenyakitForm({
      nama: "",
      slug: "",
      ringkasan: "",
      thumbnail: "",
      tingkat_urgensi: "normal",
      id_sistem_tubuh: sistemTubuhList[0]?.id || "",
      code: "",
      bagian_tubuhIds: [],
      patogenIds: [],
    });
    setError(null);
    setSuccess(null);
    openPenyakitModal();
  };

  const handleSelectPenyakit = async (penyakit: PenyakitListItem) => {
    setSelectedPenyakit(penyakit);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.getDiseaseDetail(penyakit.id);
      const p = res.penyakit;
      setPenyakitForm({
        nama: p.nama,
        slug: p.slug,
        ringkasan: p.ringkasan ?? "",
        thumbnail: p.thumbnail ?? "",
        tingkat_urgensi: p.tingkat_urgensi,
        id_sistem_tubuh: p.id_sistem_tubuh,
        code: (p as PenyakitListItem).code ?? "",
        bagian_tubuhIds: (p.bagian_tubuh || []).map((b) => b.id),
        patogenIds: (p.patogen || []).map((pg) => pg.id),
      });
      openPenyakitModal();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal memuat detail penyakit");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBodyPart = (id: number) => {
    setPenyakitForm((prev) => {
      const exists = prev.bagian_tubuhIds.includes(id);
      return {
        ...prev,
        bagian_tubuhIds: exists
          ? prev.bagian_tubuhIds.filter((item) => item !== id)
          : [...prev.bagian_tubuhIds, id],
      };
    });
  };

  const handleTogglePatogen = (id: number) => {
    setPenyakitForm((prev) => {
      const exists = prev.patogenIds.includes(id);
      return {
        ...prev,
        patogenIds: exists
          ? prev.patogenIds.filter((item) => item !== id)
          : [...prev.patogenIds, id],
      };
    });
  };

  /**
   * Referensi (URL sumber) dikelola dari editor artikel, bukan dari form
   * penyakit. Datanya tetap milik penyakit (`referensi.id_penyakit`), tapi
   * satu-satunya tempat UI-nya adalah saat menulis artikel.
   *
   * Validasi URL di sisi klien sengaja dibuat sama dengan `normalizeUrl` di
   * BFF supaya tidak ada URL yang lolos di form lalu ditolak server.
   */
  const validateReferensiUrl = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return "URL referensi tidak boleh kosong";
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return "URL tidak valid. Contoh: https://www.who.int/";
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Hanya URL http:// atau https:// yang diperbolehkan";
    }
    if (value.length > 2000) return "URL terlalu panjang (maksimal 2000 karakter)";
    return null;
  };

  /** Muat URL referensi penyakit yang sedang diedit artikelnya. */
  const loadReferensi = async (idPenyakit: number) => {
    setReferensiError(null);
    setEditingReferensi(null);
    setReferensiInput("");
    try {
      const res = await api.getDiseaseDetail(idPenyakit);
      // Baris `referensi` bisa ber-`url` NULL dari data lama; form ini hanya
      // menangani URL, jadi null diabaikan (server juga menolak URL invalid).
      setReferensiList(
        (res.penyakit.referensi || [])
          .map((r) => r.url)
          .filter((u): u is string => typeof u === "string" && u.length > 0),
      );
      setReferensiSaved(
        (res.penyakit.referensi || [])
          .map((r) => r.url)
          .filter((u): u is string => typeof u === "string" && u.length > 0),
      );
    } catch (err) {
      if (err instanceof ApiError) setReferensiError(err.message);
      else setReferensiError("Gagal memuat referensi penyakit");
    }
  };

  const handleAddReferensi = () => {
    const invalid = validateReferensiUrl(referensiInput);
    if (invalid) {
      setReferensiError(invalid);
      return;
    }
    // Normalisasi agar `https://who.int` dan `https://who.int/` tidak terduplikasi.
    const url = new URL(referensiInput.trim()).toString();
    if (referensiList.includes(url)) {
      setReferensiError("URL ini sudah ada di daftar");
      return;
    }
    setReferensiList((prev) => [...prev, url]);
    setReferensiInput("");
    setReferensiError(null);
  };

  const handleEditReferensi = (index: number, value: string) => {
    const invalid = validateReferensiUrl(value);
    if (invalid) {
      setReferensiError(invalid);
      return;
    }
    const url = new URL(value.trim()).toString();
    const bentrok = referensiList.some((existing, i) => i !== index && existing === url);
    if (bentrok) {
      setReferensiError("URL ini sudah ada di daftar");
      return;
    }
    setReferensiList((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
    setReferensiError(null);
    setEditingReferensi(null);
  };

  const handleStartEditReferensi = (index: number) => {
    setReferensiDraft(referensiList[index]);
    setReferensiError(null);
    setEditingReferensi(index);
  };

  const handleCancelEditReferensi = () => {
    setReferensiError(null);
    setEditingReferensi(null);
  };

  const handleRemoveReferensi = (index: number) => {
    setReferensiList((prev) => prev.filter((_, i) => i !== index));
    setReferensiError(null);
    setEditingReferensi((prev) => (prev === index ? null : prev));
  };

  const handleSaveReferensi = async () => {
    if (!selectedArtikel) return;
    setReferensiSaving(true);
    setReferensiError(null);
    try {
      await api.savePenyakitReferensi(selectedArtikel.id_penyakit, referensiList);
      setReferensiSaved(referensiList);
      setSuccess("Referensi berhasil disimpan");
    } catch (err) {
      if (err instanceof ApiError) setReferensiError(err.message);
      else setReferensiError("Gagal menyimpan referensi");
    } finally {
      setReferensiSaving(false);
    }
  };

  const handleSavePenyakit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penyakitForm.nama || !penyakitForm.slug || !penyakitForm.id_sistem_tubuh) {
      setError("Nama, Slug, dan Sistem Tubuh wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (selectedPenyakit) {
        await api.updatePenyakit(selectedPenyakit.id, {
          nama: penyakitForm.nama,
          slug: penyakitForm.slug,
          ringkasan: penyakitForm.ringkasan || null,
          thumbnail: penyakitForm.thumbnail || null,
          tingkat_urgensi: penyakitForm.tingkat_urgensi,
          id_sistem_tubuh: Number(penyakitForm.id_sistem_tubuh),
          code: penyakitForm.code || null,
          bagian_tubuhIds: penyakitForm.bagian_tubuhIds,
          patogenIds: penyakitForm.patogenIds,
        });
        setSuccess("Penyakit berhasil diperbarui");
      } else {
        await api.createPenyakit({
          nama: penyakitForm.nama,
          slug: penyakitForm.slug,
          ringkasan: penyakitForm.ringkasan || null,
          thumbnail: penyakitForm.thumbnail || null,
          tingkat_urgensi: penyakitForm.tingkat_urgensi,
          id_sistem_tubuh: Number(penyakitForm.id_sistem_tubuh),
          code: penyakitForm.code || null,
          bagian_tubuhIds: penyakitForm.bagian_tubuhIds,
          patogenIds: penyakitForm.patogenIds,
        });
        setSuccess("Penyakit baru berhasil ditambahkan");
      }
      // Refresh list
      const refreshed = await loadPenyakitList();
      setPenyakitList(refreshed);
      setSelectedPenyakit(null);
      closePenyakitModal();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal menyimpan data penyakit");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER ARTIKEL (MULTI-BAGIAN) ---
  const handleSelectArtikel = async (artikel: ArtikelListItem) => {
    setSelectedArtikel(artikel);
    setEditMode("artikel");
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.getArtikelBagian(artikel.id);
      if (res.bagian && res.bagian.length > 0) {
        setBagianList(res.bagian);
      } else {
        // Inisialisasi 1 bagian kosong jika artikel belum punya bagian
        setBagianList([
          {
            id_artikel: artikel.id,
            judul: "Pengertian & Ringkasan",
            konten: "",
            tipe: "ringkasan",
            urutan: 1,
          },
        ]);
      }
      // Referensi ikut ditampilkan di editor artikel.
      void loadReferensi(artikel.id_penyakit);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal memuat bagian artikel");
    } finally {
      setLoading(false);
    }
  };

  // --- LOM PAT KE ARTIKEL DARI PENYAKIT ---
  const handleOpenArtikelForPenyakit = (penyakit: PenyakitListItem) => {
    const artikel = artikelList.find((a) => a.id_penyakit === penyakit.id);
    if (artikel) {
      handleSelectArtikel(artikel);
    } else {
      handleCreateArtikel(penyakit);
    }
  };

  // --- HANDLER PATOGEN ---
  const openPatogenModal = () => setShowPatogenModal(true);
  const closePatogenModal = () => setShowPatogenModal(false);

  const loadPatogenList = async () => {
    const res = await api.patogen.list();
    setPatogenList(res.patogen || []);
  };

  const handleNewPatogen = () => {
    setEditingPatogen(null);
    setPatogenForm({ nama: "", jenis: "virus", deskripsi: "", penyakitIds: [] });
    setError(null);
    setSuccess(null);
    openPatogenModal();
  };

  const handleEditPatogen = async (pg: Patogen) => {
    setEditingPatogen(pg);
    setPatogenForm({
      nama: pg.nama,
      jenis: pg.jenis,
      deskripsi: pg.deskripsi ?? "",
      penyakitIds: [],
    });
    setError(null);
    setSuccess(null);
    try {
      const { patogen } = await api.patogen.detail(pg.id);
      setPatogenForm({
        nama: patogen.nama,
        jenis: patogen.jenis,
        deskripsi: patogen.deskripsi ?? "",
        penyakitIds: (patogen.penyakit || []).map((d) => d.id),
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal memuat detail patogen");
    }
    openPatogenModal();
  };

  const handleTogglePatogenPenyakit = (id: number) => {
    setPatogenForm((prev) => {
      const exists = prev.penyakitIds.includes(id);
      return {
        ...prev,
        penyakitIds: exists
          ? prev.penyakitIds.filter((item) => item !== id)
          : [...prev.penyakitIds, id],
      };
    });
  };

  const handleSavePatogen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patogenForm.nama.trim()) {
      setError("Nama patogen wajib diisi");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingPatogen) {
        await api.patogen.update(editingPatogen.id, patogenForm);
        setSuccess("Patogen berhasil diperbarui");
      } else {
        await api.patogen.create(patogenForm);
        setSuccess("Patogen baru berhasil ditambahkan");
      }
      await loadPatogenList();
      setEditingPatogen(null);
      closePatogenModal();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal menyimpan patogen");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatogen = async (pg: Patogen) => {
    if (!window.confirm(`Hapus patogen "${pg.nama}"?`)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patogen.remove(pg.id);
      setPatogenList((prev) => prev.filter((p) => p.id !== pg.id));
      setSuccess(`Patogen "${pg.nama}" dihapus`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal menghapus patogen");
    } finally {
      setLoading(false);
    }
  };

  // --- BUAT ARTIKEL BARU ---
  const handleNewArtikel = () => {
    setError(null);
    setSuccess(null);
    openArtikelModal();
  };

  const handleCreateArtikel = async (penyakit: PenyakitListItem) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.createArtikel(penyakit.id);
      const artikel = res.artikel;
      // Refresh list
      const artikelRes = await api.getArtikelList();
      setArtikelList(artikelRes.artikel || []);
      closeArtikelModal();
      // Langsung masuk editor artikel baru
      setSelectedArtikel(artikel as ArtikelListItem);
      setEditMode("artikel");
      setBagianList([
        {
          id_artikel: artikel.id,
          judul: "Pengertian & Ringkasan",
          konten: "",
          tipe: "ringkasan",
          urutan: 1,
        },
      ]);
      // Referensi ikut ditampilkan di editor artikel.
      void loadReferensi(artikel.id_penyakit);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal membuat artikel");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBagian = () => {
    setBagianList((prev) => [
      ...prev,
      {
        id_artikel: selectedArtikel?.id,
        judul: "",
        konten: "",
        tipe: "lainnya",
        urutan: prev.length + 1,
      },
    ]);
  };

  const handleRemoveBagian = (index: number) => {
    setBagianList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleBagianChange = (index: number, field: keyof ArtikelBagian, value: string) => {
    setBagianList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  /**
   * Terapkan pembungkus Markdown (mis. `**tebal**`) pada pilihan kursor.
   * Kalau tidak ada teks yang dipilih, sisipkan `placeholder` sebagai contoh
   * supaya admin langsung tahu formatnya.
   */
  const applyMarkdownWrap = (
    index: number,
    before: string,
    after: string,
    placeholder: string,
  ) => {
    const el = bagianRefs.current[index];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = bagianList[index]?.konten ?? "";
    const selected = current.slice(start, end) || placeholder;
    const next = current.slice(0, start) + before + selected + after + current.slice(end);
    handleBagianChange(index, "konten", next);
    requestAnimationFrame(() => {
      el.focus();
      // Kursor ditaruh di dalam placeholder agar mudah diketik setelahnya.
      const caret = start + before.length;
      el.setSelectionRange(caret, caret + selected.length);
    });
  };

  /**
   * Terapkan awalan baris (mis. `## ` atau `- `) ke setiap baris yang sedang
   * dipilih. Kalau tidak ada pilihan, sisipkan satu baris baru di akhir konten.
   */
  const applyMarkdownLine = (index: number, prefix: string) => {
    const el = bagianRefs.current[index];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = bagianList[index]?.konten ?? "";
    const next =
      end > start
        ? current
            .slice(0, start)
            .split("\n")
            .map((line) => prefix + line)
            .join("\n") + current.slice(end)
        : `${current}${current.length > 0 ? "\n" : ""}${prefix}`;
    handleBagianChange(index, "konten", next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = next.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleSaveArtikel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArtikel) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Siapkan payload dengan urutan terbaru
      const payload = bagianList.map((b, idx) => ({
        ...b,
        urutan: idx + 1,
      }));
      await api.saveArtikelBagian(selectedArtikel.id, payload);
      setSuccess("Konten artikel berhasil disimpan");

      // Refresh artikel list
      const res = await api.getArtikelList();
      setArtikelList(res.artikel || []);
      setSelectedArtikel(null);
      setEditMode(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal menyimpan artikel");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !editMode) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <FadeIn>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shadow-sm shrink-0 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="font-display text-lg text-ink font-semibold">Panel Admin</h2>
                <p className="text-xs text-muted-foreground">{user?.nama}</p>
              </div>
              <Badge variant="secondary" className="uppercase text-[10px]">
                {user?.role}
              </Badge>
            </div>

            <nav className="flex flex-col gap-1">
              <Button
                variant={editMode === null ? "secondary" : "ghost"}
                size="sm"
                className="justify-start font-medium"
                onClick={() => {
                  setEditMode(null);
                  setSelectedPenyakit(null);
                  setSelectedArtikel(null);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Ringkasan
              </Button>
              <Button
                variant={editMode === "penyakit" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start font-medium"
                onClick={() => {
                  setEditMode("penyakit");
                  setSelectedPenyakit(null);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Katalog Penyakit
              </Button>
              <Button
                variant={editMode === "artikel" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start font-medium"
                onClick={() => {
                  setEditMode("artikel");
                  setSelectedArtikel(null);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Edukasi & Artikel
              </Button>
              <Button
                variant={editMode === "patogen" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start font-medium"
                onClick={() => {
                  setEditMode("patogen");
                  setError(null);
                  setSuccess(null);
                }}
              >
                Daftar Patogen
              </Button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 bg-card border border-border rounded-xl p-6 shadow-sm min-w-0">
            {error && (
              <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* ======================================================== */}
            {/* DOMAIN PENYAKIT */}
            {/* ======================================================== */}
            {editMode === "penyakit" && !selectedPenyakit && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl text-ink font-semibold">Daftar Penyakit</h3>
                    <p className="text-xs text-muted-foreground">Kelola master data penyakit, hubungan organ dan sistem</p>
                  </div>
                  <Button onClick={handleNewPenyakit} className="bg-pine text-white hover:bg-pine/90 text-xs">
                    + Tambah Penyakit
                  </Button>
                </div>

                <div className="grid gap-2">
                  {penyakitList.map((p) => {
                    const hasArtikel = artikelList.some((a) => a.id_penyakit === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPenyakit(p)}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-border/60 hover:border-pine/40 hover:bg-muted/30 cursor-pointer transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-ink text-sm">{p.nama}</h4>
                            <span className="text-xs font-mono text-muted-foreground">({p.slug})</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sistem: {p.sistem_tubuh_nama || p.sistem_tubuh?.nama || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenArtikelForPenyakit(p);
                            }}
                            title={hasArtikel ? "Buka artikel penyakit ini" : "Buat artikel untuk penyakit ini"}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-ink transition hover:border-pine/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${hasArtikel ? "bg-pine" : "bg-muted-foreground/50"}`} />
                            Artikel{hasArtikel ? " (Ada)" : " (+)"}
                          </button>
                          <UrgencyBadge disease={{ tingkat_urgensi: p.tingkat_urgensi }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Native <dialog> modal untuk Tambah/Edit Penyakit */}
            <dialog
              ref={penyakitModalRef}
              onClose={closePenyakitModal}
              onCancel={(e) => { e.preventDefault(); closePenyakitModal(); }}
              className="m-auto w-[min(92vw,56rem)] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
            >
              {showPenyakitModal && (
                <form onSubmit={handleSavePenyakit} className="p-6 space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 className="font-display text-xl text-ink font-semibold">
                      {selectedPenyakit ? `Edit Penyakit: ${selectedPenyakit.nama}` : "Tambah Penyakit Baru"}
                    </h3>
                    <Button type="button" variant="ghost" size="sm" onClick={closePenyakitModal}>
                      Tutup
                    </Button>
                  </div>

                  {error && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Nama Penyakit *
                      </label>
                      <input
                        type="text"
                        required
                        value={penyakitForm.nama}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, nama: e.target.value })}
                        placeholder="Contoh: Tuberkulosis (TBC)"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Slug URL *
                      </label>
                      <input
                        type="text"
                        required
                        value={penyakitForm.slug}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, slug: e.target.value })}
                        placeholder="contoh: tuberkulosis"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Sistem Tubuh Terkait *
                      </label>
                      <select
                        required
                        value={penyakitForm.id_sistem_tubuh}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, id_sistem_tubuh: Number(e.target.value) })}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      >
                        <option value="">Pilih Sistem Organ</option>
                        {sistemTubuhList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Tingkat Urgensi
                      </label>
                      <select
                        value={penyakitForm.tingkat_urgensi}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, tingkat_urgensi: e.target.value as UrgencyLevel })}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      >
                        <option value="normal">Normal (Konsultasi rutin)</option>
                        <option value="waspada">Waspada (Butuh perhatian)</option>
                        <option value="darurat">Darurat (Gawat darurat)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Kode AI / Model Map
                      </label>
                      <input
                        type="text"
                        value={penyakitForm.code}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, code: e.target.value })}
                        placeholder="Contoh: TBC, COVID_19"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Thumbnail Path / URL
                      </label>
                      <input
                        type="text"
                        value={penyakitForm.thumbnail}
                        onChange={(e) => setPenyakitForm({ ...penyakitForm, thumbnail: e.target.value })}
                        placeholder="/images/penyakit/tbc.jpg"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      Ringkasan Singkat
                    </label>
                    <textarea
                      rows={2}
                      value={penyakitForm.ringkasan}
                      onChange={(e) => setPenyakitForm({ ...penyakitForm, ringkasan: e.target.value })}
                      placeholder="Penjelasan ringkas 1-2 kalimat untuk kartu pencarian..."
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>

                  {/* Relasi Patogen — Multi-Select */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Patogen Penyebab — pilih lebih dari satu
                    </label>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr] md:items-start">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Daftar patogen ({patogenList.length}):
                        </p>
                        {patogenList.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Belum ada patogen. Tambahkan lewat menu "Daftar Patogen".
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                            {patogenList.map((pg) => {
                              const selected = penyakitForm.patogenIds.includes(pg.id);
                              return (
                                <button
                                  key={pg.id}
                                  type="button"
                                  onClick={() => handleTogglePatogen(pg.id)}
                                  aria-pressed={selected}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                                    selected
                                      ? "border-pine/40 bg-pine/10 text-pine hover:bg-pine/20"
                                      : "border-border bg-background text-muted-foreground hover:border-pine/40 hover:text-ink"
                                  }`}
                                >
                                  {selected && <span aria-hidden="true">✓</span>}
                                  {pg.nama}
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {pg.jenis}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Dipilih ({penyakitForm.patogenIds.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                          {penyakitForm.patogenIds.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Belum ada patogen dipilih.
                            </span>
                          ) : (
                            patogenList
                              .filter((pg) => penyakitForm.patogenIds.includes(pg.id))
                              .map((pg) => (
                                <button
                                  key={pg.id}
                                  type="button"
                                  onClick={() => handleTogglePatogen(pg.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-pine/30 bg-pine/10 px-2.5 py-1 text-xs text-pine hover:bg-pine/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                                >
                                  {pg.nama}
                                  <span aria-hidden="true">×</span>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Relasi Bagian Tubuh — Body Map Multi-Select */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Lokasi / Bagian Tubuh Terkait — klik pada peta tubuh
                    </label>
                    <div className="grid gap-4 md:grid-cols-[280px_1fr] md:items-start">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <BodyMap
                          selectedPartId={null}
                          onSelectPart={() => {}}
                          highlightedIds={penyakitForm.bagian_tubuhIds}
                          multiSelect
                          onTogglePart={handleToggleBodyPart}
                          selectedPartMeta={`${penyakitForm.bagian_tubuhIds.length} bagian dipilih`}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Bagian yang dipilih ({penyakitForm.bagian_tubuhIds.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                          {penyakitForm.bagian_tubuhIds.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Belum ada bagian tubuh dipilih. Klik area pada peta untuk menandai.
                            </span>
                          ) : (
                            bodyPartList
                              .filter((bp) => penyakitForm.bagian_tubuhIds.includes(bp.id))
                              .map((bp) => (
                                <button
                                  key={bp.id}
                                  type="button"
                                  onClick={() => handleToggleBodyPart(bp.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-pine/30 bg-pine/10 px-2.5 py-1 text-xs text-pine hover:bg-pine/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                                >
                                  {bp.nama}
                                  <span aria-hidden="true">×</span>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={closePenyakitModal}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-pine text-white hover:bg-pine/90">
                      {loading ? "Menyimpan..." : "Simpan Penyakit"}
                    </Button>
                  </div>
                </form>
              )}
            </dialog>

            {/* ======================================================== */}
            {/* DOMAIN ARTIKEL & SECTIONS */}
            {/* ======================================================== */}
            {editMode === "artikel" && !selectedArtikel && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl text-ink font-semibold">Daftar Konten Artikel</h3>
                    <p className="text-xs text-muted-foreground">Kelola struktur seksi edukasi, gejala, penanganan per penyakit</p>
                  </div>
                  <Button onClick={handleNewArtikel} className="bg-pine text-white hover:bg-pine/90 text-xs" disabled={loading}>
                    + Tambah Artikel
                  </Button>
                </div>

                <div className="grid gap-2">
                  {artikelList.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleSelectArtikel(a)}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 hover:border-pine/40 hover:bg-muted/30 cursor-pointer transition"
                    >
                      <div>
                        <h4 className="font-medium text-ink text-sm">{a.penyakit_nama}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {a.judul ? `${a.judul} — ` : ""}
                          {a.konten ? a.konten.substring(0, 90) : "Belum ada konten"}...
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Kelola Bagian
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editMode === "artikel" && selectedArtikel && (
              <form onSubmit={handleSaveArtikel} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl text-ink font-semibold">
                      Edit Artikel: {selectedArtikel.penyakit_nama}
                    </h3>
                    <p className="text-xs text-muted-foreground">Atur judul dan isi konten per bagian/seksi</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedArtikel(null);
                      setEditMode("artikel");
                    }}
                  >
                    Batal
                  </Button>
                </div>

                <div className="space-y-4">
                  {bagianList.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-border bg-background/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-pine bg-pine/10 px-2 py-0.5 rounded">
                          Bagian #{idx + 1}
                        </span>
                        {bagianList.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBagian(idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs px-2"
                          >
                            Hapus Bagian
                          </Button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Judul Bagian
                          </label>
                          <input
                            type="text"
                            value={b.judul || ""}
                            onChange={(e) => handleBagianChange(idx, "judul", e.target.value)}
                            placeholder="Contoh: Gejala Klinis, Pencegahan, dsb."
                            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Tipe Bagian
                          </label>
                          <select
                            value={b.tipe || "lainnya"}
                            onChange={(e) => handleBagianChange(idx, "tipe", e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          >
                            <option value="ringkasan">Ringkasan</option>
                            <option value="gejala">Gejala</option>
                            <option value="penyebab">Penyebab</option>
                            <option value="diagnosis">Diagnosis</option>
                            <option value="penanganan">Penanganan</option>
                            <option value="pencegahan">Pencegahan</option>
                            <option value="kapan_ke_dokter">Kapan ke Dokter</option>
                            <option value="lainnya">Lainnya</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Konten Markdown
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPreviewBagian((prev) => (prev === idx ? null : idx))
                            }
                            aria-pressed={previewBagian === idx}
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-pine"
                          >
                            {previewBagian === idx ? "Sembunyikan pratinjau" : "Pratinjau"}
                          </Button>
                        </div>

                        {/* Toolbar formatting: admins tidak perlu menghafal sintaks. */}
                        <div className="mb-1.5 flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 px-1.5 py-1">
                          <ToolbarButton
                            label="Tebal"
                            title="Tebal (Ctrl+B)"
                            onClick={() => applyMarkdownWrap(idx, "**", "**", "teks tebal")}
                          >
                            <span className="font-bold text-xs">B</span>
                          </ToolbarButton>
                          <ToolbarButton
                            label="Miring"
                            title="Miring (Ctrl+I)"
                            onClick={() => applyMarkdownWrap(idx, "_", "_", "teks miring")}
                          >
                            <span className="italic font-serif text-xs">I</span>
                          </ToolbarButton>
                          <ToolbarButton
                            label="Subjudul"
                            title="Subjudul (##)"
                            onClick={() => applyMarkdownLine(idx, "## ")}
                          >
                            <span className="text-xs font-semibold">H2</span>
                          </ToolbarButton>
                          <ToolbarButton
                            label="Daftar"
                            title="Daftar berbutir (-)"
                            onClick={() => applyMarkdownLine(idx, "- ")}
                          >
                            <span className="text-xs">•</span>
                          </ToolbarButton>
                          <ToolbarButton
                            label="Tautan"
                            title="Tautan ([teks](url))"
                            onClick={() =>
                              applyMarkdownWrap(idx, "[", "](https://)", "teks tautan")
                            }
                          >
                            <span className="text-xs underline">Tautan</span>
                          </ToolbarButton>
                          <span className="ml-auto pr-1 text-[10px] text-muted-foreground">
                            Markdown
                          </span>
                        </div>

                        <div
                          className={
                            previewBagian === idx ? "grid gap-3 lg:grid-cols-2" : ""
                          }
                        >
                          <textarea
                            ref={(el) => {
                              bagianRefs.current[idx] = el;
                            }}
                            rows={previewBagian === idx ? 18 : 16}
                            value={b.konten || ""}
                            onChange={(e) =>
                              handleBagianChange(idx, "konten", e.target.value)
                            }
                            placeholder="Tuliskan isi edukasi. Pilih teks lalu gunakan tombol di atas untuk menebalkan, membuat subjudul, daftar, atau tautan."
                            className="w-full rounded-md border border-border bg-background p-3 text-sm font-sans text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                          {previewBagian === idx && (
                            <div className="rounded-md border border-border bg-background/50 p-3">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Pratinjau
                              </p>
                              {b.konten ? (
                                <ArticleProse>{b.konten}</ArticleProse>
                              ) : (
                                <p className="text-xs italic text-muted-foreground">
                                  Belum ada konten untuk ditampilkan.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddBagian}
                    className="w-full border-dashed border-2 hover:border-pine hover:bg-pine/5 text-pine text-xs py-3"
                  >
                    + Tambah Bagian / Seksi Baru
                  </Button>
                </div>

                {/* Referensi — URL sumber penyakit, ditampilkan di bagian "Referensi"
                    pada halaman detail penyakit. Disimpan terpisah dari konten
                    artikel karena datanya milik penyakit, bukan artikel. */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">
                        Referensi / Sumber Medis
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Tautan yang ditampilkan pada bagian "Referensi" di halaman
                        penyakit, misalnya WHO, Kemenkes, atau jurnal ilmiah.
                      </p>
                    </div>
                    {referensiDirty && (
                      <span className="text-[11px] font-medium text-amber-600">
                        Belum disimpan
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      id="referensi-input-artikel"
                      type="url"
                      value={referensiInput}
                      onChange={(e) => {
                        setReferensiInput(e.target.value);
                        if (referensiError) setReferensiError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddReferensi();
                        }
                      }}
                      placeholder="https://www.who.int/..."
                      aria-invalid={referensiError ? true : undefined}
                      aria-describedby={referensiError ? "referensi-error-artikel" : undefined}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                    <Button
                      type="button"
                      onClick={handleAddReferensi}
                      disabled={referensiSaving}
                      className="shrink-0 bg-pine text-white hover:bg-pine/90"
                    >
                      + Tambah
                    </Button>
                  </div>
                  {referensiError && (
                    <p id="referensi-error-artikel" role="alert" className="text-xs text-red-600">
                      {referensiError}
                    </p>
                  )}

                  <ul className="space-y-1.5">
                    {referensiList.length === 0 ? (
                      <li className="text-xs text-muted-foreground italic">
                        Belum ada referensi.
                      </li>
                    ) : (
                      referensiList.map((url, index) =>
                        editingReferensi === index ? (
                          <li
                            key={`edit-${index}`}
                            className="flex items-center gap-2 rounded-lg border border-pine/40 bg-background px-3 py-2"
                          >
                            <input
                              type="url"
                              value={referensiDraft}
                              onChange={(e) => setReferensiDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleEditReferensi(index, referensiDraft);
                                }
                                if (e.key === "Escape") handleCancelEditReferensi();
                              }}
                              className="w-full bg-transparent text-sm text-ink outline-none"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleEditReferensi(index, referensiDraft)}
                              className="shrink-0 bg-pine text-white hover:bg-pine/90"
                            >
                              Simpan
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEditReferensi}
                              className="shrink-0"
                            >
                              Batal
                            </Button>
                          </li>
                        ) : (
                          <li
                            key={url}
                            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={url}
                              className="min-w-0 flex-1 truncate text-sm text-pine hover:underline"
                            >
                              {url}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleStartEditReferensi(index)}
                              aria-label={`Ubah referensi ${url}`}
                              className="shrink-0 rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveReferensi(index)}
                              aria-label={`Hapus referensi ${url}`}
                              className="shrink-0 rounded p-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                            >
                              Hapus
                            </button>
                          </li>
                        ),
                      )
                    )}
                  </ul>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSaveReferensi}
                      disabled={referensiSaving || !referensiDirty}
                      className="bg-pine text-white hover:bg-pine/90"
                    >
                      {referensiSaving ? "Menyimpan..." : "Simpan Referensi"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedArtikel(null);
                      setEditMode("artikel");
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-pine text-white hover:bg-pine/90">
                    {loading ? "Menyimpan..." : "Simpan Semua Bagian"}
                  </Button>
                </div>
              </form>
            )}

            {/* Empty landing state -> Dashboard */}
            {!editMode && <Dashboard />}

            {/* ======================================================== */}
            {/* DOMAIN PATOGEN */}
            {/* ======================================================== */}
            {editMode === "patogen" && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl text-ink font-semibold">Daftar Patogen</h3>
                    <p className="text-xs text-muted-foreground">Kelola mikroorganisme penyebab penyakit (virus, bakteri, jamur, parasit)</p>
                  </div>
                  <Button onClick={handleNewPatogen} className="bg-pine text-white hover:bg-pine/90 text-xs" disabled={loading}>
                    + Tambah Patogen
                  </Button>
                </div>

                {patogenList.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-8 text-center">
                    Belum ada patogen. Mulai dengan menambah patogen pertama.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {patogenList.map((pg) => (
                      <div
                        key={pg.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-border/60 hover:border-pine/40 hover:bg-muted/30 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-ink text-sm">{pg.nama}</h4>
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {pg.jenis}
                            </Badge>
                          </div>
                          {pg.deskripsi && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {pg.deskripsi}
                            </p>
                          )}
                          {typeof pg.jumlah_penyakit === "number" && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Terkait {pg.jumlah_penyakit} penyakit
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPatogen(pg)}
                            className="h-8 px-2.5 text-xs"
                            disabled={loading}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePatogen(pg)}
                            disabled={loading}
                            className="h-8 px-2.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </FadeIn>

      {/* Modal pilih penyakit untuk artikel baru */}
      <dialog
        ref={artikelModalRef}
        onClose={closeArtikelModal}
        onCancel={(e) => { e.preventDefault(); closeArtikelModal(); }}
        className="m-auto w-[min(92vw,32rem)] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        {showArtikelModal && (
          <div className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-display text-xl text-ink font-semibold">Tambah Artikel Edukasi</h3>
              <Button type="button" variant="ghost" size="sm" onClick={closeArtikelModal}>
                Tutup
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Pilih penyakit yang belum memiliki artikel.
            </p>

            <div className="mt-4 space-y-2">
              {penyakitList.filter((p) => !artikelList.some((a) => a.id_penyakit === p.id)).length === 0 && (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Semua penyakit sudah memiliki artikel.
                </p>
              )}
              {penyakitList
                .filter((p) => !artikelList.some((a) => a.id_penyakit === p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleCreateArtikel(p)}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-3.5 rounded-lg border border-border/60 hover:border-pine/40 hover:bg-muted/30 text-left cursor-pointer transition disabled:opacity-50"
                  >
                    <div>
                      <h4 className="font-medium text-ink text-sm">{p.nama}</h4>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.slug}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Buat Artikel</Badge>
                  </button>
                ))}
            </div>
          </div>
        )}
      </dialog>

      {/* Modal Tambah/Edit Patogen */}
      <dialog
        ref={patogenModalRef}
        onClose={closePatogenModal}
        onCancel={(e) => { e.preventDefault(); closePatogenModal(); }}
        className="m-auto w-[min(92vw,32rem)] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        {showPatogenModal && (
          <form onSubmit={handleSavePatogen} className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-display text-xl text-ink font-semibold">
                {editingPatogen ? `Edit Patogen: ${editingPatogen.nama}` : "Tambah Patogen Baru"}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={closePatogenModal}>
                Tutup
              </Button>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Nama Patogen *
              </label>
              <input
                type="text"
                required
                value={patogenForm.nama}
                onChange={(e) => setPatogenForm({ ...patogenForm, nama: e.target.value })}
                placeholder="Contoh: Mycobacterium tuberculosis"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Jenis
              </label>
              <select
                value={patogenForm.jenis}
                onChange={(e) => setPatogenForm({ ...patogenForm, jenis: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
              >
                <option value="virus">Virus</option>
                <option value="bakteri">Bakteri</option>
                <option value="jamur">Jamur</option>
                <option value="parasit">Parasit</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Deskripsi
              </label>
              <textarea
                rows={3}
                value={patogenForm.deskripsi}
                onChange={(e) => setPatogenForm({ ...patogenForm, deskripsi: e.target.value })}
                placeholder="Penjelasan ringkas tentang patogen ini..."
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
              />
            </div>

            {/* Relasi Penyakit — Multi-Select */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Penyakit yang Disebabkan — pilih lebih dari satu
              </label>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr] md:items-start">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Daftar penyakit ({penyakitList.length}):
                  </p>
                  {penyakitList.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Belum ada penyakit.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                      {penyakitList.map((d) => {
                        const selected = patogenForm.penyakitIds.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleTogglePatogenPenyakit(d.id)}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                              selected
                                ? "border-pine/40 bg-pine/10 text-pine hover:bg-pine/20"
                                : "border-border bg-background text-muted-foreground hover:border-pine/40 hover:text-ink"
                            }`}
                          >
                            {selected && <span aria-hidden="true">✓</span>}
                            {d.nama}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Dipilih ({patogenForm.penyakitIds.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                    {patogenForm.penyakitIds.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Belum ada penyakit dipilih.
                      </span>
                    ) : (
                      penyakitList
                        .filter((d) => patogenForm.penyakitIds.includes(d.id))
                        .map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleTogglePatogenPenyakit(d.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-pine/30 bg-pine/10 px-2.5 py-1 text-xs text-pine hover:bg-pine/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                          >
                            {d.nama}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={closePatogenModal}>
                Batal
              </Button>
              <Button type="submit" disabled={loading} className="bg-pine text-white hover:bg-pine/90">
                {loading ? "Menyimpan..." : "Simpan Patogen"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}