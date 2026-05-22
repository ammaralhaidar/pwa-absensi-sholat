"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from "date-fns";
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
    try {
      let startDate: Date;
      let endDate: Date;

      if (exportType === "hari_ini") {
        startDate = new Date();
        endDate = new Date();
      } else if (exportType === "minggu_ini") {
        endDate = new Date();
        startDate = subDays(endDate, 6);
      } else if (exportType === "bulan_ini") {
        const today = new Date();
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      } else if (exportType === "kustom") {
        if (!customDateRange?.from || !customDateRange?.to) {
          alert("Silakan pilih rentang tanggal terlebih dahulu!");
          return;
        }
        startDate = customDateRange.from;
        endDate = customDateRange.to;
      } else {
        return;
      }

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      const allDates = eachDayOfInterval({ start: startDate, end: endDate });

      const [santriRes, sesiRes] = await Promise.all([
        supabase.from("data_santri").select("id, nama_santri, kelas").order("nama_santri"),
        supabase.from("sesi_sholat").select("id, nama_sesi").order("jam_mulai")
      ]);

      let allLogData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: logPage, error: logError } = await supabase
          .from("log_absensi")
          .select("santri_id, sesi_id, tanggal, status, keterangan")
          .gte("tanggal", startDateStr)
          .lte("tanggal", endDateStr)
          .order("tanggal", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (logError) throw logError;
        
        if (logPage && logPage.length > 0) {
          allLogData = allLogData.concat(logPage);
          page++;
          hasMore = logPage.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const logRes = { data: allLogData, error: null };

      if (!santriRes.data || !sesiRes.data || !logRes.data) {
        alert("Gagal mengambil data dari server!");
        return;
      }

      console.log('=== DEBUGGING EXPORT ===');
      console.log('Date range:', startDateStr, 'to', endDateStr);
      console.log('Total records fetched:', logRes.data.length);
      console.log('Sample records (first 3):', logRes.data.slice(0, 3));
      console.log('All dates in range:', allDates.map(d => format(d, "yyyy-MM-dd")));

      let santriList = santriRes.data;
      if (exportKelas !== "Semua Kelas") {
        santriList = santriList.filter(s => s.kelas === exportKelas);
      }

      if (santriList.length === 0) {
        alert("Tidak ada data santri untuk kelas yang dipilih!");
        return;
      }

      const sesiMap = new Map();
      sesiRes.data.forEach(s => {
        sesiMap.set(s.id, s.nama_sesi);
      });

      const logMap = new Map();
      logRes.data.forEach(log => {
        const key = `${log.santri_id}_${log.tanggal}_${log.sesi_id}`;
        let statusDisplay = log.status.toLowerCase();
        if (statusDisplay === "udzur") {
          const ket = log.keterangan ? log.keterangan.toLowerCase() : "izin";
          statusDisplay = `udzur-${ket}`;
        }
        logMap.set(key, statusDisplay);
      });

      console.log('LogMap size:', logMap.size);
      console.log('Sample logMap keys (first 5):', Array.from(logMap.keys()).slice(0, 5));
      console.log('Date format from DB:', logRes.data[0]?.tanggal, 'Type:', typeof logRes.data[0]?.tanggal);

      const dataSheetRows: Record<string, string | number>[] = [];
      const statsSheetRows: Record<string, string | number>[] = [];

      santriList.forEach(santri => {
        const dataRow: Record<string, string> = {
          "Nama": santri.nama_santri,
          "Kelas": santri.kelas,
        };

        let totalSholat = 0;
        let totalHadir = 0;
        let totalGhoib = 0;
        let totalSakit = 0;
        let totalIzin = 0;
        let totalTerlambat = 0;

        allDates.forEach(date => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dateLabel = format(date, "d MMM", { locale: id });

          sesiRes.data.forEach(sesi => {
            const columnName = `${dateLabel} - ${sesi.nama_sesi}`;
            const key = `${santri.id}_${dateStr}_${sesi.id}`;
            const status = logMap.get(key) || "-";

            dataRow[columnName] = status.toUpperCase();

            totalSholat++;

            if (status === "hadir") {
              totalHadir++;
            } else if (status === "terlambat") {
              totalHadir++;
              totalTerlambat++;
            } else if (status === "ghoib") {
              totalGhoib++;
            } else if (status.startsWith("udzur")) {
              if (status.includes("sakit")) {
                totalSakit++;
              } else {
                totalIzin++;
              }
            }
          });
        });

        dataSheetRows.push(dataRow);

        const persentaseKehadiran = totalSholat > 0 ? totalHadir / totalSholat : 0;

        statsSheetRows.push({
          "Nama": santri.nama_santri,
          "Kelas": santri.kelas,
          "Total Sholat": totalSholat,
          "Total Hadir": totalHadir,
          "Total Ghoib": totalGhoib,
          "Total Sakit": totalSakit,
          "Total Izin": totalIzin,
          "Total Terlambat": totalTerlambat,
          "Persentase Kehadiran": persentaseKehadiran,
        });
      });

      const dataWorksheet = XLSX.utils.json_to_sheet(dataSheetRows);
      const statsWorksheet = XLSX.utils.json_to_sheet(statsSheetRows);

      const range = XLSX.utils.decode_range(statsWorksheet['!ref'] || 'A1');
      const persentaseColIndex = 8;
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: persentaseColIndex });
        if (statsWorksheet[cellAddress]) {
          statsWorksheet[cellAddress].t = 'n';
          statsWorksheet[cellAddress].z = '0.00%';
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, "Data Absensi");
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, "Statistik Kehadiran");

      const rangeLabel = exportType === "kustom" 
        ? `${format(startDate, "dd-MMM", { locale: id })}_${format(endDate, "dd-MMM", { locale: id })}`
        : exportType;
      const fileName = `Rekap_Absensi_${exportKelas}_${rangeLabel}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Terjadi kesalahan saat membuat file Excel!");
    }
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
