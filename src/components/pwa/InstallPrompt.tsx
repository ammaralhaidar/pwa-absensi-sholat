"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Already installed, don't show anything

    // Check if dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(isiOS);

    if (isiOS) {
      // On iOS, show manual instruction after a short delay
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-4 shadow-lg shadow-primary/20 text-white relative animate-in slide-in-from-top-4 duration-500">
      <button 
        onClick={handleDismiss} 
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>

      {isIOS ? (
        // iOS Instructions
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Share className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Install Aplikasi</p>
            <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
              Tekan tombol <strong>Share</strong> (□↑) di Safari, lalu pilih <strong>&quot;Add to Home Screen&quot;</strong> untuk menginstal aplikasi ini.
            </p>
          </div>
        </div>
      ) : (
        // Android / Chrome
        <div className="flex items-center gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Install Aplikasi</p>
            <p className="text-xs text-white/80 mt-0.5">Pasang di beranda untuk akses cepat tanpa browser.</p>
          </div>
          <button 
            onClick={handleInstall}
            className="shrink-0 px-4 py-2 bg-white text-primary font-bold text-xs rounded-xl hover:bg-white/90 transition-colors shadow-md"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
}
