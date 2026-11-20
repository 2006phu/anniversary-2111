import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Delete } from "lucide-react";
import CodeSlots from "./reactbits/CodeSlots";
import { audioEngine } from "../utils/audioEngine";

gsap.registerPlugin(useGSAP);

interface AnniversaryGateProps {
  passcode: string;
  onUnlock: () => void;
}

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function AnniversaryGate({ passcode, onUnlock }: AnniversaryGateProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const slotsWrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isCheckingRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [isCoarsePointer] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from(cardRef.current, {
        y: 22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  const playWrongShake = contextSafe(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !slotsWrapRef.current) return;

    gsap.fromTo(
      slotsWrapRef.current,
      { x: 0 },
      {
        x: 9,
        duration: 0.07,
        repeat: 5,
        yoyo: true,
        ease: "power1.inOut",
        clearProps: "x",
      }
    );
  });

  const playUnlockDissolve = contextSafe((done: () => void) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !cardRef.current) {
      done();
      return;
    }

    gsap.to(cardRef.current, {
      y: -18,
      scale: 0.97,
      opacity: 0,
      duration: 0.65,
      ease: "power2.inOut",
      onComplete: done,
    });
  });

  const handleComplete = useCallback(
    (entered: string) => {
      if (isCheckingRef.current || entered.length !== 4) return;
      isCheckingRef.current = true;
      setIsLockedOut(true);

      if (entered === passcode) {
        setErrorMsg("");
        setStatus("success");
        audioEngine.swell(0.56, 1800);
        const id = window.setTimeout(() => {
          playUnlockDissolve(onUnlock);
        }, 760);
        timersRef.current.push(id);
      } else {
        setStatus("error");
        setErrorMsg("Chưa phải ngày này rồi… thử nhớ lại ngày đặc biệt nhé.");
        playWrongShake();
        const id = window.setTimeout(() => {
          setCode("");
          setStatus("idle");
          setIsLockedOut(false);
          isCheckingRef.current = false;
        }, 680);
        timersRef.current.push(id);
      }
    },
    [onUnlock, passcode, playUnlockDissolve, playWrongShake]
  );

  const handleCodeChange = useCallback(
    (next: string) => {
      if (isCheckingRef.current) return;
      if (next.length > 0) {
        void audioEngine.ensurePlaying(0.38, 2200);
        setErrorMsg("");
      }
      setCode(next.slice(0, 4));
    },
    []
  );

  const pushDigit = useCallback(
    (num: string) => {
      if (isCheckingRef.current) return;
      void audioEngine.ensurePlaying(0.38, 2200);
      setErrorMsg("");
      setCode((prev) => {
        if (prev.length >= 4) return prev;
        return prev + num;
      });
    },
    []
  );

  const popDigit = useCallback(() => {
    if (isCheckingRef.current) return;
    setErrorMsg("");
    setCode((prev) => prev.slice(0, -1));
  }, []);

  const clearDigits = useCallback(() => {
    if (isCheckingRef.current) return;
    setErrorMsg("");
    setCode("");
  }, []);

  // Fallback keyboard capture when focus isn't inside CodeSlots' hidden input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        popDigit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearDigits();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearDigits, popDigit, pushDigit]);

  return (
    <main
      ref={containerRef}
      className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 py-6 sm:px-6"
    >
      <div
        ref={cardRef}
        className="w-full max-w-[410px] rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)]/82 px-6 py-7 text-center shadow-[var(--shadow-card)] backdrop-blur-md sm:px-8 sm:py-9"
      >
        {/* Ornamental Crest */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-gold)] bg-[var(--bg-velvet-soft)]/70">
          <svg
            viewBox="0 0 36 36"
            className="h-6 w-6 text-[var(--gold-champagne)]"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="14.5"
              cy="18"
              r="7.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <circle
              cx="21.5"
              cy="18"
              r="7.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M18 8.5L19.2 10.6L18 12.7L16.8 10.6L18 8.5Z"
              fill="currentColor"
              opacity="0.7"
            />
          </svg>
        </div>

        <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-[var(--text-cream)] sm:text-[2.2rem]">
          Dành riêng cho em
        </h1>
        <p className="mt-2 text-sm text-[var(--text-cream-muted)]">
          Nhập ngày kỷ niệm của chúng ta để mở thiệp
        </p>

        {/* React Bits CodeSlots Input */}
        <div ref={slotsWrapRef} className="mt-6 flex justify-center">
          <CodeSlots
            length={4}
            value={code}
            onChange={handleCodeChange}
            onComplete={handleComplete}
            status={status}
            disabled={isLockedOut && status !== "success"}
            autoFocus={!isCoarsePointer}
            accentColor="#c9a46b"
            inkColor="#f4ece2"
            slotColor="#271a1e"
            digitColor="#161012"
            dangerColor="#a13a4e"
            slotSize={48}
            gap={10}
            radius={12}
            ariaLabel="Nhập ngày và tháng kỷ niệm (4 chữ số)"
            className="font-display"
          />
        </div>

        {/* Status / Validation Feedback */}
        <div
          className="mt-3 min-h-[20px] text-xs text-[var(--text-rose-error)]"
          aria-live="polite"
        >
          {errorMsg}
        </div>

        {/* Tactile Numeric Keypad */}
        <div
          className="mx-auto mt-3 grid max-w-[264px] grid-cols-3 gap-2.5 sm:gap-3"
          role="group"
          aria-label="Bàn phím nhập ngày kỷ niệm"
        >
          {KEYPAD_ROWS.flat().map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => pushDigit(num)}
              disabled={isLockedOut}
              aria-label={`Số ${num}`}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/55 font-display text-xl font-medium text-[var(--text-cream)] hover:border-[var(--gold-champagne)] hover:bg-[var(--bg-velvet-soft)] active:scale-95 disabled:opacity-50 sm:h-13"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={clearDigits}
            disabled={isLockedOut || code.length === 0}
            aria-label="Xóa toàn bộ"
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-transparent text-xs text-[var(--text-cream-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-cream)] disabled:opacity-35 sm:h-13"
          >
            Xóa
          </button>

          <button
            type="button"
            onClick={() => pushDigit("0")}
            disabled={isLockedOut}
            aria-label="Số 0"
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/55 font-display text-xl font-medium text-[var(--text-cream)] hover:border-[var(--gold-champagne)] hover:bg-[var(--bg-velvet-soft)] active:scale-95 disabled:opacity-50 sm:h-13"
          >
            0
          </button>

          <button
            type="button"
            onClick={popDigit}
            disabled={isLockedOut || code.length === 0}
            aria-label="Xóa một số"
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-transparent text-[var(--text-cream-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-cream)] disabled:opacity-35 sm:h-13"
          >
            <Delete className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-5 text-xs text-[var(--text-cream-muted)]/75">
          Gợi ý: Ngày / Tháng (4 chữ số, ví dụ 1402)
        </p>
      </div>
    </main>
  );
}
