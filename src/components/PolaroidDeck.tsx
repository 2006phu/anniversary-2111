import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronRight, Maximize2 } from "lucide-react";
import type { MemoryPhoto } from "../types/card";

gsap.registerPlugin(useGSAP);

interface PolaroidDeckProps {
  memories: MemoryPhoto[];
  onOpenLightbox: (index: number) => void;
}

const CARD_OFFSETS = [
  { rotate: -1.4, x: 0, y: 0, scale: 1 },
  { rotate: 2.8, x: 10, y: 6, scale: 0.96 },
  { rotate: -3.2, x: -9, y: 12, scale: 0.92 },
];

export function PolaroidDeck({ memories, onOpenLightbox }: PolaroidDeckProps) {
  const deckRef = useRef<HTMLDivElement | null>(null);
  const topCardRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const { contextSafe } = useGSAP({ scope: deckRef });

  if (memories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)]/60 p-8 text-center">
        <p className="font-display text-lg text-[var(--text-cream)]">
          Chưa có ảnh kỷ niệm nào
        </p>
        <p className="mt-1 text-xs text-[var(--text-cream-muted)]">
          Mở Studio bên dưới để thêm những khoảnh khắc của hai bạn.
        </p>
      </div>
    );
  }

  const safeActive = activeIndex % memories.length;

  const advancePhoto = contextSafe((targetIndex?: number) => {
    if (memories.length <= 1 || isAnimating) return;

    const nextIdx =
      typeof targetIndex === "number"
        ? targetIndex % memories.length
        : (safeActive + 1) % memories.length;

    if (nextIdx === safeActive) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !topCardRef.current) {
      setActiveIndex(nextIdx);
      return;
    }

    setIsAnimating(true);
    gsap.to(topCardRef.current, {
      x: 72,
      y: -18,
      rotation: 8,
      opacity: 0,
      duration: 0.34,
      ease: "power2.in",
      onComplete: () => {
        setActiveIndex(nextIdx);
        setIsAnimating(false);
        if (topCardRef.current) {
          gsap.fromTo(
            topCardRef.current,
            { x: -18, y: 8, rotation: -3.5, opacity: 0.5 },
            {
              x: 0,
              y: 0,
              rotation: CARD_OFFSETS[0].rotate,
              opacity: 1,
              duration: 0.38,
              ease: "power3.out",
            }
          );
        }
      },
    });
  });

  // Render up to 3 stacked cards back-to-front
  const visibleLayers = Math.min(3, memories.length);
  const stackIndices = Array.from(
    { length: visibleLayers },
    (_, layerOffset) => ({
      layerOffset,
      photoIndex: (safeActive + layerOffset) % memories.length,
    })
  ).reverse();

  return (
    <aside ref={deckRef} className="flex flex-col items-center">
      <div className="mb-3 flex w-full max-w-[360px] items-center justify-between text-xs text-[var(--text-cream-muted)]">
        <span className="font-display text-base italic text-[var(--gold-champagne)]">
          Khung hình kỷ niệm
        </span>
        <span>
          {safeActive + 1} / {memories.length}
        </span>
      </div>

      {/* Stacked Polaroid Deck */}
      <div className="relative mx-auto aspect-[3/4.15] w-full max-w-[350px]">
        {stackIndices.map(({ layerOffset, photoIndex }) => {
          const item = memories[photoIndex];
          const isFront = layerOffset === 0;
          const pose = CARD_OFFSETS[layerOffset];

          return (
            <div
              key={`${item.id}-${layerOffset}`}
              ref={isFront ? topCardRef : undefined}
              style={{
                zIndex: 10 - layerOffset,
                transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale})`,
              }}
              className={`paper-cotton absolute inset-0 flex flex-col rounded-xl border border-[var(--border-paper)] p-3 pb-4 shadow-[var(--shadow-polaroid)] will-change-transform sm:p-3.5 sm:pb-5 ${
                isFront ? "cursor-pointer" : "pointer-events-none"
              }`}
              onClick={
                isFront
                  ? () => {
                      if (memories.length > 1) {
                        advancePhoto();
                      } else {
                        onOpenLightbox(photoIndex);
                      }
                    }
                  : undefined
              }
            >
              {/* Translucent archival masking tape accent */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-2 rounded-xs border border-[var(--gold-champagne)]/25 bg-[var(--paper-envelope)]/80 shadow-xs"
              />

              {/* Photo Slot */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-[var(--bg-velvet-soft)]">
                <img
                  src={item.src}
                  alt={item.caption || `Ảnh kỷ niệm ${photoIndex + 1}`}
                  className="h-full w-full object-cover select-none"
                  loading="eager"
                />

                {isFront && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(photoIndex);
                    }}
                    aria-label="Phóng lớn ảnh kỷ niệm"
                    className="absolute right-2.5 bottom-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/75 text-[var(--text-cream)] backdrop-blur-xs hover:border-[var(--gold-champagne)] hover:bg-[var(--bg-velvet)]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Caption & Date on Polaroid margin */}
              <div className="mt-3 flex flex-1 flex-col justify-between gap-1 px-1">
                <p className="font-display line-clamp-2 text-base leading-snug text-[var(--ink-charcoal)] sm:text-lg">
                  {item.caption}
                </p>
                {item.date && (
                  <span className="text-right text-xs text-[var(--ink-plum-secondary)]">
                    {item.date}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls & Filmstrip Switcher */}
      <div className="mt-6 flex w-full max-w-[350px] items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5 overflow-x-auto py-1"
          role="tablist"
          aria-label="Chọn ảnh kỷ niệm"
        >
          {memories.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={idx === safeActive}
              aria-label={`Xem ảnh ${idx + 1}`}
              onClick={() => advancePhoto(idx)}
              className={`h-9 w-9 cursor-pointer overflow-hidden rounded-md border p-0.5 ${
                idx === safeActive
                  ? "border-[var(--gold-champagne)] opacity-100"
                  : "border-[var(--border-subtle)] opacity-55 hover:opacity-90"
              }`}
            >
              <img
                src={m.src}
                alt=""
                className="h-full w-full rounded-[3px] object-cover"
              />
            </button>
          ))}
        </div>

        {memories.length > 1 && (
          <button
            type="button"
            onClick={() => advancePhoto()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)] px-3.5 py-1.5 text-xs text-[var(--text-cream)] hover:border-[var(--gold-champagne)] hover:bg-[var(--bg-velvet-soft)]"
          >
            <span>Ảnh tiếp</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}
