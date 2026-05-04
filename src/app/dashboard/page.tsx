"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, AlertTriangle, ShieldCheck, Filter, CalendarIcon, Loader2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type SantriStat = {
  id: string;
  name: string;
  kelas: string;
  count?: number;
  score?: string;
};

export default function Dashboard() {
  const [filterMode, setFilterMode] = useState("hari_ini");
  const [date, setDate] = useState<Date>(new Date());
  
  const [totalSantri, setTotalSantri] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState("0%");
  const [totalGhoibToday, setTotalGhoibToday] = useState(0);
  
  const [attendanceData, setAttendanceData] = useState<{ session: string; hadir: number; total: number }[]>([]);
  const [topLate, setTopLate] = useState<SantriStat[]>([]);
  const [topGhoib, setTopGhoib] = useState<SantriStat[]>([]);
  const [topTeladan, setTopTeladan] = useState<SantriStat[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, [date, filterMode]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // 1. Get base master data
      const { data: santriData } = await supabase.from('data_santri').select('id, nama_santri, kelas');
      const { data: sesiData } = await supabase.from('sesi_sholat').select('id, nama_sesi').order('jam_mulai');
      
      const tSantri = santriData?.length || 0;
      setTotalSantri(tSantri);

      // 2. Determine date range based on filter
      let startDateStr = format(date, "yyyy-MM-dd");
      let endDateStr = format(date, "yyyy-MM-dd");

      if (filterMode === "bulan_ini") {
        startDateStr = format(startOfMonth(date), "yyyy-MM-dd");
        endDateStr = format(endOfMonth(date), "yyyy-MM-dd");
      }

      // 3. Fetch logs
      let logQuery = supabase.from('log_absensi').select('*');
      if (startDateStr === endDateStr) {
        logQuery = logQuery.eq('tanggal', startDateStr);
      } else {
        logQuery = logQuery.gte('tanggal', startDateStr).lte('tanggal', endDateStr);
      }

      const { data: logData } = await logQuery;

      if (!logData || !santriData || !sesiData) {
        setIsLoading(false);
        return;
      }

      // Process Charts for specific date only (even if month is selected, we show chart for 'date' selected)
      // Actually, if month is selected, we could average it, but let's just show total for simplicity or default to selected date.
      // Let's filter logData for the exact 'date' for the bar chart.
      const exactDateStr = format(date, "yyyy-MM-dd");
      const logsToday = logData.filter(l => l.tanggal === exactDateStr);

      const chartData = sesiData.map(sesi => {
        const hadirCount = logsToday.filter(l => l.sesi_id === sesi.id && (l.status === 'Hadir' || l.status === 'Terlambat')).length;
        return {
          session: sesi.nama_sesi,
          hadir: hadirCount,
          total: tSantri
        };
      });
      setAttendanceData(chartData);

      // Total Ghoib Today
      const ghoibTodayCount = logsToday.filter(l => l.status === 'Ghoib').length;
      setTotalGhoibToday(ghoibTodayCount);

      // Average Attendance in selected period
      const totalPossibleHadir = tSantri * sesiData.length * (filterMode === 'bulan_ini' ? 30 : 1); // rough estimate
      const actualHadir = logData.filter(l => l.status === 'Hadir' || l.status === 'Terlambat').length;
      const avg = totalPossibleHadir > 0 ? ((actualHadir / totalPossibleHadir) * 100).toFixed(1) : "0";
      setAvgAttendance(`${avg}%`);

      // Leaderboards
      const lateMap = new Map<string, number>();
      const ghoibMap = new Map<string, number>();
      const hadirMap = new Map<string, number>();

      logData.forEach(l => {
        if (l.status === 'Terlambat') lateMap.set(l.santri_id, (lateMap.get(l.santri_id) || 0) + 1);
        if (l.status === 'Ghoib') ghoibMap.set(l.santri_id, (ghoibMap.get(l.santri_id) || 0) + 1);
        if (l.status === 'Hadir') hadirMap.set(l.santri_id, (hadirMap.get(l.santri_id) || 0) + 1);
      });

      const getTop5 = (map: Map<string, number>, formatFunc: (s: any, count: number) => SantriStat) => {
        return Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => {
            const s = santriData.find(x => x.id === id);
            return s ? formatFunc(s, count) : null;
          })
          .filter(Boolean) as SantriStat[];
      };

      setTopLate(getTop5(lateMap, (s, count) => ({ id: s.id, name: s.nama_santri, kelas: s.kelas, count })));
      setTopGhoib(getTop5(ghoibMap, (s, count) => ({ id: s.id, name: s.nama_santri, kelas: s.kelas, count })));
      
      // Teladan (Most Hadir)
      setTopTeladan(getTop5(hadirMap, (s, count) => ({ id: s.id, name: s.nama_santri, kelas: s.kelas, score: `${count}x Tepat Waktu` })).slice(0, 3));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 space-y-8 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-slate-500">Menganalisa data...</p>
          </div>
        </div>
      )}

      {/* Page Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Analitik</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan data presensi sholat seluruh santri</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterMode} onValueChange={(val) => val && setFilterMode(val)}>
            <SelectTrigger className="w-[180px] font-medium bg-white dark:bg-slate-900 z-10 relative">
              <Filter className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Mode Filter" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="hari_ini">Satu Hari Spesifik</SelectItem>
              <SelectItem value="bulan_ini">Satu Bulan Spesifik</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-[240px] justify-start text-left font-medium bg-white dark:bg-slate-900 z-10 relative",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? format(date, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-primary to-blue-700 text-white relative z-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-white/80">Total Santri Aktif</CardTitle>
            <Users className="w-5 h-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSantri}</div>
            <p className="text-xs text-white/60 mt-1">Sesuai data master aktif</p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Rata-rata Kehadiran ({filterMode === 'bulan_ini' ? 'Bulan Ini' : 'Hari Ini'})</CardTitle>
            <UserCheck className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{avgAttendance}</div>
            <p className="text-xs text-green-500 font-medium mt-1">Dari total wajib absen</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Ghoib (Hari Ini)</CardTitle>
            <UserX className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalGhoibToday}</div>
            <p className="text-xs text-slate-500 mt-1">Tercatat pada tanggal yang dipilih</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4 border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
          <CardHeader>
            <CardTitle>Kehadiran per Sesi Sholat (Hari Ini)</CardTitle>
            <CardDescription>Grafik jumlah santri hadir pada setiap sesi sholat di tanggal yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={attendanceData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="session" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hadir" fill="#164d7f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Teladan List */}
        <Card className="lg:col-span-3 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative z-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <CardTitle>Santri Paling Rajin</CardTitle>
            </div>
            <CardDescription>Santri dengan catatan "Tepat Waktu" terbanyak {filterMode === 'bulan_ini' ? 'di bulan ini' : 'hari ini'}.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {topTeladan.length > 0 ? topTeladan.map((santri) => (
              <div key={santri.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    {santri.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[150px]">{santri.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kelas {santri.kelas}</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{santri.score}</div>
              </div>
            )) : (
              <div className="text-center py-8 text-sm text-slate-500">Belum ada data cukup</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sering Terlambat */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <CardTitle>Paling Sering Terlambat</CardTitle>
            </div>
            <CardDescription>Data santri yang sering terlambat {filterMode === 'bulan_ini' ? 'di bulan ini' : 'hari ini'}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topLate.length > 0 ? topLate.map((santri, index) => (
                <div key={santri.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-4">{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{santri.name}</p>
                      <p className="text-xs text-slate-500">Kelas {santri.kelas}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md">
                    {santri.count}x Telat
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-sm text-slate-500">Tidak ada santri terlambat</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sering Ghoib */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <CardTitle>Paling Sering Ghoib</CardTitle>
            </div>
            <CardDescription>Data santri tanpa keterangan (ghoib) terbanyak {filterMode === 'bulan_ini' ? 'di bulan ini' : 'hari ini'}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topGhoib.length > 0 ? topGhoib.map((santri, index) => (
                <div key={santri.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-4">{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{santri.name}</p>
                      <p className="text-xs text-slate-500">Kelas {santri.kelas}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-md">
                    {santri.count}x Ghoib
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-sm text-slate-500">Tidak ada santri ghoib</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
