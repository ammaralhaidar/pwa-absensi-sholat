"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Santri = { id: string; nama_santri: string; kelas: string; nis: string };
type Sesi = { id: string; nama_sesi: string };

export default function UdzurPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [sesiList, setSesiList] = useState<Sesi[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Form State
  const [selectedSantriId, setSelectedSantriId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [kelas, setKelas] = useState("");
  const [selectedSesi, setSelectedSesi] = useState("");
  const [kategoriUdzur, setKategoriUdzur] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const [santriRes, sesiRes] = await Promise.all([
        supabase.from("data_santri").select("id, nama_santri, kelas, nis").order('nama_santri'),
        supabase.from("sesi_sholat").select("id, nama_sesi").order('jam_mulai')
      ]);

      if (santriRes.data) setSantriList(santriRes.data);
      if (sesiRes.data) setSesiList(sesiRes.data);
      setIsLoadingData(false);
    };
    fetchData();
  }, []);

  const handleSantriSelect = (id: string) => {
    setSelectedSantriId(id);
    const santri = santriList.find(s => s.id === id);
    if (santri) {
      setKelas(santri.kelas);
    } else {
      setKelas("");
    }
  };

  // Simple autocomplete search since there are many santri
  const filteredSantri = searchName 
    ? santriList.filter(s => s.nama_santri.toLowerCase().includes(searchName.toLowerCase()) || s.nis.includes(searchName))
    : santriList;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    
    if (!selectedSantriId || !selectedSesi || !kategoriUdzur) {
      setFeedback({ type: 'error', message: "Mohon lengkapi semua field wajib (*)" });
      return;
    }

    setIsSubmitting(true);
    try {
      const fullKeterangan = kategoriUdzur !== 'lainnya' 
        ? `${kategoriUdzur.toUpperCase()}${keterangan ? ' - ' + keterangan : ''}`
        : keterangan || 'Lainnya';

      const res = await fetch('/api/udzur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          santri_id: selectedSantriId,
          sesi_id: selectedSesi,
          keterangan: fullKeterangan
        })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: "Udzur berhasil dicatat!" });
        // Reset form partially
        setSelectedSantriId("");
        setSearchName("");
        setKelas("");
        setKeterangan("");
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: "Gagal menyambung ke server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="p-8 text-center text-slate-500">Memuat data santri dan sesi...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Input Udzur Manual</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Formulir pencatatan santri yang berhalangan hadir sholat</p>
      </div>

      <div className="max-w-2xl w-full mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 rounded-t-xl pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Form Pengajuan Udzur</CardTitle>
                  <CardDescription>Lengkapi data di bawah ini dengan benar.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {feedback && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-sm font-medium">{feedback.message}</p>
                </div>
              )}

              {/* Nama Santri (Searchable) */}
              <div className="space-y-2">
                <Label htmlFor="santri">Cari & Pilih Santri <span className="text-red-500">*</span></Label>
                <div className="grid gap-2">
                  <Input 
                    placeholder="Ketik nama atau NIS untuk mencari..." 
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  {searchName && filteredSantri.length > 0 && !selectedSantriId && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-md max-h-[150px] overflow-y-auto bg-white dark:bg-slate-950 shadow-sm">
                      {filteredSantri.slice(0, 10).map(s => (
                        <div 
                          key={s.id} 
                          className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 last:border-0"
                          onClick={() => {
                            setSearchName(`${s.nama_santri} (${s.nis})`);
                            handleSantriSelect(s.id);
                          }}
                        >
                          <div className="font-medium">{s.nama_santri}</div>
                          <div className="text-xs text-slate-500">NIS: {s.nis} | Kelas: {s.kelas}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedSantriId && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedSantriId(""); setSearchName(""); setKelas(""); }} className="w-fit">
                      Ubah Santri
                    </Button>
                  )}
                </div>
              </div>

              {/* Kelas (Autofill) */}
              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas</Label>
                <Input 
                  id="kelas" 
                  value={kelas} 
                  disabled 
                  placeholder="Otomatis terisi" 
                  className="bg-slate-50 dark:bg-slate-900 text-slate-500"
                />
              </div>

              {/* Sesi Sholat */}
              <div className="space-y-2">
                <Label htmlFor="sesi">Sesi Sholat <span className="text-red-500">*</span></Label>
                <Select onValueChange={(val) => val && setSelectedSesi(val)} value={selectedSesi}>
                  <SelectTrigger id="sesi">
                    <SelectValue placeholder="Pilih sesi sholat...">
                      {selectedSesi ? sesiList.find(s => s.id === selectedSesi)?.nama_sesi || selectedSesi : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sesiList.map(s => (
                       <SelectItem key={s.id} value={s.id}>{s.nama_sesi}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori Udzur */}
              <div className="space-y-2">
                <Label htmlFor="udzur">Kategori Udzur <span className="text-red-500">*</span></Label>
                <Select onValueChange={(val) => val && setKategoriUdzur(val)} value={kategoriUdzur}>
                  <SelectTrigger id="udzur">
                    <SelectValue placeholder="Pilih alasan udzur..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sakit">Sakit</SelectItem>
                    <SelectItem value="Izin Pulang">Izin Pulang</SelectItem>
                    <SelectItem value="Izin Kegiatan">Izin Kegiatan Luar</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan Tambahan (Opsional)</Label>
                <Textarea 
                  id="keterangan" 
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Tuliskan keterangan detail mengenai udzur..." 
                  className="min-h-[100px] resize-none"
                />
              </div>

            </CardContent>
            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl pt-6 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => { setSelectedSantriId(""); setSearchName(""); setKelas(""); setFeedback(null); }}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white gap-2">
                <Save className="w-4 h-4" />
                {isSubmitting ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
