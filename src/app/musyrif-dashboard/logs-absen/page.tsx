"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Filter, ArrowLeft, Clock, Camera, FileText, CheckCircle } from "lucide-react";

interface LogAbsen {
  id: number;
  waktu: string;
  namaMusyrif: string;
  aktivitas: string;
  keterangan: string;
  checklist: string[];
  fotoBukti: string;
  tanggalLog: string;
}

const MOCK_LOGS: LogAbsen[] = [
  {
    id: 1,
    waktu: "17/05/2026 05:10:00",
    namaMusyrif: "Ahmad",
    aktivitas: "Membangunkan Subuh",
    keterangan: "-",
    checklist: ["Membangunkan Subuh"],
    fotoBukti: "https://placehold.co/400x300/6366f1/ffffff?text=Subuh+Ahmad",
    tanggalLog: "17/05/2026"
  },
  {
    id: 2,
    waktu: "17/05/2026 05:30:00",
    namaMusyrif: "Budi",
    aktivitas: "Membangunkan Subuh",
    keterangan: "Kesiangan",
    checklist: ["Membangunkan Subuh"],
    fotoBukti: "https://placehold.co/400x300/1e293b/ffffff?text=Subuh+Budi",
    tanggalLog: "17/05/2026"
  },
  {
    id: 3,
    waktu: "17/05/2026 08:00:00",
    namaMusyrif: "Budi",
    aktivitas: "Pengondisian Pagi",
    keterangan: "-",
    checklist: ["Menyiapkan Santri KBM", "Kebersihan Kamar"],
    fotoBukti: "https://placehold.co/400x300/3b82f6/ffffff?text=Pagi+Budi",
    tanggalLog: "17/05/2026"
  },
  {
    id: 4,
    waktu: "17/05/2026 05:00:00",
    namaMusyrif: "Fikri",
    aktivitas: "Membangunkan Subuh",
    keterangan: "-",
    checklist: ["Membangunkan Subuh"],
    fotoBukti: "https://placehold.co/400x300/10b981/ffffff?text=Subuh+Fikri",
    tanggalLog: "17/05/2026"
  },
  {
    id: 5,
    waktu: "17/05/2026 07:45:00",
    namaMusyrif: "Fikri",
    aktivitas: "Pengondisian Pagi",
    keterangan: "-",
    checklist: ["Menyiapkan Santri KBM", "Kebersihan Kamar", "Ngobrol Membangun Kedekatan"],
    fotoBukti: "https://placehold.co/400x300/10b981/ffffff?text=Pagi+Fikri",
    tanggalLog: "17/05/2026"
  }
];

export default function LogsAbsenPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<LogAbsen | null>(null);

  // Filter logs based on search query
  const filteredLogs = MOCK_LOGS.filter((log) =>
    log.namaMusyrif.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.aktivitas.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.waktu.includes(searchQuery)
  );

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogs(newSelected);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-slate-800" asChild>
          <Link href="/musyrif-dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Logs Absen Musyrif</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Daftar lengkap riwayat aktivitas yang dilaporkan.</p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex-1">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Data Log Aktivitas</CardTitle>
              <CardDescription>Menampilkan {filteredLogs.length} dari {MOCK_LOGS.length} log.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari musyrif, aktivitas..."
                  className="pl-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-lg shrink-0 border-slate-200 dark:border-slate-800 hidden md:flex">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/20">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                    checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Waktu</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nama Musyrif</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Aktivitas</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Ket. Terlambat</TableHead>
                <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 data-[state=selected]:bg-primary/5 dark:data-[state=selected]:bg-primary/10">
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                      checked={selectedLogs.has(log.id)}
                      onChange={() => toggleSelectRow(log.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {log.waktu}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{log.namaMusyrif}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.aktivitas}</TableCell>
                  <TableCell>
                    {log.keterangan === "-" ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-500 font-medium whitespace-nowrap">{log.keterangan}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap"
                      onClick={() => setSelectedDetail(log)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada log yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4 shrink-0 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detail Log Aktivitas
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedDetail && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Waktu Absen</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedDetail.waktu}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal Log</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedDetail.tanggalLog}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nama Musyrif</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedDetail.namaMusyrif}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Aktivitas</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedDetail.aktivitas}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Keterangan Terlambat</p>
                  {selectedDetail.keterangan === "-" ? (
                    <p className="text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">-</p>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl font-medium">
                      {selectedDetail.keterangan}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Checklist Aktivitas</p>
                  <ul className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedDetail.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Camera className="w-4 h-4" /> Foto Bukti
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img
                      src={selectedDetail.fotoBukti}
                      alt="Foto Bukti"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-6 pt-0 shrink-0">
            <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border-0" onClick={() => setSelectedDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
