import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test the connection by querying the sesi_sholat table
    const { data, error } = await supabase
      .from('sesi_sholat')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      message: "Database connected successfully!",
      data 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: "Failed to connect to database.",
      error: error.message 
    }, { status: 500 });
  }
}
