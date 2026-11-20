import { Suspense, lazy, useEffect, useState } from "react";
import { AmbientBackdrop } from "./components/AmbientBackdrop";
import { AnniversaryGate } from "./components/AnniversaryGate";
import type { AppStage, CardConfig } from "./types/card";
import { loadCardConfig } from "./utils/cardStorage";
import { audioEngine } from "./utils/audioEngine";

const Topography = lazy(() => import("./components/reactbits/Topography"));
const SealedEnvelope = lazy(() =>
  import("./components/SealedEnvelope").then((m) => ({
    default: m.SealedEnvelope,
  }))
);
const MemoryRevealStage = lazy(() =>
  import("./components/MemoryRevealStage").then((m) => ({
    default: m.MemoryRevealStage,
  }))
);
const OpenCardFolio = lazy(() =>
  import("./components/OpenCardFolio").then((m) => ({
    default: m.OpenCardFolio,
  }))
);

export function App() {
  const [config] = useState<CardConfig>(() => loadCardConfig());
  const [stage, setStage] = useState<AppStage>("gate");
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px), (pointer: coarse)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px), (pointer: coarse)");
    const sync = () => setIsMobileView(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    audioEngine.init(config.audioSrc);
  }, [config.audioSrc]);

  // Persistent gesture unlock for iOS Safari / Android Chrome / in-app browsers
  useEffect(() => {
    const tryUnlock = async () => {
      const ok = await audioEngine.ensurePlaying(0.42, 2200);
      if (ok && audioEngine.hasUnlocked()) {
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", tryUnlock);
      window.removeEventListener("touchend", tryUnlock);
      window.removeEventListener("click", tryUnlock);
      window.removeEventListener("keydown", tryUnlock);
    };

    window.addEventListener("pointerdown", tryUnlock, { passive: true });
    window.addEventListener("touchend", tryUnlock, { passive: true });
    window.addEventListener("click", tryUnlock, { passive: true });
    window.addEventListener("keydown", tryUnlock, { passive: true });
    return cleanup;
  }, []);

  // Preload memories & handwritten letter cleanly during idle time on the gate
  useEffect(() => {
    const urls = [
      ...config.memories.map((m) => m.src),
      ...config.handwrittenPages.map((p) => p.extractedDataUrl || p.rawSrc),
    ];
    const timer = window.setTimeout(() => {
      for (const src of urls) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [config]);

  return (
    <div className="relative min-h-[100dvh] w-full selection:bg-[var(--wax-wine)] selection:text-[var(--text-cream)]">
      <AmbientBackdrop />

      {/* React Bits Topography interactive contour backdrop on initial entry */}
      {stage === "gate" && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-75"
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            <Topography
              color="#c9a46b"
              lineCount={isMobileView ? 14 : 20}
              lineWidth={1.15}
              majorLines={true}
              elevation={0.95}
              detail={isMobileView ? 0.2 : 0.35}
              speed={0.18}
              morph={0.16}
              glow={isMobileView ? 0.24 : 0.48}
              brightness={0.85}
              opacity={0.62}
              fog={0.42}
              mouseInteraction={!isMobileView}
              hoverEffect="lift"
              mouseStrength={0.5}
              clickEffect="pulse"
              intro={true}
              dpr={isMobileView ? 1 : undefined}
            />
          </Suspense>
        </div>
      )}

      {stage === "gate" && (
        <AnniversaryGate
          passcode={config.passcode}
          onUnlock={() => setStage("envelope")}
        />
      )}

      <Suspense fallback={null}>
        {stage === "envelope" && (
          <SealedEnvelope
            anniversaryLabel={config.anniversaryLabel}
            subtitle={config.envelopeSubtitle}
            title={config.title}
            onOpened={() =>
              setStage(config.memories.length > 0 ? "memories" : "folio")
            }
          />
        )}

        {stage === "memories" && (
          <MemoryRevealStage
            memories={config.memories}
            anniversaryLabel={config.anniversaryLabel}
            onComplete={() => setStage("folio")}
          />
        )}

        {stage === "folio" && (
          <OpenCardFolio
            config={config}
            onRestart={() => setStage("envelope")}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
