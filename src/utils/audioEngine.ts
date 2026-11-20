/**
 * Always-on romantic background audio engine.
 * Attempts autoplay silently and retries cleanly across touch/click/key gestures
 * (supporting iOS Safari & Android Chrome autoplay policies). No mute toggle is exposed.
 */
class RomanticAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentSrc = "";
  private fadeFrameId: number | null = null;
  private currentVolume = 0;
  private isUnlocked = false;

  init(src: string): void {
    if (typeof window === "undefined") return;
    if (this.audio && this.currentSrc === src) return;

    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.volume = 0;
    this.audio = el;
    this.currentSrc = src;
    this.currentVolume = 0;
    this.isUnlocked = false;

    void this.ensurePlaying(0.36, 2600);
  }

  hasUnlocked(): boolean {
    return this.isUnlocked && Boolean(this.audio && !this.audio.paused);
  }

  async ensurePlaying(targetVolume = 0.42, fadeMs = 2200): Promise<boolean> {
    if (!this.audio) return false;
    try {
      if (this.audio.paused) {
        await this.audio.play();
      }
      this.isUnlocked = true;
      this.rampVolume(targetVolume, fadeMs);
      return true;
    } catch {
      return false;
    }
  }

  swell(targetVolume = 0.56, fadeMs = 1800): void {
    void this.ensurePlaying(targetVolume, fadeMs);
  }

  private rampVolume(target: number, durationMs: number): void {
    if (!this.audio) return;
    if (this.fadeFrameId !== null) {
      cancelAnimationFrame(this.fadeFrameId);
      this.fadeFrameId = null;
    }

    const startVol = this.currentVolume;
    const clampedTarget = Math.max(0, Math.min(1, target));
    const startTime = performance.now();

    const step = (now: number) => {
      if (!this.audio) return;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / Math.max(1, durationMs));
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      const next = startVol + (clampedTarget - startVol) * eased;
      this.currentVolume = next;
      this.audio.volume = next;

      if (t < 1) {
        this.fadeFrameId = requestAnimationFrame(step);
      } else {
        this.fadeFrameId = null;
      }
    };

    this.fadeFrameId = requestAnimationFrame(step);
  }
}

export const audioEngine = new RomanticAudioEngine();
