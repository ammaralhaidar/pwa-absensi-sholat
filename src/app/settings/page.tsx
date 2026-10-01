"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Save, Clock, Sun, Sunrise, Sunset, Moon, Plus, Trash2, 
  CalendarDays, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Check
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAMA_HARI, SesiSholat } from "@/utils/sessionHelper";

export default function SettingsPage() {
  const [sessions, setSessions] = useState<SesiSholat[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedSpecialDay, setExpandedSpecialDay] = useState<Record<string, boolean>>({});
  const [needsSqlMigration, setNeedsSqlMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // New Session Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState<{
    nama_sesi: string;
    jam_mulai: string;
    jam_batas_hadir: string;
    jam_berakhir: string;
    hari_aktif: number[];
  }>({
    nama_sesi: "",
    jam_mulai: "07:00",
    jam_batas_hadir: "07:15",
    jam_berakhir: "07:30",
    hari_aktif: [1, 2, 3, 4, 5]
  });

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role || user?.app_metadata?.role;
    if (role === 'admin') {
      setIsAdmin(true);
    }

    const { data, error } = await supabase.from("sesi_sholat").select("*").order("jam_mulai", { ascending: true });
    if (data && !error) {
      setSessions(data.map(s => ({
        ...s,
        hari_aktif: s.hari_aktif || [0, 1, 2, 3, 4, 5, 6],
        jadwal_khusus: s.jadwal_khusus || {}
      })));
    }
    setIsLoading(false);
  };

  const handleTimeChange = (id: string, field: "jam_mulai" | "jam_batas_hadir" | "jam_berakhir", value: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        const timeValue = value.length === 5 ? `${value}:00` : value;
        return { ...s, [field]: timeValue };
      }
      return s;
    }));
  };

  const handleToggleDay = (sessionId: string, dayIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const currentDays = s.hari_aktif || [0, 1, 2, 3, 4, 5, 6];
        let updatedDays: number[];
        if (currentDays.includes(dayIndex)) {
          updatedDays = currentDays.filter(d => d !== dayIndex);
        } else {
          updatedDays = [...currentDays, dayIndex].sort((a, b) => a - b);
        }
        return { ...s, hari_aktif: updatedDays };
      }
      return s;
    }));
  };

  const handleAddCustomDay = (sessionId: string, dayIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const currentCustom = { ...(s.jadwal_khusus || {}) };
        currentCustom[dayIndex.toString()] = {
          jam_mulai: s.jam_mulai,
          jam_batas_hadir: s.jam_batas_hadir,
          jam_berakhir: s.jam_berakhir
        };
        return { ...s, jadwal_khusus: currentCustom };
      }
      return s;
    }));
  };

  const handleRemoveCustomDay = (sessionId: string, dayIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const currentCustom = { ...(s.jadwal_khusus || {}) };
        delete currentCustom[dayIndex.toString()];
        return { ...s, jadwal_khusus: currentCustom };
      }
      return s;
    }));
  };

  const handleCustomDayTimeChange = (
    sessionId: string, 
    dayIndex: number, 
    field: "jam_mulai" | "jam_batas_hadir" | "jam_berakhir", 
    value: string
  ) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const currentCustom = { ...(s.jadwal_khusus || {}) };
        const dayKey = dayIndex.toString();
        const timeValue = value.length === 5 ? `${value}:00` : value;
        currentCustom[dayKey] = {
          ...(currentCustom[dayKey] || { jam_mulai: s.jam_mulai, jam_batas_hadir: s.jam_batas_hadir, jam_berakhir: s.jam_berakhir }),
          [field]: timeValue
        };
        return { ...s, jadwal_khusus: currentCustom };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert("Akses ditolak: Hanya Admin yang dapat mengubah konfigurasi jadwal!");
      return;
    }
    setIsSaving(true);
    let migrationNeeded = false;
    
    try {
      for (const sesi of sessions) {
        // Coba simpan dengan jadwal_khusus
        const updatePayload: any = {
          jam_mulai: sesi.jam_mulai,
          jam_batas_hadir: sesi.jam_batas_hadir,
          jam_berakhir: sesi.jam_berakhir,
          hari_aktif: sesi.hari_aktif || [0, 1, 2, 3, 4, 5, 6]
        };

        if (sesi.jadwal_khusus && Object.keys(sesi.jadwal_khusus).length > 0) {
          updatePayload.jadwal_khusus = sesi.jadwal_khusus;
        }

        const { error } = await supabase.from("sesi_sholat").update(updatePayload).eq("id", sesi.id);

        if (error && error.message.includes("jadwal_khusus")) {
          // Jika kolom jadwal_khusus belum dibuat di DB, fallback update field standar
          migrationNeeded = true;
          delete updatePayload.jadwal_khusus;
          await supabase.from("sesi_sholat").update(updatePayload).eq("id", sesi.id);
        } else if (error) {
          throw error;
        }
      }

      setNeedsSqlMigration(migrationNeeded);
      if (migrationNeeded) {
        alert("Konfigurasi jam & hari aktif berhasil disimpan!\n\nCatatan: Untuk mengaktifkan fitur jam khusus per hari, silakan jalankan 1 baris SQL yang tertera pada kotak kuning di bagian atas halaman.");
      } else {
        alert("Semua perubahan jadwal kegiatan berhasil disimpan ke database!");
      }
    } catch (err: any) {
      alert("Gagal menyimpan konfigurasi: " + (err?.message || "Terjadi kesalahan"));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.nama_sesi.trim()) {
      alert("Nama sesi kegiatan tidak boleh kosong!");
      return;
    }

    try {
      const payload: any = {
        nama_sesi: newSession.nama_sesi.trim(),
        jam_mulai: newSession.jam_mulai.length === 5 ? `${newSession.jam_mulai}:00` : newSession.jam_mulai,
        jam_batas_hadir: newSession.jam_batas_hadir.length === 5 ? `${newSession.jam_batas_hadir}:00` : newSession.jam_batas_hadir,
        jam_berakhir: newSession.jam_berakhir.length === 5 ? `${newSession.jam_berakhir}:00` : newSession.jam_berakhir,
        hari_aktif: newSession.hari_aktif
      };

      const { data, error } = await supabase.from("sesi_sholat").insert([payload]).select();
      if (error) throw error;

      alert(`Sesi kegiatan "${newSession.nama_sesi}" berhasil ditambahkan!`);
      setIsAddDialogOpen(false);
      setNewSession({
        nama_sesi: "",
        jam_mulai: "07:00",
        jam_batas_hadir: "07:15",
        jam_berakhir: "07:30",
        hari_aktif: [1, 2, 3, 4, 5]
      });
      fetchSettings();
    } catch (err: any) {
      alert("Gagal menambahkan sesi: " + (err?.message || "Terjadi kesalahan"));
    }
  };

  const handleDeleteSession = async (sesi: SesiSholat) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus sesi kegiatan "${sesi.nama_sesi}" secara permanen?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("sesi_sholat").delete().eq("id", sesi.id);
      if (error) throw error;

      alert(`Sesi "${sesi.nama_sesi}" berhasil dihapus.`);
      setSessions(prev => prev.filter(s => s.id !== sesi.id));
    } catch (err: any) {
      alert("Gagal menghapus sesi: " + (err?.message || "Terjadi kesalahan"));
    }
  };

  const copySqlSnippet = () => {
    navigator.clipboard.writeText("ALTER TABLE sesi_sholat ADD COLUMN IF NOT EXISTS jadwal_khusus JSONB DEFAULT '{}'::jsonb;");
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const getIcon = (nama: string) => {
    const n = nama.toLowerCase();
    if (n.includes("subuh")) return <Sunrise className="w-5 h-5 text-indigo-500" />;
    if (n.includes("apel")) return <CalendarDays className="w-5 h-5 text-emerald-500" />;
    if (n.includes("maghrib")) return <Sunset className="w-5 h-5 text-orange-500" />;
    if (n.includes("isya") || n.includes("tarbiyah") || n.includes("tahajud")) return <Moon className="w-5 h-5 text-purple-500" />;
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-slate-500 dark:text-slate-400">
        <Clock className="w-6 h-6 animate-spin mr-2" /> Memuat konfigurasi jadwal...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Akses Terbatas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Halaman Pengaturan Jadwal Absensi hanya dapat diakses oleh akun **Admin**.
          </p>
          <a href="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white font-medium rounded-xl text-sm shadow-sm hover:bg-primary/90 transition-colors">
            Kembali ke Scanner
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="mb-6 md:mb-8 max-w-4xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Pengaturan Jadwal & Hari Absensi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Atur keaktifan hari, jam reguler, jam custom per hari, atau tambah aktivitas baru.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "gap-2 border-slate-300 dark:border-slate-700 cursor-pointer"
              )}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              Tambah Aktivitas
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Aktivitas / Sesi Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan jenis kegiatan baru yang perlu diabsen oleh santri.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label>Nama Kegiatan / Sesi</Label>
                  <Input 
                    placeholder="Contoh: Senam Pagi, Muhadharah, Kajian Sore" 
                    value={newSession.nama_sesi}
                    onChange={(e) => setNewSession(prev => ({ ...prev, nama_sesi: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Mulai Buka</Label>
                    <Input 
                      type="time" 
                      value={newSession.jam_mulai}
                      onChange={(e) => setNewSession(prev => ({ ...prev, jam_mulai: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batas Terlambat</Label>
                    <Input 
                      type="time" 
                      value={newSession.jam_batas_hadir}
                      onChange={(e) => setNewSession(prev => ({ ...prev, jam_batas_hadir: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batas Ghoib</Label>
                    <Input 
                      type="time" 
                      value={newSession.jam_berakhir}
                      onChange={(e) => setNewSession(prev => ({ ...prev, jam_berakhir: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Hari Aktif</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {NAMA_HARI.map((dayName, idx) => {
                      const isActive = newSession.hari_aktif.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewSession(prev => {
                              const days = prev.hari_aktif.includes(idx)
                                ? prev.hari_aktif.filter(d => d !== idx)
                                : [...prev.hari_aktif, idx].sort((a, b) => a - b);
                              return { ...prev, hari_aktif: days };
                            });
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            isActive 
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                              : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
                <Button onClick={handleCreateSession} className="bg-primary text-white">Simpan Aktivitas Baru</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleSave} 
            disabled={isSaving || sessions.length === 0} 
            className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      {/* SQL Migration Notification (jika kolom jadwal_khusus belum aktif di Supabase) */}
      {needsSqlMigration && (
        <div className="max-w-4xl w-full mx-auto mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-xl text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-2 flex-1">
              <p className="font-semibold">Aktifkan Dukungan Jam Khusus per Hari di Supabase</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Kolom <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">jadwal_khusus</code> belum ada di database Supabase Anda. Untuk mengaktifkan fitur jam berbeda di hari tertentu (misal Apel di hari Ahad jam 08:00), jalankan 1 baris SQL berikut di Supabase SQL Editor:
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-900 font-mono text-xs overflow-x-auto">
                <span className="flex-1 text-slate-800 dark:text-slate-200">
                  ALTER TABLE sesi_sholat ADD COLUMN IF NOT EXISTS jadwal_khusus JSONB DEFAULT &apos;{}&apos;::jsonb;
                </span>
                <Button size="sm" variant="outline" onClick={copySqlSnippet} className="h-7 gap-1 text-xs shrink-0">
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? "Disalin!" : "Salin SQL"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List Sesi */}
      <div className="max-w-4xl w-full mx-auto space-y-6 pb-24 md:pb-8">
        {sessions.length === 0 && (
          <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">Belum ada data sesi kegiatan. Klik tombol &quot;Tambah Aktivitas&quot; untuk memulai.</p>
          </div>
        )}
        
        {sessions.map((s) => {
          const activeDays = s.hari_aktif || [0, 1, 2, 3, 4, 5, 6];
          const customDays = s.jadwal_khusus || {};
          const customDayKeys = Object.keys(customDays);
          const isCustomExpanded = !!expandedSpecialDay[s.id];

          return (
            <Card key={s.id} className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
              {/* Card Header */}
              <div className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700">
                    {getIcon(s.nama_sesi)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{s.nama_sesi}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeDays.length === 7 ? "Aktif Setiap Hari" : activeDays.length === 0 ? "Nonaktif" : `${activeDays.length} hari aktif per minggu`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSession(s)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 h-9 w-9 rounded-lg"
                    title="Hapus Sesi Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* 1. Pengaturan Jam Reguler */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Jam Reguler (Default)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Jam Mulai */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">
                        Mulai Buka Absen
                      </Label>
                      <Input 
                        type="time" 
                        value={s.jam_mulai.substring(0, 5)}
                        onChange={(e) => handleTimeChange(s.id, "jam_mulai", e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10"
                      />
                      <p className="text-[11px] text-slate-400">Scanner mulai aktif.</p>
                    </div>

                    {/* Batas Terlambat */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">
                        Batas Terlambat
                      </Label>
                      <Input 
                        type="time" 
                        value={s.jam_batas_hadir.substring(0, 5)}
                        onChange={(e) => handleTimeChange(s.id, "jam_batas_hadir", e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10"
                      />
                      <p className="text-[11px] text-slate-400">Lewat jam ini dihitung terlambat.</p>
                    </div>

                    {/* Batas Akhir / Ghoib */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">
                        Batas Ditutup (Ghoib)
                      </Label>
                      <Input 
                        type="time" 
                        value={s.jam_berakhir.substring(0, 5)}
                        onChange={(e) => handleTimeChange(s.id, "jam_berakhir", e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10"
                      />
                      <p className="text-[11px] text-slate-400">Lewat jam ini ditandai ghoib.</p>
                    </div>
                  </div>
                </div>

                {/* 2. Checklist Hari Keaktifan */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      Hari Keaktifan Absen
                    </span>
                    <span className="text-[11px] font-normal lowercase text-slate-400">
                      Klik hari untuk aktifkan / liburkan
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NAMA_HARI.map((dayName, idx) => {
                      const isActive = activeDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleDay(s.id, idx)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                            isActive
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through opacity-70"
                          }`}
                        >
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pengaturan Jam Khusus Hari Tertentu (Custom Day Time) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        Jam Khusus Hari Tertentu (Override)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Misal: Apel di hari Ahad jam 08:00, sedangkan hari biasa jam 07:00.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedSpecialDay(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="text-xs text-primary gap-1"
                    >
                      {customDayKeys.length > 0 ? `${customDayKeys.length} Jam Khusus` : "Atur"}
                      {isCustomExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {isCustomExpanded && (
                    <div className="space-y-3 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40">
                      {/* Existing custom overrides */}
                      {customDayKeys.length === 0 ? (
                        <p className="text-xs text-purple-800 dark:text-purple-300 italic">
                          Belum ada jam khusus. Pilih hari di bawah untuk menambahkan jam yang berbeda dari jam reguler.
                        </p>
                      ) : (
                        customDayKeys.map((dayStr) => {
                          const dayNum = parseInt(dayStr);
                          const dayConfig = customDays[dayStr] || {};
                          return (
                            <div key={dayStr} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                  Khusus Hari {NAMA_HARI[dayNum]}:
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveCustomDay(s.id, dayNum)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 text-xs px-2"
                                >
                                  Hapus Override
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500">Mulai</Label>
                                  <Input 
                                    type="time" 
                                    value={(dayConfig.jam_mulai || s.jam_mulai).substring(0, 5)}
                                    onChange={(e) => handleCustomDayTimeChange(s.id, dayNum, "jam_mulai", e.target.value)}
                                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500">Terlambat</Label>
                                  <Input 
                                    type="time" 
                                    value={(dayConfig.jam_batas_hadir || s.jam_batas_hadir).substring(0, 5)}
                                    onChange={(e) => handleCustomDayTimeChange(s.id, dayNum, "jam_batas_hadir", e.target.value)}
                                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500">Batas Ghoib</Label>
                                  <Input 
                                    type="time" 
                                    value={(dayConfig.jam_berakhir || s.jam_berakhir).substring(0, 5)}
                                    onChange={(e) => handleCustomDayTimeChange(s.id, dayNum, "jam_berakhir", e.target.value)}
                                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Add new day override selector */}
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-xs text-purple-900 dark:text-purple-300 font-medium">+ Tambah untuk Hari:</span>
                        <div className="flex flex-wrap gap-1">
                          {NAMA_HARI.map((dayName, idx) => {
                            if (customDays[idx.toString()]) return null; // sudah ada
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAddCustomDay(s.id, idx)}
                                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors"
                              >
                                + {dayName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
