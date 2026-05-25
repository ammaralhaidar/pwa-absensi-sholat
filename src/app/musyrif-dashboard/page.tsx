"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Plus, Camera, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const MOCK_STATUS_HARI_INI = [
  { id: 1, nama: "Ahmad", subuh: "Sudah", pagi: "Belum", ashar: "Belum", maghrib: "Belum", tarbiyah: "Belum" },
  { id: 2, nama: "Budi", subuh: "Terlambat", pagi: "Sudah", ashar: "Belum", maghrib: "Belum", tarbiyah: "Belum" },
  { id: 3, nama: "Fikri", subuh: "Sudah", pagi: "Sudah", ashar: "Belum", maghrib: "Belum", tarbiyah: "Belum" },
  { id: 4, nama: "Zaid", subuh: "Belum", pagi: "Belum", ashar: "Belum", maghrib: "Belum", tarbiyah: "Belum" },
];

const MOCK_RINGKASAN_HARIAN = [
  {
    nama: "Budi",
    logs: [
      { id: 3, tanggalUpload: "17/05/2026 08:00:00", aktifitas: "Pagi", foto: "https://placehold.co/100x100/1e293b/ffffff?text=Pagi", keterangan: "-", tanggalLog: "17/05/2026" },
      { id: 2, tanggalUpload: "17/05/2026 05:30:00", aktifitas: "Subuh", foto: "https://placehold.co/100x100/1e293b/ffffff?text=Subuh", keterangan: "Kesiangan", tanggalLog: "17/05/2026" },
    ]
  },
  {
    nama: "Fikri",
    logs: [
      { id: 5, tanggalUpload: "17/05/2026 07:45:00", aktifitas: "Pagi", foto: "https://placehold.co/100x100/1e293b/ffffff?text=Pagi", keterangan: "-", tanggalLog: "17/05/2026" },
      { id: 4, tanggalUpload: "17/05/2026 05:00:00", aktifitas: "Subuh", foto: "https://placehold.co/100x100/1e293b/ffffff?text=Subuh", keterangan: "-", tanggalLog: "17/05/2026" },
    ]
  },
  {
    nama: "Ahmad",
    logs: [
      { id: 1, tanggalUpload: "17/05/2026 05:10:00", aktifitas: "Subuh", foto: "https://placehold.co/100x100/1e293b/ffffff?text=Subuh", keterangan: "-", tanggalLog: "17/05/2026" },
    ]
  }
];

const MOCK_STATISTIK_KETERLAMBATAN = [
  { nama: "Ahmad", terlambat: 2 },
  { nama: "Budi", terlambat: 5 },
  { nama: "Fikri", terlambat: 1 },
  { nama: "Zaid", terlambat: 0 },
];

const MOCK_LIVE_MONITORING = [
  { id: 1, nama: "Budi", aktifitas: "Kegiatan Pagi", foto: "https://placehold.co/400x300/3b82f6/ffffff?text=Kegiatan+Pagi+Budi", waktu: "08:00 WIB" },
  { id: 2, nama: "Fikri", aktifitas: "Kegiatan Pagi", foto: "https://placehold.co/400x300/10b981/ffffff?text=Kegiatan+Pagi+Fikri", waktu: "07:45 WIB" },
  { id: 3, nama: "Ahmad", aktifitas: "Subuh", foto: "https://placehold.co/400x300/6366f1/ffffff?text=Subuh+Ahmad", waktu: "05:10 WIB" },
];

export default function MusyrifDashboard() {
  const router = useRouter();

  const SCHEDULES: Record<string, { h: number; m: number }> = {
    "Membangunkan Subuh": { h: 4, m: 30 },
    "Pengondisian Pagi": { h: 6, m: 30 },
    "Pengondisian Ashar": { h: 15, m: 0 },
    "Pengondisian Maghrib": { h: 17, m: 30 },
    "Tarbiyah Malam": { h: 20, m: 0 },
  };

  const CHECKLIST_ITEMS: Record<string, string[]> = {
    "Membangunkan Subuh": ["Membangunkan Subuh"],
    "Pengondisian Pagi": ["Menyiapkan Santri KBM", "Kebersihan Kamar", "Ngobrol Membangun Kedekatan"],
    "Pengondisian Ashar": ["Membangunkan Santri", "Memastikan Berangkat"],
    "Pengondisian Maghrib": ["Menyiapkan Santri", "Kebersihan Kamar"],
    "Tarbiyah Malam": ["Praktek Imam dan Kultum", "Nasehat", "Evaluasi"]
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [musyrifName, setMusyrifName] = useState("Musyrif");
  const [selectedAktivitas, setSelectedAktivitas] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMusyrifName(localStorage.getItem("userName") || "Musyrif (Dummy)");
    }
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAktivitasChange = (val: string | null) => {
    if (!val) return;
    setSelectedAktivitas(val);
    const initialChecklist: Record<string, boolean> = {};
    if (CHECKLIST_ITEMS[val]) {
      CHECKLIST_ITEMS[val].forEach(item => initialChecklist[item] = false);
    }
    setCheckedItems(initialChecklist);
  };

  const handleCheckboxChange = (item: string) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const isLate = () => {
    if (!selectedAktivitas) return false;
    const sched = SCHEDULES[selectedAktivitas];
    if (!sched) return false;

    const schedTime = new Date(currentDateTime);
    schedTime.setHours(sched.h, sched.m, 0, 0);

    // Check if current time is > 20 minutes after schedTime
    const diffMs = currentDateTime.getTime() - schedTime.getTime();
    return diffMs > 20 * 60 * 1000;
  };

  const showKeterangan = isLate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoBukti(URL.createObjectURL(e.target.files[0]));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Sudah":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Sudah</span>;
      case "Terlambat":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"><AlertCircle className="w-3 h-3" /> Terlambat</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><XCircle className="w-3 h-3" /> Belum</span>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-950">

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Musyrif</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitoring aktivitas dan absensi musyrif</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-md rounded-xl h-11 px-6 font-semibold">
          <Plus className="w-5 h-5 mr-2" />
          Buat Absen Aktivitas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Main Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Table Status Hari Ini */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Status Aktivitas Hari Ini</CardTitle>
              <CardDescription>Rekapitulasi absensi aktivitas per musyrif untuk hari ini.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama Musyrif</th>
                    <th className="px-4 py-3 font-semibold">Subuh</th>
                    <th className="px-4 py-3 font-semibold">Pagi</th>
                    <th className="px-4 py-3 font-semibold">Ashar</th>
                    <th className="px-4 py-3 font-semibold">Maghrib</th>
                    <th className="px-4 py-3 font-semibold">Tarbiyah</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_STATUS_HARI_INI.map((row, idx) => (
                    <tr key={row.id} className={idx !== MOCK_STATUS_HARI_INI.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.nama}</td>
                      <td className="px-4 py-3">{getStatusBadge(row.subuh)}</td>
                      <td className="px-4 py-3">{getStatusBadge(row.pagi)}</td>
                      <td className="px-4 py-3">{getStatusBadge(row.ashar)}</td>
                      <td className="px-4 py-3">{getStatusBadge(row.maghrib)}</td>
                      <td className="px-4 py-3">{getStatusBadge(row.tarbiyah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Nested Tabel Ringkasan Harian */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div className="space-y-1">
                <CardTitle>Ringkasan Harian Detail</CardTitle>
                <CardDescription>Log aktivitas harian yang sudah di-upload berdasarkan musyrif.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/musyrif-dashboard/logs-absen")} className="shrink-0 rounded-lg">
                Lihat Semua
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {MOCK_RINGKASAN_HARIAN.map((group, groupIdx) => (
                  <div key={groupIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                      Musyrif: {group.nama}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 font-medium">Tanggal Upload</th>
                            <th className="px-4 py-3 font-medium">Aktifitas</th>
                            <th className="px-4 py-3 font-medium">Foto Bukti</th>
                            <th className="px-4 py-3 font-medium">Ket. Terlambat</th>
                            <th className="px-4 py-3 font-medium">Tanggal Log</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.logs.map((log, idx) => (
                            <tr key={log.id} className={idx !== group.logs.length - 1 ? "border-b border-slate-100 dark:border-slate-800/50" : ""}>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {log.tanggalUpload}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium">{log.aktifitas}</td>
                              <td className="px-4 py-3">
                                <img src={log.foto} alt="Foto Bukti" className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                              </td>
                              <td className="px-4 py-3">
                                {log.keterangan === "-" ? (
                                  <span className="text-slate-400">-</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">{log.keterangan}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{log.tanggalLog}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Grafik Statistik Keterlambatan */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Statistik Keterlambatan</CardTitle>
              <CardDescription>Total keterlambatan per musyrif.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_STATISTIK_KETERLAMBATAN} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="nama" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg)', color: 'var(--tooltip-color)' }}
                  />
                  <Bar dataKey="terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Keterlambatan" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Live Monitoring Foto */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <CardTitle>Live Monitoring</CardTitle>
              </div>
              <CardDescription>Foto bukti terbaru yang diunggah.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_LIVE_MONITORING.map((item) => (
                  <div key={item.id} className="relative rounded-xl overflow-hidden group">
                    <img src={item.foto} alt={item.aktifitas} className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-sm shadow-sm">{item.nama}</p>
                          <p className="text-white/80 text-xs">{item.aktifitas}</p>
                        </div>
                        <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-md">
                          {item.waktu}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-xl">Buat Absen Aktivitas</DialogTitle>
            <DialogDescription>
              Laporkan aktivitas Anda hari ini. Waktu saat ini: <span className="font-semibold text-primary">{format(currentDateTime, "dd MMMM yyyy HH:mm:ss", { locale: localeId })}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Musyrif</Label>
                <Input value={musyrifName} disabled className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium" />
              </div>

              <div className="space-y-2">
                <Label>Aktivitas <span className="text-red-500">*</span></Label>
                <Select value={selectedAktivitas} onValueChange={handleAktivitasChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Aktivitas" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(SCHEDULES).map((akt) => (
                      <SelectItem key={akt} value={akt}>{akt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAktivitas && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Label>Checklist Aktivitas <span className="text-red-500">*</span></Label>
                  <div className="space-y-2 mt-2">
                    {CHECKLIST_ITEMS[selectedAktivitas].map((item) => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checkedItems[item] || false}
                          onChange={() => handleCheckboxChange(item)}
                          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Foto Bukti <span className="text-red-500">*</span></Label>
                {fotoBukti ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 group">
                    <img src={fotoBukti} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" className="text-white border-white bg-transparent hover:bg-white/20" onClick={() => setFotoBukti(null)}>
                        Ubah Foto
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Buka Kamera</span> atau Upload Foto</p>
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              {showKeterangan && (
                <div className="space-y-2 mt-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 animate-in fade-in zoom-in-95">
                  <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                    <AlertCircle className="w-4 h-4" /> Keterangan Terlambat <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Anda melaporkan aktivitas melewati batas waktu 20 menit dari jadwal. Harap berikan alasan yang valid.</p>
                  <Textarea
                    placeholder="Contoh: Menangani santri sakit di kamar..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="resize-none bg-white dark:bg-slate-950"
                    rows={3}
                  />
                </div>
              )}
            </div>

          </div>
          <DialogFooter className="p-6 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">Simpan Absen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
