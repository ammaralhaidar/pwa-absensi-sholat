"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => Promise<any>;
}

export default function BarcodeScanner({ onScanSuccess }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "reader-camera";
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Throttle state
  const lastScannedRef = useRef<{ text: string; time: number } | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Initialize audio context on first interaction (required by browsers)
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    
    return () => {
      window.removeEventListener('click', initAudio);
      // Safely cleanup scanner on unmount
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
        try { scanner.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const playBeep = () => {
    if (!audioContextRef.current) return;
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioContextRef.current.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.15);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  const startScanning = async () => {
    setHasCameraError(false);
    setFeedback({ type: null, message: '' });
    isProcessingRef.current = false;
    
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(readerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false,
      });
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          aspectRatio: 1.0, // Or let it be dynamic based on device
          disableFlip: false,
        },
        (decodedText) => {
          // Global Throttle: ignore any scan if currently processing another one
          if (isProcessingRef.current) {
            return;
          }
          
          isProcessingRef.current = true;
          lastScannedRef.current = { text: decodedText, time: Date.now() };
          
          // Set Loading state
          setFeedback({ type: 'loading', message: `Memproses NIS ${decodedText}...` });
          
          // Play Beep
          playBeep();
          
          // Callback to parent and wait for result
          onScanSuccess(decodedText).then((res) => {
             if (res && res.success) {
                setFeedback({ type: 'success', message: `${res.data?.nama} (${res.data?.status})` });
             } else {
                setFeedback({ type: 'error', message: res?.message || "Gagal absen" });
             }
             setTimeout(() => {
                 setFeedback({ type: null, message: '' });
                 isProcessingRef.current = false;
             }, 2500);
          }).catch(() => {
             setFeedback({ type: 'error', message: "Terjadi kesalahan koneksi." });
             setTimeout(() => {
                 setFeedback({ type: null, message: '' });
                 isProcessingRef.current = false;
             }, 2500);
          });
        },
        (errorMessage) => {
          // Ignore general scan failures (empty frames)
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Failed to start scanner", err);
      setHasCameraError(true);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    const scanner = scannerRef.current;
    // Immediately update UI state to prevent double-click issues
    setIsScanning(false);
    setFeedback({ type: null, message: '' });
    
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // Silently ignore - scanner may already be stopped or disposed
      }
      try {
        scanner.clear();
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] bg-slate-900 overflow-hidden relative border-slate-800">
      
      {/* Container for Video Stream */}
      <div 
        id={readerId} 
        className={`w-full h-full min-h-[400px] bg-black ${!isScanning ? 'opacity-0 absolute pointer-events-none' : 'opacity-100 relative'}`}
      />

      {/* Visual Feedback Overlay */}
      {isScanning && feedback.type && (
        <div className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center
          ${feedback.type === 'success' ? 'bg-green-500/20 border-4 border-green-500 animate-pulse' : ''}
          ${feedback.type === 'error' ? 'bg-red-500/20 border-4 border-red-500' : ''}
          ${feedback.type === 'loading' ? 'bg-blue-500/10' : ''}
        `}>
           <div className={`text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 max-w-[90%] text-center
             ${feedback.type === 'success' ? 'bg-green-600' : ''}
             ${feedback.type === 'error' ? 'bg-red-600' : ''}
             ${feedback.type === 'loading' ? 'bg-blue-600 animate-bounce' : ''}
           `}>
             {feedback.type === 'success' && <CheckCircle2 className="w-6 h-6 shrink-0" />}
             {feedback.type === 'error' && <XCircle className="w-6 h-6 shrink-0" />}
             {feedback.type === 'loading' && <RefreshCw className="w-6 h-6 shrink-0 animate-spin" />}
             <span className="truncate">{feedback.message}</span>
           </div>
        </div>
      )}

      {/* Offline / Idle State */}
      {!isScanning && !hasCameraError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 bg-slate-900">
          <div className="w-20 h-20 bg-slate-800/80 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl text-primary">
            <Camera className="w-10 h-10" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Kamera Belum Aktif</h3>
          <p className="text-slate-400 text-sm max-w-[280px]">Tekan tombol di bawah untuk mengaktifkan kamera dan memulai proses pemindaian.</p>
          
          <Button 
            onClick={startScanning}
            size="lg" 
            className="mt-8 relative overflow-hidden group/btn bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-lg shadow-primary/25"
          >
            <span className="relative z-10 font-bold tracking-wide">MULAI SCAN</span>
            <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
          </Button>
        </div>
      )}

      {/* Error State */}
      {!isScanning && hasCameraError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 bg-slate-900">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Akses Kamera Gagal</h3>
          <p className="text-slate-400 text-xs mb-6 max-w-[250px]">
            Pastikan Anda mengizinkan akses kamera pada browser dan menggunakan koneksi HTTPS.
          </p>
          <Button onClick={startScanning} variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Control Bar (When Scanning) */}
      {isScanning && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center">
          <Button 
            onClick={stopScanning}
            variant="destructive" 
            className="rounded-full shadow-lg px-8 font-semibold opacity-90 hover:opacity-100 backdrop-blur-md"
          >
            Hentikan Kamera
          </Button>
        </div>
      )}

      {/* Scanning Target Box Effect (Full Area) */}
      {isScanning && (
         <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
           <div className="w-full h-full border-2 border-primary/30 relative">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />
             {/* Red Laser Line */}
             <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-red-500/80 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)] animate-pulse" />
           </div>
         </div>
      )}
    </div>
  );
}
