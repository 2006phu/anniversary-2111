import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { CardConfig } from "../types/card";
import { extractHandwritingInk } from "../utils/inkExtractor";

gsap.registerPlugin(useGSAP);

interface LetterPaperProps {
  config: CardConfig;
}

export function LetterPaper({ config }: LetterPaperProps) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const inkRevealRef = useRef<HTMLDivElement | null>(null);

  const [activePageIdx, setActivePageIdx] = useState(0);
  const [extractedUrls, setExtractedUrls] = useState<Record<string, string>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string>("");

  const showHandwriting =
    config.letterMode === "handwriting" || config.letterMode === "hybrid";
  const showTyped =
    config.letterMode === "typed" || config.letterMode === "hybrid";

  const pages = config.handwrittenPages;
  const safePageIdx = Math.min(activePageIdx, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIdx];

  // Keep extracted ink synchronized whenever rawSrc or inkSettings change
  useEffect(() => {
    if (!showHandwriting || !currentPage) return;
    if (currentPage.extractedDataUrl) {
      setExtractedUrls((prev) => ({
        ...prev,
        [currentPage.id]: currentPage.extractedDataUrl!,
      }));
      return;
    }

    let cancelled = false;
    setIsExtracting(true);
    setExtractError("");

    extractHandwritingInk(currentPage.rawSrc, config.inkSettings)
      .then((res) => {
        if (!cancelled) {
          setExtractedUrls((prev) => ({
            ...prev,
            [currentPage.id]: res.dataUrl,
          }));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setExtractError(
            err instanceof Error
              ? err.message
              : "Không thể xử lý ảnh thư viết tay."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    showHandwriting,
    currentPage,
    config.inkSettings.sensitivity,
    config.inkSettings.inkWeight,
    config.inkSettings.removeLines,
    config.inkSettings.inkColor,
    config.inkSettings.rotation,
    config.inkSettings.cropMargin,
  ]);

  const activeInkUrl = currentPage
    ? currentPage.extractedDataUrl || extractedUrls[currentPage.id]
    : undefined;

  // Progressive ink reveal animation when handwritten ink renders or replays
  useGSAP(
    () => {
      const target = inkRevealRef.current;
      if (!target || !activeInkUrl) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        gsap.set(target, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 });
        return;
      }

      gsap.fromTo(
        target,
        { clipPath: "inset(0% 0% 100% 0%)", opacity: 0.92 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          duration: 2.1,
          ease: "power1.inOut",
        }
      );
    },
    {
      scope: sheetRef,
      dependencies: [activeInkUrl, safePageIdx],
      revertOnUpdate: true,
    }
  );

  // Staggered editorial paragraphs for typed mode
  useGSAP(
    () => {
      if (!showTyped) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from(".typed-paragraph", {
        y: 12,
        opacity: 0,
        duration: 0.65,
        stagger: 0.14,
        ease: "power2.out",
      });
    },
    {
      scope: sheetRef,
      dependencies: [config.letterMode, config.typedBody],
      revertOnUpdate: true,
    }
  );

  const paragraphs = config.typedBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article
      ref={sheetRef}
      className="paper-cotton relative rounded-2xl border border-[var(--border-paper)] p-3 text-[var(--ink-charcoal)] shadow-[var(--shadow-card)] sm:p-4"
    >
      {/* Inner double-hairline editorial frame */}
      <div className="rounded-xl border border-[var(--gold-champagne-border)] px-5 py-6 sm:px-8 sm:py-8">
        {/* Letter Header */}
        <header className="border-b border-[var(--border-paper)] pb-4">
          <span className="font-display text-sm font-medium text-[var(--wax-wine)]">
            {config.anniversaryLabel}
          </span>

          <h1 className="font-display mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--ink-charcoal)] sm:text-[2rem]">
            {config.title}
          </h1>
        </header>

        {/* Letter Content Area */}
        <div className="mt-5 space-y-5">
          {showTyped && (
            <div className="space-y-4">
              {config.salutation && (
                <p className="font-display text-xl italic text-[var(--ink-charcoal)]">
                  {config.salutation}
                </p>
              )}
              {paragraphs.map((para, index) => (
                <p
                  key={index}
                  className="typed-paragraph text-[15px] leading-[1.78] text-[var(--ink-charcoal)]/90 sm:text-base"
                >
                  {para}
                </p>
              ))}
            </div>
          )}

          {showTyped && showHandwriting && (
            <div className="flex items-center gap-3 py-1" aria-hidden="true">
              <div className="h-px flex-1 bg-[var(--gold-champagne-border)]" />
              <span className="font-display text-xs italic text-[var(--wax-wine)]">
                Thư viết tay
              </span>
              <div className="h-px flex-1 bg-[var(--gold-champagne-border)]" />
            </div>
          )}

          {showHandwriting && currentPage && (
            <div>
              {pages.length > 1 && (
                <div
                  className="mb-3 flex flex-wrap gap-2"
                  role="tablist"
                  aria-label="Trang thư viết tay"
                >
                  {pages.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === safePageIdx}
                      onClick={() => setActivePageIdx(idx)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                        idx === safePageIdx
                          ? "border-[var(--wax-wine)] bg-[var(--wax-wine)] text-[var(--paper-ivory)]"
                          : "border-[var(--border-paper)] text-[var(--ink-plum-secondary)] hover:border-[var(--wax-wine)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {isExtracting && !activeInkUrl && (
                <div
                  aria-busy="true"
                  className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-paper)] p-6 text-center"
                >
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wax-wine)] border-t-transparent" />
                  <p className="mt-3 text-xs text-[var(--ink-plum-secondary)]">
                    Đang tách nét chữ tay lên nền giấy thiệp…
                  </p>
                </div>
              )}

              {extractError && !activeInkUrl && (
                <div className="rounded-lg border border-[var(--wax-wine)]/30 bg-[var(--wax-wine)]/5 p-4 text-sm text-[var(--wax-wine)]">
                  {extractError}
                </div>
              )}

              {activeInkUrl && (
                <div ref={inkRevealRef} className="relative overflow-hidden">
                  <img
                    src={activeInkUrl}
                    alt={`Bức thư viết tay ${currentPage.label}`}
                    className="mx-auto block max-h-[72dvh] w-full object-contain mix-blend-multiply select-none sm:max-h-[720px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Letter Footer / Signature (for typed & hybrid modes so handwritten signature isn't duplicated) */}
        {showTyped && (config.signOff || config.senderSignature) && (
          <footer className="mt-6 border-t border-[var(--border-paper)] pt-4 text-right">
            {config.signOff && (
              <p className="text-sm text-[var(--ink-plum-secondary)]">
                {config.signOff}
              </p>
            )}
            {config.senderSignature && (
              <p className="font-script mt-1 text-2xl text-[var(--wax-wine)]">
                {config.senderSignature}
              </p>
            )}
          </footer>
        )}
      </div>
    </article>
  );
}
