import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { FadeIn } from "@/components/FadeIn";

export default function Admin() {
  const { user } = useAuth();
  const [penyakitList, setPenyakitList] = useState<Array<any>>([]);
  const [artikelList, setArtikelList] = useState<Array<any>>([]);
  const [selectedPenyakit, setSelectedPenyakit] = useState<any>(null);
  const [selectedArtikel, setSelectedArtikel] = useState<any>(null);
  const [editMode, setEditMode] = useState<'penyakit' | 'artikel' | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch penyakit list via search with empty query (limit 50)
      const penyakitRes = await api.searchDiseases("");
      setPenyakitList(penyakitRes.penyakit);
      
      // Fetch artikel list
      const artikelRes = await api.getArtikelList();
      setArtikelList(artikelRes.artikel);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal memuat data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPenyakit = (penyakit: any) => {
    setSelectedPenyakit(penyakit);
    setEditMode('penyakit');
    setLoading(true);
    api.getDiseaseDetail(penyakit.id)
      .then(res => {
        const p = res.penyakit;
        setFormData({
          id: p.id,
          nama: p.nama,
          slug: p.slug,
          ringkasan: p.ringkasan ?? '',
          thumbnail: p.thumbnail ?? '',
          tingkat_urgensi: p.tingkat_urgensi,
          id_sistem_tubuh: p.id_sistem_tubuh,
        });
      })
      .catch(err => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Gagal memuat detail penyakit");
      })
      .finally(() => setLoading(false));
  };

const handleSelectArtikel = (artikel: any) => {
     setSelectedArtikel(artikel);
     setEditMode('artikel');
     setFormData({
       id: artikel.id,
       judul: artikel.judul ?? '',
       konten: artikel.konten ?? '',
     });
   };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (editMode === 'penyakit') {
        // Update penyakit via BFF endpoint we will create
        const res = await api.put(`/api/penyakit/${selectedPenyakit?.id}`, formData);
        setSuccess("Penyakit berhasil diperbarui");
      } else if (editMode === 'artikel') {
        // Update artikel via BFF endpoint
        const res = await api.put(`/api/artikel/${selectedArtikel?.id}`, formData);
        setSuccess("Artikel berhasil diperbarui");
      }
      // Refresh data after save
      fetchData();
      // Reset selection
      setSelectedPenyakit(null);
      setSelectedArtikel(null);
      setEditMode(null);
      setFormData({});
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal menyimpan");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pine border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FadeIn>
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-64 bg-card border-r border-border flex flex-col">
            <div className="flex items-center justify-between p-4">
              <h2 className="font-display text-xl text-ink">Admin Panel</h2>
              <Badge variant="secondary">{user?.nama} ({user?.role})</Badge>
            </div>
            <nav className="flex-1 overflow-y-auto">
              <ul className="space-y-1 p-4">
                <li>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full text-left"
                    onClick={() => {
                      setEditMode('penyakit');
                      setSelectedPenyakit(null);
                      setFormData({});
                    }}
                  >
                    Daftar Penyakit
                  </Button>
                </li>
                <li>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full text-left"
                    onClick={() => {
                      setEditMode('artikel');
                      setSelectedArtikel(null);
                      setFormData({});
                    }}
                  >
                    Daftar Artikel
                  </Button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
                {success}
              </div>
            )}

            {editMode === 'penyakit' && !selectedPenyakit && (
              <div className="mb-6">
                <h3 className="font-display text-lg text-ink mb-2">Daftar Penyakit</h3>
                <div className="space-y-2">
                  {penyakitList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectPenyakit(p)}>
                      <div className="flex-1">
                        <h4 className="font-medium text-ink">{p.nama}</h4>
                        <p className="text-sm text-muted-foreground">{p.slug}</p>
                      </div>
                      <UrgencyBadge disease={{ tingkat_urgensi: p.tingkat_urgensi }} className="h-8 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editMode === 'penyakit' && selectedPenyakit && (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <h3 className="font-display text-lg text-ink">Edit Penyakit: {selectedPenyakit.nama}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Nama</label>
                    <input 
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      required
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Slug</label>
                    <input 
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Ringkasan</label>
                    <textarea
                      value={formData.ringkasan || ''}
                      onChange={(e) => setFormData({ ...formData, ringkasan: e.target.value })}
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Thumbnail (URL)</label>
                    <input 
                      value={formData.thumbnail || ''}
                      onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Tingkat Urgensi</label>
                    <select
                      value={formData.tingkat_urgensi || 'normal'}
                      onChange={(e) => setFormData({ ...formData, tingkat_urgensi: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    >
                      <option value="normal">Normal</option>
                      <option value="waspada">Waspada</option>
                      <option value="darurat">Darurat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Sistem Tubuh</label>
                    <select
                      value={formData.id_sistem_tubuh || ''}
                      onChange={(e) => setFormData({ ...formData, id_sistem_tubuh: Number(e.target.value) })}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    >
                      {/* We need to fetch sistem tubuh list; for now placeholder */}
                      <option value="">Pilih Sistem Tubuh</option>
                      <option value="1">Sistem Pernapasan</option>
                      <option value="2">Sistem Pencernaan</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-pine text-white hover:bg-pine/90">
                  Simpan Perubahan
                </Button>
              </form>
            )}

            {editMode === 'artikel' && !selectedArtikel && (
              <div className="mb-6">
                <h3 className="font-display text-lg text-ink mb-2">Daftar Artikel</h3>
                {artikelList.length > 0 ? (
                  <div className="space-y-2">
                    {artikelList.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectArtikel(a)}>
                        <div className="flex-1">
                          <h4 className="font-medium text-ink">{a.penyakit_nama} – {a.judul}</h4>
                          <p className="text-sm text-muted-foreground">{a.konten.substring(0, 100)}{a.konten.length > 100 ? '...' : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada artikel.</p>
                )}
              </div>
            )}

            {editMode === 'artikel' && selectedArtikel && (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <h3 className="font-display text-lg text-ink">Edit Artikel: {selectedArtikel.penyakit_nama} – {selectedArtikel.judul}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Konten (Markdown)</label>
                    <textarea
                      value={formData.konten || ''}
                      onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                      rows={12}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-pine text-white hover:bg-pine/90">
                  Simpan Perubahan
                </Button>
              </form>
            )}

            {!editMode && (
              <div className="text-center py-12">
                <h2 className="font-display text-2xl text-ink">Selamat Datang di Panel Admin</h2>
                <p className="mt-4 text-muted-foreground">
                  Pilih menu di samping untuk mulai mengelola konten.
                </p>
              </div>
            )}
          </main>
        </div>
      </FadeIn>
    </div>
  );
}