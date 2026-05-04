"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import * as XLSX from "xlsx";
import { Calendar as CalendarIcon, Download, Filter, CheckCircle2, XCircle, AlertCircle, HeartPulse, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type SantriRow = {
  id: string;
  name: string;
  kelas: string;
  absensi: Record<string, string>;
};

export default function RiwayatPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedKelas, setSelectedKelas] = useState("Semua Kelas");
  const [kelasList, setKelasList] = useState<string[]>(["Semua Kelas"]);
  const [tableData, setTableData] = useState<SantriRow[]>([]);
  const [sesiColumns, setSesiColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Excel Export State
  const [exportType, setExportType] = useState("hari_ini");
  const [exportKelas, setExportKelas] = useState("Semua Kelas");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [date]);

  const fetchData = async () => {
    setIsLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const [santriRes, sesiRes, logRes] = await Promise.all([
        supabase.from("data_santri").select("id, nama_santri, kelas").order("nama_santri"),
        supabase.from("sesi_sholat").select("id, nama_sesi").order("jam_mulai"),
        supabase.from("log_absensi").select("santri_id, sesi_id, status, keterangan").eq("tanggal", dateStr)
      ]);

      if (santriRes.data && sesiRes.data && logRes.data) {
        // Extract unique classes
        const classes = Array.from(new Set(santriRes.data.map(s => s.kelas))).sort();
        setKelasList(["Semua Kelas", ...classes]);

        // Map sessions
        const sesiMap = new Map();
        const sesiNames: string[] = [];
        sesiRes.data.forEach(s => {
          sesiMap.set(s.id, s.nama_sesi);
          sesiNames.push(s.nama_sesi);
        });
        setSesiColumns(sesiNames);

        // Build Pivot Table
        const logMap = new Map(); // key: santri_id + '_' + sesi_id, value: status (with keterangan if udzur)
        logRes.data.forEach(log => {
          let statusDisplay = log.status.toLowerCase();
          if (statusDisplay === "udzur") {
            // e.g. "udzur-sakit"
            const ket = log.keterangan ? log.keterangan.split(' ')[0].toLowerCase() : "izin";
            statusDisplay = `udzur-${ket}`;
          }
          logMap.set(`${log.santri_id}_${log.sesi_id}`, statusDisplay);
        });

        const rows: SantriRow[] = santriRes.data.map(santri => {
          const absensi: Record<string, string> = {};
          sesiRes.data.forEach(sesi => {
            const status = logMap.get(`${santri.id}_${sesi.id}`);
            absensi[sesi.nama_sesi] = status || "-"; // "-" means no data
          });
          return {
            id: santri.id,
            name: santri.nama_santri,
            kelas: santri.kelas,
            absensi
          };
        });

        setTableData(rows);
      }
    } catch (err) {
      console.error("Failed to fetch riwayat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusIcon = (status: string) => {
    if (status === "hadir") {
      return <div className="flex justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>;
    } else if (status === "terlambat") {
      return <div className="flex justify-center"><AlertCircle className="w-5 h-5 text-amber-500" /></div>;
    } else if (status === "ghoib") {
      return <div className="flex justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>;
    } else if (status.startsWith("udzur")) {
      const parts = status.split("-");
      const reason = parts.length > 1 ? parts[1] : "izin";
      return (
        <div className="flex items-center justify-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold w-max mx-auto">
          <HeartPulse className="w-3.5 h-3.5" />
          <span className="uppercase">{reason}</span>
        </div>
      );
    }
    return <div className="text-center text-slate-300 dark:text-slate-700">-</div>;
  };

  const handleExportExcel = async () => {
    // In a real app, you would fetch data for the selected range (e.g. month).
    // For this prototype, we'll export the currently displayed table.
    const exportData = filteredData.map(item => {
      const row: Record<string, string> = {
        "Nama Santri": item.name,
        "Kelas": item.kelas,
      };
      sesiColumns.forEach(sesi => {
        row[sesi] = item.absensi[sesi].toUpperCase();
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat_Absensi");

    const fileName = `Rekap_Absensi_${exportKelas}_${exportType}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Filter data based on selected class
  const filteredData = selectedKelas === "Semua Kelas" 
    ? tableData 
    : tableData.filter(d => d.kelas === selectedKelas);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="p-4 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat & Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pantau kehadiran santri secara mendetail per kelas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-[240px] justify-start text-left font-medium",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? format(date, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Class Selector */}
          <Select value={selectedKelas} onValueChange={(val) => val && setSelectedKelas(val)}>
            <SelectTrigger className="w-[140px] font-medium">
              <Filter className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              {kelasList.map(k => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Dialog */}
          <Dialog>
            <DialogTrigger
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
              )}
            >
              <Download className="w-4 h-4" />
              Download Excel
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Download Rekapan Absensi</DialogTitle>
                <DialogDescription>
                  Pilih parameter rentang waktu dan kelas untuk men-generate file Excel (.xlsx).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>Rentang Waktu</Label>
                  <Select value={exportType} onValueChange={(val) => val && setExportType(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rentang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hari_ini">Satu Hari Ini</SelectItem>
                      <SelectItem value="minggu_ini">Satu Minggu Terakhir</SelectItem>
                      <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
                      <SelectItem value="kustom">Custom Tanggal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range Picker */}
                {exportType === "kustom" && (
                  <div className="space-y-2">
                    <Label>Pilih Rentang Tanggal</Label>
                    <Popover>
                      <PopoverTrigger
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full justify-start text-left font-normal",
                          !customDateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange?.from ? (
                          customDateRange.to ? (
                            <>
                              {format(customDateRange.from, "LLL dd, y", { locale: id })} -{" "}
                              {format(customDateRange.to, "LLL dd, y", { locale: id })}
                            </>
                          ) : (
                            format(customDateRange.from, "LLL dd, y", { locale: id })
                          )
                        ) : (
                          <span>Pilih rentang tanggal</span>
                        )}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={customDateRange?.from}
                          selected={customDateRange}
                          onSelect={setCustomDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Filter Kelas</Label>
                  <Select value={exportKelas} onValueChange={(val) => val && setExportKelas(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {kelasList.map(k => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Batal</Button>
                <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Download className="w-4 h-4" />
                  Generate .xlsx
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[300px] relative">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-slate-500">Memuat data dari server...</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Nama Santri</th>
                  {sesiColumns.map(sesi => (
                    <th key={sesi} scope="col" className="px-6 py-4 font-bold text-center">{sesi}</th>
                  ))}
                  {sesiColumns.length === 0 && !isLoading && (
                    <th scope="col" className="px-6 py-4 font-bold text-center">Data Sesi Kosong</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((santri) => (
                    <tr key={santri.id} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {santri.name}
                        <span className="block text-xs font-normal text-slate-500 mt-0.5">{santri.kelas}</span>
                      </td>
                      {sesiColumns.map(sesi => (
                        <td key={sesi} className="px-6 py-4">{renderStatusIcon(santri.absensi[sesi])}</td>
                      ))}
                    </tr>
                  ))
                ) : !isLoading && (
                  <tr>
                    <td colSpan={sesiColumns.length + 1} className="px-6 py-12 text-center text-slate-500">
                      Tidak ada data santri untuk kelas <b>{selectedKelas}</b>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 bg-white dark:bg-slate-900 py-3 px-6 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm w-max mx-auto text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Hadir Tepat Waktu</div>
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Terlambat</div>
          <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-blue-500" /> Udzur / Izin</div>
          <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Ghoib / Tanpa Keterangan</div>
          <div className="flex items-center gap-2 font-bold">- Belum Ada Data</div>
        </div>
      </div>
    </div>
  );
}
