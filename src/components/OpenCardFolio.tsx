import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { RotateCcw } from "lucide-react";
import type { CardConfig } from "../types/card";
import { LetterPaper } from "./LetterPaper";

gsap.registerPlugin(useGSAP);

interface OpenCardFolioProps {
  config: CardConfig;
  onRestart: () => void;
}

export function OpenCardFolio({ config, onRestart }: OpenCardFolioProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const tl = gsap.timeline();
      tl.from(".folio-letter-finale", {
        y: 28,
        scale: 0.985,
        opacity: 0,
        duration: 0.95,
        ease: "power3.out",
      }).from(
        ".folio-restart-footer",
        {
          y: 10,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        0.55
      );
    },
    { scope: containerRef }
  );

  return (
    <main
      ref={containerRef}
      className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[700px] flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
    >
      {/* Centered Handwritten Letter Finale Only */}
      <section className="folio-letter-finale w-full min-w-0">
        <LetterPaper config={config} />
      </section>

      {/* Single Icon-Only Restart Button at Bottom */}
      <footer className="folio-restart-footer mt-8 flex justify-center">
        <button
          type="button"
          onClick={onRestart}
          aria-label="Xem lại từ đầu"
          title="Xem lại từ đầu"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)] text-[var(--text-cream)] hover:scale-105 hover:border-[var(--gold-champagne)] hover:bg-[var(--bg-velvet-soft)] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
