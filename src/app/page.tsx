"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, UserCheck, Clock, CheckCircle2, Timer, Settings2, AlertTriangle } from "lucide-react";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScanLog = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  time: string;
  status: "Hadir" | "Terlambat";
};

type SesiSholat = {
  id: string;
  nama_sesi: string;
  jam_mulai: string;
  jam_batas_hadir: string;
  jam_berakhir: string;
};

export default function Home() {
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [sesiList, setSesiList] = useState<(SesiSholat & { active: boolean })[]>([]);
  const [activeSesi, setActiveSesi] = useState<SesiSholat | null>(null);
  const [nextSesi, setNextSesi] = useState<SesiSholat | null>(null);
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideMulai, setOverrideMulai] = useState("");
  const [overrideBatas, setOverrideBatas] = useState("");
  const [overrideAkhir, setOverrideAkhir] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  const fetchSesi = async () => {
    const { data, error } = await supabase.from("sesi_sholat").select("*").order("jam_mulai", { ascending: true });
    if (data && !error) {
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      let foundActive = false;
      let active: SesiSholat | null = null;
      let next: SesiSholat | null = null;

      const processedSesi = data.map((sesi) => {
        let isActive = false;
        if (nowTime >= sesi.jam_mulai && nowTime <= sesi.jam_berakhir) {
          isActive = true;
          foundActive = true;
          active = sesi;
        }
        return { ...sesi, active: isActive };
      });

      if (!foundActive && data.length > 0) {
        // Find next session today
        next = data.find(s => s.jam_mulai > nowTime) || data[0]; 
      }

      setActiveSesi(active);
      setNextSesi(next);
      setSesiList(processedSesi);
    }
  };

  const fetchRecentLogs = async () => {
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = wibNow.toISOString().split('T')[0];

    // Step 1: Ambil 5 log scan terbaru hari ini (Hadir/Terlambat saja)
    const { data: logs } = await supabase
      .from('log_absensi')
      .select('id, santri_id, status, waktu_scan')
      .eq('tanggal', todayStr)
      .in('status', ['Hadir', 'Terlambat'])
      .order('waktu_scan', { ascending: false })
      .limit(5);

    if (!logs || logs.length === 0) {
      setScanHistory([]);
      return;
    }

    // Step 2: Ambil data santri berdasarkan ID unik dari log
    const santriIds = [...new Set(logs.map(l => l.santri_id))];
    const { data: santriData } = await supabase
      .from('data_santri')
      .select('id, nama_santri, kelas, nis')
      .in('id', santriIds);

    const santriMap = new Map((santriData || []).map(s => [s.id, s]));

    // Gabungkan data log + santri
    const result: ScanLog[] = logs.map(log => {
      const santri = santriMap.get(log.santri_id);
      return {
        id: log.id,
        nis: santri?.nis || '',
        nama: santri?.nama_santri || 'Unknown',
        kelas: santri?.kelas || '-',
        time: new Date(log.waktu_scan).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: log.status as 'Hadir' | 'Terlambat'
      };
    });
    setScanHistory(result);
  };

  useEffect(() => {
    fetchSesi();
    fetchRecentLogs();

    // Realtime: subscribe ke INSERT baru di log_absensi
    // Agar semua device yang terbuka otomatis menerima data scan terbaru
    const channel = supabase
      .channel('scan-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'log_absensi' },
        () => { fetchRecentLogs(); }
      )
      .subscribe();

    const interval = setInterval(fetchSesi, 60000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (nextSesi && !activeSesi) {
      const updateCountdown = () => {
        const now = new Date();
        const [h, m, s] = nextSesi.jam_mulai.split(':').map(Number);
        const target = new Date();
        target.setHours(h, m, s, 0);
        
        if (target < now) {
          target.setDate(target.getDate() + 1);
        }
        
        const diff = target.getTime() - now.getTime();
        if (diff <= 0) {
          fetchSesi(); // Should trigger active session now
        } else {
          const hh = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const mm = Math.floor((diff / 1000 / 60) % 60);
          const ss = Math.floor((diff / 1000) % 60);
          setCountdown(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`);
        }
      };
      
      updateCountdown(); // Run immediately
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [nextSesi, activeSesi]);

  const handleOverrideOpen = () => {
    if (nextSesi) {
      const now = new Date();
      const currentH = now.getHours().toString().padStart(2, '0');
      const currentM = now.getMinutes().toString().padStart(2, '0');
      setOverrideMulai(`${currentH}:${currentM}:00`);
      setOverrideBatas(nextSesi.jam_batas_hadir);
      setOverrideAkhir(nextSesi.jam_berakhir);
      setIsOverrideOpen(true);
    }
  };

  const handleForceStart = async () => {
    if (!nextSesi) return;
    setIsUpdating(true);
    
    const { error } = await supabase
      .from('sesi_sholat')
      .update({
        jam_mulai: overrideMulai,
        jam_batas_hadir: overrideBatas,
        jam_berakhir: overrideAkhir
      })
      .eq('id', nextSesi.id);

    setIsUpdating(false);
    if (!error) {
      setIsOverrideOpen(false);
      fetchSesi(); // Refresh to activate the session
    } else {
      alert("Gagal mengupdate jadwal.");
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis: decodedText }),
      });

      const result = await response.json();

      if (result.success) {
        const newLog: ScanLog = {
          id: Math.random().toString(36).substr(2, 9),
          nis: decodedText,
          nama: result.data.nama,
          kelas: result.data.kelas,
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: result.data.status,
        };
        
        setScanHistory(prev => [newLog, ...prev].slice(0, 5));
      }
      return result;
    } catch (error) {
      return { success: false, message: "Kesalahan jaringan" };
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] p-4 md:p-8">
      <InstallPrompt />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Scanner Kehadiran</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem presensi cepat menggunakan barcode 1D</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        
        {/* Main Scanner Area */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col gap-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status Sesi</p>
              {activeSesi ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Sholat {activeSesi.nama_sesi} (Aktif)
                  </h2>
                  <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full w-max">
                    <Clock className="w-4 h-4" />
                    <span>{activeSesi.jam_mulai.substring(0,5)} - {activeSesi.jam_berakhir.substring(0,5)} WIB</span>
                  </div>
                </>
              ) : nextSesi ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Menunggu Sholat {nextSesi.nama_sesi}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-full w-max">
                    <Timer className="w-4 h-4 animate-pulse" />
                    <span>{countdown}</span>
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Memuat Sesi...</h2>
              )}
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${activeSesi ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
              <UserCheck className="w-7 h-7" />
            </div>
          </div>

          {/* Scanner or Countdown Component */}
          <div className="flex-1 rounded-3xl overflow-hidden relative min-h-[400px] flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {activeSesi ? (
              <BarcodeScanner onScanSuccess={handleScanSuccess} />
            ) : nextSesi ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-slate-900 shadow-xl">
                  <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Kamera Tertidur</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Kamera akan otomatis menyala saat jadwal Sholat {nextSesi.nama_sesi} tiba dalam <span className="font-semibold text-primary">{countdown}</span>.</p>
                
                <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
                  <DialogTrigger 
                    render={
                      <Button onClick={handleOverrideOpen} variant="outline" className="gap-2 border-slate-300 dark:border-slate-700 w-full rounded-xl h-12 shadow-sm">
                        <Settings2 className="w-4 h-4" />
                        Buka Absen Lebih Awal
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Mulai Absen Sekarang
                      </DialogTitle>
                      <DialogDescription>
                        Sesi {nextSesi.nama_sesi} belum dimulai. Sesuaikan batas keterlambatan di bawah ini jika acara/sholat dimajukan.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Jam Mulai Sesi</Label>
                        <Input value={overrideMulai} onChange={(e) => setOverrideMulai(e.target.value)} type="time" step="1" />
                      </div>
                      <div className="space-y-2">
                        <Label>Batas Hadir Tepat Waktu</Label>
                        <Input value={overrideBatas} onChange={(e) => setOverrideBatas(e.target.value)} type="time" step="1" />
                      </div>
                      <div className="space-y-2">
                        <Label>Jam Berakhir Sesi</Label>
                        <Input value={overrideAkhir} onChange={(e) => setOverrideAkhir(e.target.value)} type="time" step="1" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsOverrideOpen(false)}>Batal</Button>
                      <Button onClick={handleForceStart} disabled={isUpdating} className="bg-primary text-white">
                        {isUpdating ? "Memproses..." : "Buka Scanner"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="text-slate-500">Memuat antarmuka...</p>
            )}
          </div>
        </div>

        {/* Sidebar / Info Area */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-6">
          {/* Jadwal Hari Ini */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">Jadwal Hari Ini</h3>
            <div className="space-y-3 mt-4">
              {sesiList.map((sesi) => (
                <div key={sesi.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${sesi.active ? "bg-primary/5 border-primary/20" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${sesi.active ? "bg-primary animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <span className={`text-sm font-semibold ${sesi.active ? "text-primary" : "text-slate-600 dark:text-slate-400"}`}>{sesi.nama_sesi}</span>
                  </div>
                  <span className={`text-xs font-medium ${sesi.active ? "text-primary" : "text-slate-500"}`}>{sesi.jam_mulai.substring(0,5)} - {sesi.jam_berakhir.substring(0,5)}</span>
                </div>
              ))}
              {sesiList.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">Memuat jadwal...</p>
              )}
            </div>
          </div>

          {/* Riwayat Scan */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">Riwayat Scan Terbaru</h3>
            
            {scanHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                  <Clock className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Belum ada data pindaian.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Data santri yang berhasil dipindai akan muncul di sini secara real-time.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-2">
                {scanHistory.map((log) => (
                  <div key={log.id} className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.nama} <span className="text-sm font-normal text-slate-500">({log.kelas})</span>
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        log.status === 'Hadir' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                          : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
