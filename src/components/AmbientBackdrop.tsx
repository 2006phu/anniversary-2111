import { useEffect, useRef } from "react";

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

export function AmbientBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const motes: Mote[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.14,
      vy: -0.08 - Math.random() * 0.18,
      alpha: 0.12 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
    }));

    const tick = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.x += m.vx + Math.sin(t * 0.0005 + m.phase) * 0.08;
        m.y += m.vy;

        if (m.y < -12) {
          m.y = height + 12;
          m.x = Math.random() * width;
        }
        if (m.x < -12) m.x = width + 12;
        if (m.x > width + 12) m.x = -12;

        const pulse = 0.65 + 0.35 * Math.sin(t * 0.0014 + m.phase);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 190, 137, ${(m.alpha * pulse).toFixed(3)})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="velvet-backdrop absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 opacity-85" />
    </div>
  );
}
