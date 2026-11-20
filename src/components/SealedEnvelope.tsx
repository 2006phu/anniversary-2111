import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, LockOpen } from "lucide-react";
import HoldButton from "./reactbits/HoldButton";
import { audioEngine } from "../utils/audioEngine";

gsap.registerPlugin(useGSAP);

interface SealedEnvelopeProps {
  anniversaryLabel: string;
  subtitle: string;
  title: string;
  onOpened: () => void;
}

export function SealedEnvelope({
  anniversaryLabel,
  subtitle,
  title,
  onOpened,
}: SealedEnvelopeProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const envelopeWrapRef = useRef<HTMLDivElement | null>(null);
  const envelopeBodyRef = useRef<HTMLDivElement | null>(null);
  const flapRef = useRef<HTMLDivElement | null>(null);
  const sealRef = useRef<HTMLDivElement | null>(null);
  const shimmerRef = useRef<HTMLDivElement | null>(null);
  const letterRef = useRef<HTMLDivElement | null>(null);
  const actionWrapRef = useRef<HTMLDivElement | null>(null);
  const isOpeningRef = useRef(false);

  const [isOpening, setIsOpening] = useState(false);
  const [tapHint, setTapHint] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wrap = envelopeWrapRef.current;
      if (!wrap) return;

      if (!reduced) {
        gsap.from(wrap, {
          y: 22,
          opacity: 0,
          scale: 0.97,
          duration: 0.75,
          ease: "power3.out",
        });

        const rotXTo = gsap.quickTo(wrap, "rotationX", {
          duration: 0.4,
          ease: "power2.out",
        });
        const rotYTo = gsap.quickTo(wrap, "rotationY", {
          duration: 0.4,
          ease: "power2.out",
        });

        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse" || isOpeningRef.current) return;
          const nx = (e.clientX / window.innerWidth - 0.5) * 2;
          const ny = (e.clientY / window.innerHeight - 0.5) * 2;
          rotYTo(nx * 4.5);
          rotXTo(-ny * 3.5);
        };

        const onLeave = () => {
          if (isOpeningRef.current) return;
          rotXTo(0);
          rotYTo(0);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerleave", onLeave);
        return () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerleave", onLeave);
        };
      }
    },
    { scope: stageRef }
  );

  const handleOpen = contextSafe(() => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    setIsOpening(true);
    setTapHint(false);
    void audioEngine.ensurePlaying(0.56, 1600);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onOpened();
      return;
    }

    const tl = gsap.timeline({
      onComplete: onOpened,
    });

    tl.addLabel("sealBreak", 0)
      .to(
        envelopeWrapRef.current,
        { rotationX: 0, rotationY: 0, duration: 0.25, ease: "power2.out" },
        "sealBreak"
      )
      .to(
        actionWrapRef.current,
        { opacity: 0, y: 10, duration: 0.35, ease: "power2.out" },
        "sealBreak"
      )
      .to(
        sealRef.current,
        {
          scale: 1.18,
          opacity: 0,
          duration: 0.36,
          ease: "power2.in",
        },
        "sealBreak"
      )
      .fromTo(
        shimmerRef.current,
        { scale: 0.6, opacity: 0 },
        {
          scale: 2.1,
          opacity: 0.85,
          duration: 0.34,
          ease: "power2.out",
        },
        "sealBreak+=0.08"
      )
      .to(
        shimmerRef.current,
        { opacity: 0, duration: 0.3, ease: "power1.out" },
        "sealBreak+=0.36"
      )
      .addLabel("flapOpen", 0.24)
      .to(
        flapRef.current,
        {
          rotationX: 178,
          duration: 0.68,
          ease: "power2.inOut",
        },
        "flapOpen"
      )
      .set(flapRef.current, { zIndex: 5 }, "flapOpen+=0.36")
      .addLabel("letterExtract", 0.78)
      .to(
        letterRef.current,
        {
          y: -145,
          scale: 1.07,
          duration: 0.7,
          ease: "power3.out",
        },
        "letterExtract"
      )
      .to(
        envelopeBodyRef.current,
        {
          y: 90,
          opacity: 0,
          duration: 0.58,
          ease: "power2.in",
        },
        "letterExtract+=0.14"
      )
      .addLabel("enterStage", 1.38)
      .to(
        letterRef.current,
        {
          y: -185,
          scale: 1.13,
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
        },
        "enterStage"
      );
  });

  return (
    <main
      ref={stageRef}
      className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8"
    >
      <div className="perspective-envelope w-full max-w-[440px]">
        <div
          ref={envelopeWrapRef}
          className="preserve-3d relative mx-auto aspect-[1.42/1] w-full select-none"
        >
          {/* Floating Inner Envelope + Pocket Wrapper */}
          <div
            ref={envelopeBodyRef}
            className="preserve-3d relative h-full w-full rounded-xl shadow-[var(--shadow-envelope)]"
          >
            {/* Back interior burgundy silk liner visible once flap opens */}
            <div className="silk-liner-texture pointer-events-none absolute inset-0 rounded-xl border border-[var(--gold-champagne-border)]" />

            {/* Tucked Archival Cotton Letter Preview */}
            <div
              ref={letterRef}
              className="paper-cotton pointer-events-none absolute inset-x-4 top-3 bottom-3 z-10 flex flex-col items-center justify-between rounded-lg border border-[var(--border-paper)] p-5 text-center shadow-lg will-change-transform sm:p-6"
            >
              <div className="w-full border border-[var(--gold-champagne-border)] px-4 py-4">
                <span className="text-xs tracking-normal text-[var(--ink-plum-secondary)]">
                  {anniversaryLabel}
                </span>
                <p className="font-display mt-1.5 text-lg font-medium text-[var(--ink-charcoal)] sm:text-xl">
                  {title}
                </p>
              </div>
              <span className="font-script text-base text-[var(--wax-wine)]">
                Thư gửi riêng em…
              </span>
            </div>

            {/* Front Folded Envelope Pocket */}
            <svg
              viewBox="0 0 440 310"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full rounded-xl"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pocketLeft" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--paper-envelope)" />
                  <stop offset="100%" stopColor="var(--paper-envelope-shade)" />
                </linearGradient>
                <linearGradient id="pocketRight" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--paper-envelope)" />
                  <stop offset="100%" stopColor="var(--paper-envelope-shade)" />
                </linearGradient>
                <linearGradient id="pocketBottom" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="var(--paper-envelope)" />
                  <stop offset="100%" stopColor="var(--paper-envelope-shade)" />
                </linearGradient>
              </defs>
              <polygon points="0,0 228,162 0,310" fill="url(#pocketLeft)" />
              <polygon points="440,0 212,162 440,310" fill="url(#pocketRight)" />
              <polygon
                points="0,310 220,142 440,310"
                fill="url(#pocketBottom)"
              />
              <polyline
                points="0,310 220,142 440,310"
                fill="none"
                stroke="rgba(124, 36, 52, 0.14)"
                strokeWidth="1.2"
              />
            </svg>

            {/* Recipient subtle engraving on bottom pocket */}
            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 text-center">
              <p className="font-display text-sm italic text-[var(--ink-plum-secondary)] sm:text-base">
                {subtitle}
              </p>
            </div>

            {/* 3D Hinged Top Triangular Flap */}
            <div
              ref={flapRef}
              className="preserve-3d pointer-events-none absolute inset-x-0 top-0 z-30 h-[59%] origin-top will-change-transform"
            >
              <div className="backface-hidden pointer-events-none absolute inset-0">
                <svg
                  viewBox="0 0 440 183"
                  preserveAspectRatio="none"
                  className="h-full w-full drop-shadow-[0_6px_12px_rgba(22,16,18,0.22)]"
                  aria-hidden="true"
                >
                  <polygon
                    points="0,0 440,0 220,178"
                    fill="var(--paper-envelope)"
                  />
                  <polyline
                    points="2,2 220,175 438,2"
                    fill="none"
                    stroke="rgba(201, 164, 107, 0.45)"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>

              <div
                className="backface-hidden pointer-events-none absolute inset-0"
                style={{ transform: "rotateX(180deg)" }}
              >
                <svg
                  viewBox="0 0 440 183"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  aria-hidden="true"
                >
                  <polygon
                    points="0,0 440,0 220,178"
                    fill="var(--silk-liner)"
                  />
                  <polyline
                    points="10,6 220,168 430,6"
                    fill="none"
                    stroke="rgba(201, 164, 107, 0.3)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>

            {/* Champagne Shimmer Burst Behind Seal */}
            <div
              ref={shimmerRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-[54%] left-1/2 z-30 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,190,137,0.75)_0%,transparent_70%)] opacity-0"
            />

            {/* Sculpted Burgundy Wax Seal */}
            <div
              ref={sealRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-[54%] left-1/2 z-40 flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full sm:h-[86px] sm:w-[86px]"
            >
              <span className="absolute inset-0 rounded-full border border-[var(--gold-champagne)]/45" />
              <span className="wax-seal-surface relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[var(--gold-champagne)]/35 sm:h-[74px] sm:w-[74px]">
                <span className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full border border-[var(--gold-champagne)]/45 sm:h-[56px] sm:w-[56px]">
                  <span className="font-display text-sm font-semibold tracking-wide text-[var(--gold-champagne-bright)] sm:text-base">
                    {anniversaryLabel.replace(/\s+/g, "")}
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* React Bits HoldButton: Hold to Open Envelope */}
      <div
        ref={actionWrapRef}
        className="mt-8 flex flex-col items-center gap-3"
        onPointerDown={() => {
          setTapHint(false);
          void audioEngine.ensurePlaying(0.45, 1800);
        }}
      >
        <HoldButton
          size="md"
          radius={999}
          holdTime={1300}
          releaseTime={240}
          resetAfter={0}
          wave={true}
          waveAmplitude={5}
          glow={true}
          backgroundColor="#2c1e23"
          fillColor="#7c2434"
          textColor="#f4ece2"
          fillTextColor="#fbf7f0"
          icon={<LockOpen className="h-4 w-4" aria-hidden="true" />}
          doneIcon={<Check className="h-4 w-4" aria-hidden="true" />}
          doneLabel="Đang mở thư…"
          disabled={isOpening}
          onHold={handleOpen}
          onTap={() => setTapHint(true)}
          className="border border-[var(--border-gold)]"
        >
          Giữ để mở thư
        </HoldButton>

        <p
          className="min-h-[18px] text-center text-xs text-[var(--text-cream-muted)]"
          aria-live="polite"
        >
          {tapHint ? "Hãy nhấn giữ khoảng 1 giây để mở phong bì nhé" : ""}
        </p>
      </div>
    </main>
  );
}
