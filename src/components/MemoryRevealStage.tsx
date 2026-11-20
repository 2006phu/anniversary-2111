import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import OrbitImages from "./reactbits/OrbitImages";
import type { MemoryPhoto } from "../types/card";

gsap.registerPlugin(useGSAP);

interface MemoryRevealStageProps {
  memories: MemoryPhoto[];
  anniversaryLabel: string;
  onComplete: () => void;
}

const ZOOM_TILTS = [-1.4, 1.3, -1.0, 1.4, -0.8];

export function MemoryRevealStage({
  memories,
  anniversaryLabel,
  onComplete,
}: MemoryRevealStageProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const orbitLayerRef = useRef<HTMLDivElement | null>(null);
  const zoomCardRef = useRef<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const isExitingRef = useRef(false);

  // -1 = initial OrbitImages showcase; 0..N-1 = sequential zoomed-in spotlight per photo
  const [zoomIndex, setZoomIndex] = useState<number>(-1);

  const orbitImages = useMemo(
    () =>
      memories.map((m, idx) => ({
        src: m.src,
        alt: m.caption || `Ảnh kỷ niệm ${idx + 1}`,
      })),
    [memories]
  );

  // Preload all couple photos on mount
  useEffect(() => {
    for (const mem of memories) {
      const img = new Image();
      img.src = mem.src;
    }
  }, [memories]);

  const { contextSafe } = useGSAP({ scope: stageRef });

  const runFinaleExit = contextSafe(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !stageRef.current) {
      onComplete();
      return;
    }

    gsap.to([zoomCardRef.current, orbitLayerRef.current].filter(Boolean), {
      y: -22,
      scale: 0.94,
      opacity: 0,
      duration: 0.65,
      ease: "power2.inOut",
      onComplete,
    });
  });

  // Phase 1: Initial OrbitImages showcase (~2.4s), then automatically zoom into Photo 1
  useEffect(() => {
    if (memories.length === 0) {
      onComplete();
      return;
    }
    if (zoomIndex !== -1) return;

    const timer = window.setTimeout(() => {
      if (!isExitingRef.current) {
        setZoomIndex(0);
      }
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [memories.length, onComplete, zoomIndex]);

  const isZooming = zoomIndex >= 0 && zoomIndex < memories.length;
  const activeMemory = isZooming ? memories[zoomIndex] : null;

  // Dim & recede OrbitImages smoothly once without flickering between zoomed photos
  useGSAP(
    () => {
      if (!orbitLayerRef.current || !isZooming) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(orbitLayerRef.current, {
        opacity: 0.22,
        scale: 0.93,
        duration: reduced ? 0.01 : 0.65,
        ease: "power2.out",
      });
    },
    { scope: stageRef, dependencies: [isZooming] }
  );

  // Phase 2: Sequential zoom-in spotlight per photo, then auto-transition into the letter
  useGSAP(
    () => {
      if (zoomIndex < 0 || zoomIndex >= memories.length) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const restingTilt = ZOOM_TILTS[zoomIndex % ZOOM_TILTS.length];

      if (reduced) {
        if (zoomCardRef.current) {
          gsap.set(zoomCardRef.current, {
            scale: 1,
            y: 0,
            rotation: restingTilt,
            opacity: 1,
          });
        }
        const timer = window.setTimeout(() => {
          if (zoomIndex < memories.length - 1) {
            setZoomIndex((i) => i + 1);
          } else {
            runFinaleExit();
          }
        }, 2500);
        return () => window.clearTimeout(timer);
      }

      const tl = gsap.timeline({
        onComplete: () => {
          if (isExitingRef.current) return;
          if (zoomIndex < memories.length - 1) {
            setZoomIndex((i) => i + 1);
          } else {
            runFinaleExit();
          }
        },
      });

      tl.fromTo(
        zoomCardRef.current,
        { scale: 0.45, y: 26, rotation: restingTilt * 2.2, opacity: 0 },
        {
          scale: 1,
          y: 0,
          rotation: restingTilt,
          opacity: 1,
          duration: 0.65,
          ease: "power3.out",
        },
        0
      )
        .fromTo(
          captionRef.current,
          { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
          0.2
        )
        .fromTo(
          progressBarRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 2.3, ease: "none" },
          0.42
        );

      if (zoomIndex < memories.length - 1) {
        tl.to(
          zoomCardRef.current,
          {
            scale: 0.86,
            y: -14,
            opacity: 0,
            duration: 0.36,
            ease: "power2.in",
          },
          2.75
        );
      }

      return () => {
        tl.kill();
      };
    },
    {
      scope: stageRef,
      dependencies: [zoomIndex, memories.length],
      revertOnUpdate: true,
    }
  );

  if (memories.length === 0) return null;

  return (
    <main
      ref={stageRef}
      className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[960px] flex-col items-center justify-between overflow-hidden px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* Top Counter */}
      <header className="relative z-30 flex w-full items-center justify-between gap-3 text-xs">
        <span className="font-display text-base font-medium text-[var(--gold-champagne-bright)] sm:text-lg">
          {anniversaryLabel}
        </span>
        <span
          aria-live="polite"
          className="text-xs text-[var(--text-cream-muted)]"
        >
          {isZooming
            ? `${zoomIndex + 1} / ${memories.length}`
            : `${memories.length} khoảnh khắc`}
        </span>
      </header>

      {/* Center Stage: OrbitImages + Zoomed-In Photo Spotlight */}
      <section className="relative my-auto flex w-full flex-1 items-center justify-center py-4">
        {/* React Bits OrbitImages Ring */}
        <div
          ref={orbitLayerRef}
          className="w-full max-w-[820px] will-change-transform"
        >
          <OrbitImages
            images={orbitImages}
            shape="ellipse"
            baseWidth={900}
            radiusX={350}
            radiusY={135}
            rotation={-6}
            duration={22}
            itemSize={126}
            depth={0.55}
            itemRadius={16}
            shadow={0.45}
            showPath={true}
            pathColor="rgba(201, 164, 107, 0.25)"
            pathWidth={1.5}
            hoverScale={1.08}
            draggable={false}
            clickToFront={false}
            intro={true}
            centerContent={
              <div className="pointer-events-none text-center">
                <span className="font-display text-2xl font-medium tracking-wider text-[var(--gold-champagne-bright)] sm:text-3xl">
                  {anniversaryLabel}
                </span>
              </div>
            }
          />
        </div>

        {/* Sequential Zoom-In Spotlight Layer */}
        {activeMemory && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-2">
            <div
              ref={zoomCardRef}
              className="paper-cotton flex w-full max-w-[min(86vw,390px)] flex-col rounded-2xl border border-[var(--border-paper)] p-3 pb-4 shadow-[var(--shadow-card)] will-change-transform sm:p-4 sm:pb-5"
            >
              {/* Archival Masking Tape */}
              <div
                aria-hidden="true"
                className="pointer-events-none mx-auto -mt-5 mb-2 h-5 w-16 -rotate-2 rounded-xs border border-[var(--gold-champagne)]/25 bg-[var(--paper-envelope)]/85 shadow-xs"
              />

              <div className="flex max-h-[54dvh] w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-velvet-soft)]/10">
                <img
                  src={activeMemory.src}
                  alt={activeMemory.caption || `Ảnh kỷ niệm ${zoomIndex + 1}`}
                  className="max-h-[54dvh] w-full rounded-lg object-contain select-none"
                />
              </div>

              <div
                ref={captionRef}
                className="mt-3 flex flex-col justify-between gap-1 px-1"
              >
                <p className="font-display text-center text-base leading-snug text-[var(--ink-charcoal)] sm:text-lg">
                  {activeMemory.caption}
                </p>
              </div>
            </div>

            {/* Hairline Auto-Advance Timer */}
            <div
              aria-hidden="true"
              className="mt-5 h-[2px] w-[min(70vw,240px)] overflow-hidden rounded-full bg-[var(--border-subtle)]"
            >
              <div
                ref={progressBarRef}
                className="h-full w-full origin-left rounded-full bg-[var(--gold-champagne)] will-change-transform"
              />
            </div>
          </div>
        )}
      </section>

      {/* Non-interactive Progress Dots */}
      <div className="relative z-30 flex items-center gap-2 py-2" aria-hidden="true">
        {memories.map((m, idx) => (
          <span
            key={m.id}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
              isZooming && idx === zoomIndex
                ? "w-6 bg-[var(--gold-champagne-bright)]"
                : isZooming && idx < zoomIndex
                ? "w-2.5 bg-[var(--gold-champagne)]/55"
                : "w-2.5 bg-[var(--border-subtle)]"
            }`}
          />
        ))}
      </div>
    </main>
  );
}
