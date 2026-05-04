import { NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { santri_id, sesi_id, keterangan, date_override } = body;

    if (!santri_id || !sesi_id) {
      return NextResponse.json({ success: false, message: "Data tidak lengkap" }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const todayDate = date_override || new Date().toISOString().split('T')[0];

    // Cek apakah sudah ada data untuk sesi dan hari yang sama
    const { data: existingLog } = await supabase
      .from('log_absensi')
      .select('id')
      .eq('santri_id', santri_id)
      .eq('sesi_id', sesi_id)
      .eq('tanggal', todayDate)
      .single();

    if (existingLog) {
       // update saja
       const { error: updateError } = await supabase
         .from('log_absensi')
         .update({ status: 'Udzur', keterangan: keterangan })
         .eq('id', existingLog.id);
         
       if (updateError) throw updateError;
    } else {
       // insert baru
       const { error: insertError } = await supabase
         .from('log_absensi')
         .insert({
           santri_id,
           sesi_id,
           tanggal: todayDate,
           status: 'Udzur',
           keterangan
         });
         
       if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, message: "Data udzur berhasil disimpan" });
  } catch (error: any) {
    console.error("Udzur API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Kesalahan server" }, { status: 500 });
  }
}
