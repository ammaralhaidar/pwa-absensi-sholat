"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"pengurus" | "musyrif">("pengurus");

  const handleLoginPengurus = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    localStorage.setItem("userRole", "pengurus");
    router.refresh();
    router.push("/");
  };

  const handleLoginMusyrif = async () => {
    const supabase = createClient();

    // 1. Login via Supabase Auth (sama seperti pengurus)
    const { data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data) {
      throw new Error("Email atau password salah.");
    }

    // 2. Verifikasi bahwa user ini terdaftar sebagai Musyrif
    const { data: musyrifProfile, error: profileError } = await supabase
      .from("musyrif")
      .select("id, nama_asli, email, status_aktif")
      .eq("id", data.user.id)
      .single();

    if (profileError || !musyrifProfile) {
      await supabase.auth.signOut();
      throw new Error("Akun ini tidak terdaftar sebagai Musyrif.");
    }

    if (!musyrifProfile.status_aktif) {
      await supabase.auth.signOut();
      throw new Error("Akun Musyrif ini sudah dinonaktifkan. Hubungi admin.");
    }

    // 3. Simpan profil musyrif ke localStorage
    localStorage.setItem("userRole", "musyrif");
    localStorage.setItem("musyrifId", musyrifProfile.id);
    localStorage.setItem("musyrifName", musyrifProfile.nama_asli);
    localStorage.setItem("musyrifEmail", musyrifProfile.email);

    router.push("/musyrif-dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (loginType === "pengurus") {
        await handleLoginPengurus();
      } else {
        await handleLoginMusyrif();
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md border-white/20 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-2">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portal {loginType === "pengurus" ? "Pengurus" : "Musyrif"}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Masuk untuk mengelola {loginType === "pengurus" ? "presensi sholat santri" : "absensi & aktivitas"}.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setLoginType("pengurus")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginType === "pengurus"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                Pengurus
              </button>
              <button
                type="button"
                onClick={() => setLoginType("musyrif")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginType === "musyrif"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                Musyrif
              </button>
            </div>


            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email {loginType === "pengurus" ? "Pengurus" : "Musyrif"}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alhamra.com"
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50"
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-8">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 text-base font-semibold"
            >
              {isLoading ? "Memproses..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Footer Branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} Aplikasi Presensi Al-Hamra. All rights reserved.
      </div>
    </div>
  );
}
