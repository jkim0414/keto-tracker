"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X } from "lucide-react";

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stopFn: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[devices.length - 1];
        if (!back || !videoRef.current) {
          setError("No camera available");
          return;
        }
        const controls = await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              cancelled = true;
              controls.stop();
              onDetected(result.getText());
            }
          }
        );
        stopFn = () => controls.stop();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Camera access failed. Check permissions."
        );
      }
    })();

    return () => {
      cancelled = true;
      stopFn?.();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
        aria-label="Close scanner"
      >
        <X size={20} />
      </button>
      <video
        ref={videoRef}
        className="flex-1 w-full object-cover"
        playsInline
        muted
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-40 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
      </div>
      <div className="absolute bottom-10 inset-x-0 text-center text-white/80 text-sm">
        {error ? error : "Center the barcode in the frame"}
      </div>
    </div>
  );
}
