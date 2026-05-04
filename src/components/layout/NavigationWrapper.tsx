"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Camera, Menu, X, Clock, CalendarDays, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Exclude wrapper for login page
  if (pathname === "/login") {
    return <main className="h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-jakarta">{children}</main>;
  }

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback
      router.push("/login");
    }
  };

  const navItems = [
    { name: "Scanner", href: "/", icon: Camera },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Udzur Manual", href: "/udzur", icon: CalendarDays },
    { name: "Riwayat", href: "/riwayat", icon: Clock },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Tablet) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Alhamra</span>
          </div>
          <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex flex-shrink-0 items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              P
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Pengurus</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Admin Absensi</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary ml-1">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Alhamra</span>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="icon" className="text-red-500 rounded-full w-9 h-9">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative pb-20 md:pb-0">
          {children}
        </div>

        {/* Bottom Navigation for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex justify-around items-center px-1 py-1 overflow-x-auto hide-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center w-16 py-2 px-1 rounded-xl transition-all shrink-0
                    ${isActive ? "text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}
                  `}
                >
                  <div className={`
                    p-1.5 rounded-full mb-1 transition-colors
                    ${isActive ? "bg-primary/10" : "bg-transparent"}
                  `}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-medium leading-none text-center ${isActive ? "font-bold" : ""}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
