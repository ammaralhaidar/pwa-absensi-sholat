"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Clock, Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type SesiSholat = {
  id: string;
  nama_sesi: string;
  jam_mulai: string;
  jam_batas_hadir: string;
  jam_berakhir: string;
};

export default function SettingsPage() {
  const [sessions, setSessions] = useState<SesiSholat[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("sesi_sholat").select("*").order("jam_mulai", { ascending: true });
      if (data && !error) {
        setSessions(data);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleTimeChange = (id: string, field: keyof SesiSholat, value: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        // Pastikan input time ditambahkan detik ":00" jika belum ada untuk kompatibilitas DB
        const timeValue = value.length === 5 ? `${value}:00` : value;
        return { ...s, [field]: timeValue };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      for (const sesi of sessions) {
        await supabase.from("sesi_sholat").update({
          jam_mulai: sesi.jam_mulai,
          jam_batas_hadir: sesi.jam_batas_hadir,
          jam_berakhir: sesi.jam_berakhir
        }).eq("id", sesi.id);
      }
      alert("Konfigurasi waktu berhasil disimpan ke database!");
    } catch (err) {
      alert("Gagal menyimpan konfigurasi!");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (nama: string) => {
    const n = nama.toLowerCase();
    if (n.includes("subuh")) return <Sunrise className="w-5 h-5 text-indigo-400" />;
    if (n.includes("maghrib")) return <Sunset className="w-5 h-5 text-red-400" />;
    if (n.includes("isya")) return <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />;
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Memuat konfigurasi...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="mb-6 md:mb-8 max-w-4xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Pengaturan Waktu Absensi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sesuaikan batas jam absen untuk masing-masing sesi sholat.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || sessions.length === 0} className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm w-full md:w-auto">
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>

      <div className="max-w-4xl w-full mx-auto space-y-6 pb-20 md:pb-8">
        {sessions.length === 0 && (
          <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-red-500">Data Sesi Sholat tidak ditemukan di database. Pastikan Anda telah menjalankan script SQL awal.</p>
          </div>
        )}
        
        {sessions.map((s) => {
          return (
            <Card key={s.id} className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 px-6 flex items-center gap-3">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                  {getIcon(s.nama_sesi)}
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Sholat {s.nama_sesi}</h3>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Jam Mulai */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      Mulai Buka Absen
                    </Label>
                    <Input 
                      type="time" 
                      value={s.jam_mulai.substring(0, 5)}
                      onChange={(e) => handleTimeChange(s.id, "jam_mulai", e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11"
                    />
                    <p className="text-[11px] text-slate-400">Scanner aktif untuk sholat ini.</p>
                  </div>

                  {/* Batas Terlambat */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Batas Terlambat
                    </Label>
                    <Input 
                      type="time" 
                      value={s.jam_batas_hadir.substring(0, 5)}
                      onChange={(e) => handleTimeChange(s.id, "jam_batas_hadir", e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11"
                    />
                    <p className="text-[11px] text-slate-400">Lewat jam ini akan dihitung terlambat.</p>
                  </div>

                  {/* Batas Akhir / Ghoib */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      Batas Akhir (Ditutup)
                    </Label>
                    <Input 
                      type="time" 
                      value={s.jam_berakhir.substring(0, 5)}
                      onChange={(e) => handleTimeChange(s.id, "jam_berakhir", e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11"
                    />
                    <p className="text-[11px] text-slate-400">Lewat jam ini otomatis dianggap ghoib.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
