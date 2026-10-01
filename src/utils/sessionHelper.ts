export type SesiSholat = {
  id: string;
  nama_sesi: string;
  jam_mulai: string;
  jam_batas_hadir: string;
  jam_berakhir: string;
  hari_aktif?: number[];
  jadwal_khusus?: Record<string, {
    jam_mulai?: string;
    jam_batas_hadir?: string;
    jam_berakhir?: string;
  }> | null;
};

export const NAMA_HARI = [
  "Ahad",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

/**
 * Memeriksa apakah sesi tertentu aktif pada hari dalam seminggu (0 = Ahad, ..., 6 = Sabtu).
 */
export function isSessionActiveOnDay(sesi: { hari_aktif?: number[] | null }, dayOfWeek: number): boolean {
  if (!sesi.hari_aktif || sesi.hari_aktif.length === 0) return true;
  return sesi.hari_aktif.includes(dayOfWeek);
}

/**
 * Mengambil jam efektif (mulai, batas hadir, berakhir) untuk sesi pada hari tertentu,
 * dengan mempertimbangkan override di jadwal_khusus jika ada.
 */
export function getEffectiveSessionTime(sesi: SesiSholat, dayOfWeek: number) {
  const custom = sesi.jadwal_khusus ? sesi.jadwal_khusus[dayOfWeek.toString()] : null;
  return {
    jam_mulai: custom?.jam_mulai || sesi.jam_mulai,
    jam_batas_hadir: custom?.jam_batas_hadir || sesi.jam_batas_hadir,
    jam_berakhir: custom?.jam_berakhir || sesi.jam_berakhir,
    isCustom: !!(custom && (custom.jam_mulai || custom.jam_batas_hadir || custom.jam_berakhir))
  };
}
