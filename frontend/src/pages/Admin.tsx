import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { FadeIn } from "@/components/FadeIn";
import { BodyMap } from "@/components/bodyMap/BodyMap";
import type { UrgencyLevel, BodyPartRecord, SystemRecord, ArtikelBagian } from "@/lib/types";

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
  id_penyakit?: number;
  judul: string;
  konten: string;
  penyakit_nama: string;
}

export default function Admin() {
  const { user } = useAuth();
  
  // Lists data
  const [penyakitList, setPenyakitList] = useState<PenyakitListItem[]>([]);
  const [artikelList, setArtikelList] = useState<ArtikelListItem[]>([]);
  const [sistemTubuhList, setSistemTubuhList] = useState<SystemRecord[]>([]);
  const [bodyPartList, setBodyPartList] = useState<BodyPartRecord[]>([]);
  
  // Selection & Mode
  const [editMode, setEditMode] = useState<"penyakit" | "artikel" | null>(null);
  const [selectedPenyakit, setSelectedPenyakit] = useState<PenyakitListItem | null>(null);
  const [selectedArtikel, setSelectedArtikel] = useState<ArtikelListItem | null>(null);

  // Modal state for penyakit form
  const [showPenyakitModal, setShowPenyakitModal] = useState(false);
  const penyakitModalRef = useRef<HTMLDialogElement>(null);
  
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
  }>({
    nama: "",
    slug: "",
    ringkasan: "",
    thumbnail: "",
    tingkat_urgensi: "normal",
    id_sistem_tubuh: "",
    code: "",
    bagian_tubuhIds: [],
  });

  // Artikel Multi-Bagian State
  const [bagianList, setBagianList] = useState<ArtikelBagian[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openPenyakitModal = () => setShowPenyakitModal(true);
  const closePenyakitModal = () => setShowPenyakitModal(false);

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
      const [penyakitList, artikelRes, sistemRes, bodyPartsRes] = await Promise.all([
        loadPenyakitList(),
        api.getArtikelList(),
        api.getSistemTubuh(),
        api.getBodyParts(),
      ]);
      setPenyakitList(penyakitList);
      setArtikelList(artikelRes.artikel || []);
      setSistemTubuhList(sistemRes.sistem_tubuh || []);
      setBodyPartList(bodyPartsRes.bagian_tubuh || []);
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
        await api.updatePenyakit(selectedPenyakit.id, penyakitForm);
        setSuccess("Penyakit berhasil diperbarui");
      } else {
        await api.createPenyakit(penyakitForm);
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
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Gagal memuat bagian artikel");
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
                  {penyakitList.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPenyakit(p)}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 hover:border-pine/40 hover:bg-muted/30 cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-ink text-sm">{p.nama}</h4>
                          <span className="text-xs font-mono text-muted-foreground">({p.slug})</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Sistem: {p.sistem_tubuh_nama || p.sistem_tubuh?.nama || "-"}
                        </p>
                      </div>
                      <UrgencyBadge disease={{ tingkat_urgensi: p.tingkat_urgensi }} />
                    </div>
                  ))}
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
                <div className="mb-6 pb-3 border-b border-border">
                  <h3 className="font-display text-xl text-ink font-semibold">Daftar Konten Artikel</h3>
                  <p className="text-xs text-muted-foreground">Kelola struktur seksi edukasi, gejala, penanganan per penyakit</p>
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
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Konten Markdown
                        </label>
                        <textarea
                          rows={6}
                          value={b.konten || ""}
                          onChange={(e) => handleBagianChange(idx, "konten", e.target.value)}
                          placeholder="Tuliskan isi edukasi dalam format Markdown..."
                          className="w-full rounded-md border border-border bg-background p-3 text-sm font-sans text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                        />
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

            {/* Empty landing state */}
            {!editMode && (
              <div className="text-center py-16">
                <h2 className="font-display text-2xl text-ink font-semibold">Selamat Datang di Panel Manajemen</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Pilih menu di samping untuk mengelola katalog penyakit, menghubungkan sistem dan bagian tubuh, atau mengedit artikel edukasi.
                </p>
              </div>
            )}
          </main>
        </div>
      </FadeIn>
    </div>
  );
}