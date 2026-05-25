import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/musyrif/login
 * Login musyrif menggunakan Supabase Authentication.
 * Body: { email, password }
 *
 * Response sukses: { success: true, data: { user, session, musyrif } }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Login via Supabase Auth (sama seperti pengurus)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { success: false, message: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    // 2. Verifikasi bahwa user ini terdaftar sebagai Musyrif
    const { data: musyrifProfile, error: profileError } = await supabase
      .from('musyrif')
      .select('id, nama_asli, email, status_aktif, created_at, updated_at')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !musyrifProfile) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, message: 'Akun ini tidak terdaftar sebagai Musyrif.' },
        { status: 403 }
      )
    }

    // 3. Cek status aktif
    if (!musyrifProfile.status_aktif) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, message: 'Akun Musyrif ini sudah dinonaktifkan. Hubungi admin.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Selamat datang, ${musyrifProfile.nama_asli}!`,
      data: {
        user: authData.user,
        session: authData.session,
        musyrif: musyrifProfile,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/musyrif/login]', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Kesalahan server.' },
      { status: 500 }
    )
  }
}
