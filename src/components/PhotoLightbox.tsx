import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MemoryPhoto } from "../types/card";

interface PhotoLightboxProps {
  memories: MemoryPhoto[];
  index: number | null;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

export function PhotoLightbox({
  memories,
  index,
  onClose,
  onChangeIndex,
}: PhotoLightboxProps) {
  useEffect(() => {
    if (index === null || memories.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        onChangeIndex((index + 1) % memories.length);
      } else if (e.key === "ArrowLeft") {
        onChangeIndex((index - 1 + memories.length) % memories.length);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, memories.length, onChangeIndex, onClose]);

  if (index === null || memories.length === 0) return null;

  const safeIdx = ((index % memories.length) + memories.length) % memories.length;
  const photo = memories[safeIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh kỷ niệm phóng lớn"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-velvet)]/92 p-4 backdrop-blur-md sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-[780px] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem ảnh"
          className="absolute -top-2 right-0 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet-elevated)] text-[var(--text-cream)] hover:border-[var(--gold-champagne)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="paper-cotton relative w-full max-w-[520px] rounded-xl border border-[var(--border-paper)] p-3 pb-5 shadow-[var(--shadow-card)] sm:p-4 sm:pb-6">
          <div className="overflow-hidden rounded-md bg-[var(--bg-velvet-soft)]">
            <img
              src={photo.src}
              alt={photo.caption || `Ảnh kỷ niệm ${safeIdx + 1}`}
              className="max-h-[66dvh] w-full object-contain"
            />
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-4 px-1 text-[var(--ink-charcoal)]">
            <p className="font-display text-lg leading-snug sm:text-xl">
              {photo.caption}
            </p>
            {photo.date && (
              <span className="shrink-0 text-xs text-[var(--ink-plum-secondary)]">
                {photo.date}
              </span>
            )}
          </div>
        </div>

        {memories.length > 1 && (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                onChangeIndex((safeIdx - 1 + memories.length) % memories.length)
              }
              aria-label="Ảnh trước"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet-elevated)] text-[var(--text-cream)] hover:border-[var(--gold-champagne)]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-[var(--text-cream-muted)]">
              {safeIdx + 1} / {memories.length}
            </span>
            <button
              type="button"
              onClick={() => onChangeIndex((safeIdx + 1) % memories.length)}
              aria-label="Ảnh tiếp theo"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet-elevated)] text-[var(--text-cream)] hover:border-[var(--gold-champagne)]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
