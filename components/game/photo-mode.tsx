"use client";

import { useState, useCallback } from "react";
import { useGameStore } from "@/stores/game-store";

export function PhotoMode() {
  const photoMode = useGameStore((s) => s.photoMode);
  const setPhotoMode = useGameStore((s) => s.setPhotoMode);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const captureScreenshot = useCallback(() => {
    setCapturing(true);
    try {
      const canvas = document.querySelector("canvas");
      if (!canvas) {
        setCapturing(false);
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      setThumbnail(dataUrl);
    } catch {
      // WebGL canvas may have preserveDrawingBuffer=false; best-effort
    } finally {
      setCapturing(false);
    }
  }, []);

  const downloadScreenshot = useCallback(() => {
    if (!thumbnail) return;
    const a = document.createElement("a");
    a.href = thumbnail;
    a.download = `openrace-${Date.now()}.png`;
    a.click();
  }, [thumbnail]);

  const close = useCallback(() => {
    setPhotoMode(false);
    setThumbnail(null);
  }, [setPhotoMode]);

  if (!photoMode) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-950/90 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span>📷</span> Photo Mode
          </h2>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-fog transition hover:bg-white/10 hover:text-white"
            aria-label="Close photo mode"
          >
            ✕
          </button>
        </div>

        <p className="mb-5 text-xs text-fog/80">
          Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-fog">P</kbd> or{" "}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-fog">Esc</kbd> to exit.
          Use in-game camera keys to frame the shot first.
        </p>

        {/* Thumbnail preview */}
        {thumbnail ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt="Screenshot preview"
              className="w-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/3 text-sm text-fog">
            Screenshot preview will appear here
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={captureScreenshot}
            disabled={capturing}
            className="flex-1 rounded-xl bg-accent-bright/90 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright active:scale-95 disabled:opacity-60"
          >
            {capturing ? "Capturing…" : "📸 Take Screenshot"}
          </button>
          {thumbnail && (
            <button
              onClick={downloadScreenshot}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              ⬇ Download
            </button>
          )}
        </div>

        {!thumbnail && (
          <p className="mt-3 text-center text-[11px] text-fog/50">
            Note: WebGL canvas requires{" "}
            <code className="font-mono">preserveDrawingBuffer</code>. If the preview is blank,
            the renderer may not support readback.
          </p>
        )}
      </div>
    </div>
  );
}
