import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const MUSYRIF_SELECT = 'id, email, nama_asli, status_aktif, created_at, updated_at'

/**
 * GET /api/musyrif
 * Mengambil semua data musyrif atau satu musyrif berdasarkan id.
 * Query params:
 *   - id (optional): ambil satu musyrif berdasarkan UUID
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const supabase = await createClient()

    if (id) {
      const { data, error } = await supabase
        .from('musyrif')
        .select(MUSYRIF_SELECT)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: false, message: 'Musyrif tidak ditemukan.' }, { status: 404 })
        }
        throw error
      }

      return NextResponse.json({ success: true, data })
    }

    // Ambil semua musyrif, urutkan berdasarkan nama_asli
    const { data, error } = await supabase
      .from('musyrif')
      .select(MUSYRIF_SELECT)
      .order('nama_asli', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[GET /api/musyrif]', error)
    return NextResponse.json({ success: false, message: error.message || 'Kesalahan server.' }, { status: 500 })
  }
}

/**
 * POST /api/musyrif
 * Membuat akun Supabase Auth + profil musyrif baru.
 * Membutuhkan SUPABASE_SERVICE_ROLE_KEY di environment (untuk adminAuthClient).
 * Body: { email, password, nama_asli }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, nama_asli } = body

    if (!email || !password || !nama_asli) {
      return NextResponse.json(
        { success: false, message: 'Field email, password, dan nama_asli wajib diisi.' },
        { status: 400 }
      )
    }

    // Gunakan service role client agar bisa membuat user baru via Admin API
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Buat auth user via Admin API
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // langsung aktif, tidak perlu konfirmasi email
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ success: false, message: 'Email sudah terdaftar.' }, { status: 409 })
      }
      throw authError
    }

    const userId = authData.user.id

    // 2. Insert profil musyrif ke tabel musyrif
    const supabase = await createClient()
    const { data, error: insertError } = await supabase
      .from('musyrif')
      .insert({
        id: userId,   // FK ke auth.users.id
        email,
        nama_asli,
        status_aktif: true,
      })
      .select(MUSYRIF_SELECT)
      .single()

    if (insertError) {
      // Rollback: hapus auth user yang sudah dibuat jika insert profil gagal
      await adminSupabase.auth.admin.deleteUser(userId)
      throw insertError
    }

    return NextResponse.json({ success: true, message: 'Musyrif berhasil ditambahkan.', data }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/musyrif]', error)
    return NextResponse.json({ success: false, message: error.message || 'Kesalahan server.' }, { status: 500 })
  }
}

/**
 * PATCH /api/musyrif
 * Memperbarui profil musyrif.
 * Query params: id (UUID, wajib)
 * Body: { nama_asli?, status_aktif? }
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Parameter id wajib disertakan.' }, { status: 400 })
    }

    const body = await req.json()
    const { nama_asli, status_aktif } = body

    // Bangun payload hanya dari field yang dikirim
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (nama_asli !== undefined) updatePayload.nama_asli = nama_asli
    if (status_aktif !== undefined) updatePayload.status_aktif = status_aktif

    if (Object.keys(updatePayload).length === 1) {
      // Hanya berisi updated_at, artinya tidak ada field yang diperbarui
      return NextResponse.json({ success: false, message: 'Tidak ada field yang diperbarui.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('musyrif')
      .update(updatePayload)
      .eq('id', id)
      .select(MUSYRIF_SELECT)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, message: 'Musyrif tidak ditemukan.' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true, message: 'Data musyrif berhasil diperbarui.', data })
  } catch (error: any) {
    console.error('[PATCH /api/musyrif]', error)
    return NextResponse.json({ success: false, message: error.message || 'Kesalahan server.' }, { status: 500 })
  }
}

/**
 * DELETE /api/musyrif
 * Menghapus profil musyrif dan auth user-nya.
 * Query params: id (UUID, wajib)
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Parameter id wajib disertakan.' }, { status: 400 })
    }

    // Hapus profil musyrif
    const supabase = await createClient()
    const { error: deleteProfileError } = await supabase
      .from('musyrif')
      .delete()
      .eq('id', id)

    if (deleteProfileError) throw deleteProfileError

    // Hapus auth user via Admin API
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(id)
    if (deleteAuthError) throw deleteAuthError

    return NextResponse.json({ success: true, message: 'Musyrif berhasil dihapus.' })
  } catch (error: any) {
    console.error('[DELETE /api/musyrif]', error)
    return NextResponse.json({ success: false, message: error.message || 'Kesalahan server.' }, { status: 500 })
  }
}
