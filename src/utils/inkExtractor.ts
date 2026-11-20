import type { InkColorPreset, InkSettings } from "../types/card";

export interface InkExtractionResult {
  dataUrl: string;
  width: number;
  height: number;
  processingMs: number;
}

const INK_COLOR_MAP: Record<Exclude<InkColorPreset, "original">, [number, number, number]> = {
  velvet: [36, 22, 27],
  wine: [108, 28, 44],
  midnight: [25, 34, 62],
  sepia: [75, 48, 33],
};

const MAX_CACHE_ENTRIES = 16;
const extractionCache = new Map<string, InkExtractionResult>();

function cacheKey(source: string, settings: InkSettings): string {
  const srcHash =
    source.length > 160
      ? `${source.slice(0, 64)}:${source.length}:${source.slice(-48)}`
      : source;
  return `${srcHash}|${settings.sensitivity}|${settings.inkWeight}|${
    settings.removeLines ? 1 : 0
  }|${settings.inkColor}|${settings.rotation}|${settings.cropMargin.toFixed(3)}`;
}

function setCached(key: string, value: InkExtractionResult): void {
  if (extractionCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = extractionCache.keys().next().value;
    if (firstKey) extractionCache.delete(firstKey);
  }
  extractionCache.set(key, value);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể tải ảnh thư tay để tách nét mực."));
    img.src = src;
  });
}

/**
 * Extracts authentic handwriting ink strokes from a photographed paper letter.
 * Uses a 2D Summed-Area Table (Integral Image) for O(1) local illumination estimation
 * and flat-field division to remove camera shadows, uneven paper warmth, and optional
 * notebook guide lines while preserving anti-aliased stroke fidelity.
 */
export async function extractHandwritingInk(
  source: string,
  settings: InkSettings
): Promise<InkExtractionResult> {
  const key = cacheKey(source, settings);
  const cached = extractionCache.get(key);
  if (cached) return cached;

  const t0 = performance.now();
  const img = await loadImage(source);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) {
    throw new Error("Ảnh thư tay không hợp lệ.");
  }

  const margin = Math.max(0, Math.min(0.15, settings.cropMargin));
  const cropX = Math.round(srcW * margin);
  const cropY = Math.round(srcH * margin);
  const cropW = Math.max(32, srcW - cropX * 2);
  const cropH = Math.max(32, srcH - cropY * 2);

  const isRotatedQuarter = settings.rotation === 90 || settings.rotation === 270;
  const rotW = isRotatedQuarter ? cropH : cropW;
  const rotH = isRotatedQuarter ? cropW : cropH;

  const maxEdge = 1500;
  const scale = Math.min(1, maxEdge / Math.max(rotW, rotH));
  const w = Math.max(32, Math.round(rotW * scale));
  const h = Math.max(32, Math.round(rotH * scale));

  const workCanvas = document.createElement("canvas");
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((settings.rotation * Math.PI) / 180);
  const drawW = isRotatedQuarter ? h : w;
  const drawH = isRotatedQuarter ? w : h;
  ctx.drawImage(img, cropX, cropY, cropW, cropH, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const pixelCount = w * h;

  // Luminance buffer + 2D Summed-Area Table (Integral Image)
  const lum = new Float32Array(pixelCount);
  const stride = w + 1;
  const satL = new Float64Array(stride * (h + 1));
  const satR = new Float64Array(stride * (h + 1));
  const satG = new Float64Array(stride * (h + 1));
  const satB = new Float64Array(stride * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSumL = 0;
    let rowSumR = 0;
    let rowSumG = 0;
    let rowSumB = 0;
    const rowOff = y * w;
    const satRow = (y + 1) * stride;
    const satPrevRow = y * stride;

    for (let x = 0; x < w; x++) {
      const idx = (rowOff + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      lum[rowOff + x] = l;

      rowSumL += l;
      rowSumR += r;
      rowSumG += g;
      rowSumB += b;

      satL[satRow + x + 1] = satL[satPrevRow + x + 1] + rowSumL;
      satR[satRow + x + 1] = satR[satPrevRow + x + 1] + rowSumR;
      satG[satRow + x + 1] = satG[satPrevRow + x + 1] + rowSumG;
      satB[satRow + x + 1] = satB[satPrevRow + x + 1] + rowSumB;
    }
  }

  const radius = Math.max(24, Math.round(Math.min(w, h) * 0.045));
  const sensNorm = Math.max(0, Math.min(100, settings.sensitivity)) / 100;
  const weightNorm = Math.max(0, Math.min(100, settings.inkWeight)) / 100;

  let noiseFloor = 46 - sensNorm * 32; // 46 down to 14
  if (settings.removeLines) {
    noiseFloor += 17;
  }
  const span = Math.max(36, 132 - weightNorm * 72);
  const gamma = 1.15 - weightNorm * 0.55;

  const tintRgb =
    settings.inkColor === "original" ? null : INK_COLOR_MAP[settings.inkColor];

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    const sY0 = y0 * stride;
    const sY1 = (y1 + 1) * stride;
    const rowOff = y * w;

    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);

      const sX0 = x0;
      const sX1 = x1 + 1;

      const localMeanL =
        (satL[sY1 + sX1] - satL[sY0 + sX1] - satL[sY1 + sX0] + satL[sY0 + sX0]) /
        area;
      // Paper surface brightness estimate slightly above window mean to offset dark strokes
      const bgL = Math.min(255, Math.max(24, localMeanL * 1.035));

      const l = lum[rowOff + x];
      const norm = Math.min(255, Math.max(0, (l / bgL) * 255));
      const darkness = 255 - norm;

      const idx = (rowOff + x) * 4;
      if (darkness <= noiseFloor) {
        data[idx + 3] = 0;
        continue;
      }

      const rawAlpha = Math.min(1, Math.max(0, (darkness - noiseFloor) / span));
      const smoothAlpha = Math.pow(rawAlpha, gamma);
      const outA = Math.round(smoothAlpha * 255);

      if (outA < 4) {
        data[idx + 3] = 0;
        continue;
      }

      if (tintRgb) {
        // Modulate slight natural variation so pressure shading stays expressive
        const depthFactor = 0.85 + 0.15 * (1 - smoothAlpha);
        data[idx] = Math.round(tintRgb[0] * depthFactor);
        data[idx + 1] = Math.round(tintRgb[1] * depthFactor);
        data[idx + 2] = Math.round(tintRgb[2] * depthFactor);
      } else {
        // Illumination-normalized original pen ink color
        const bgR =
          (satR[sY1 + sX1] - satR[sY0 + sX1] - satR[sY1 + sX0] + satR[sY0 + sX0]) /
          area;
        const bgG =
          (satG[sY1 + sX1] - satG[sY0 + sX1] - satG[sY1 + sX0] + satG[sY0 + sX0]) /
          area;
        const bgB =
          (satB[sY1 + sX1] - satB[sY0 + sX1] - satB[sY1 + sX0] + satB[sY0 + sX0]) /
          area;

        const normR = Math.min(255, (data[idx] / Math.max(24, bgR)) * 255);
        const normG = Math.min(255, (data[idx + 1] / Math.max(24, bgG)) * 255);
        const normB = Math.min(255, (data[idx + 2] / Math.max(24, bgB)) * 255);

        // Darken proportionally so semi-transparent ink keeps rich hue
        const boost = 0.78;
        data[idx] = Math.max(0, Math.round(normR * boost));
        data[idx + 1] = Math.max(0, Math.round(normG * boost));
        data[idx + 2] = Math.max(0, Math.round(normB * boost));
      }

      data[idx + 3] = outA;

      if (outA > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Auto-trim surrounding empty margins while preserving comfortable breathing room
  let finalCanvas = workCanvas;
  if (maxX > minX && maxY > minY) {
    const pad = 24;
    const tx = Math.max(0, minX - pad);
    const ty = Math.max(0, minY - pad);
    const tw = Math.min(w - tx, maxX - minX + 1 + pad * 2);
    const th = Math.min(h - ty, maxY - minY + 1 + pad * 2);

    const trimCanvas = document.createElement("canvas");
    trimCanvas.width = tw;
    trimCanvas.height = th;
    const trimCtx = trimCanvas.getContext("2d");
    if (trimCtx) {
      trimCtx.drawImage(workCanvas, tx, ty, tw, th, 0, 0, tw, th);
      finalCanvas = trimCanvas;
    }
  }

  let dataUrl = finalCanvas.toDataURL("image/webp", 0.92);
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = finalCanvas.toDataURL("image/png");
  }

  const result: InkExtractionResult = {
    dataUrl,
    width: finalCanvas.width,
    height: finalCanvas.height,
    processingMs: Math.round(performance.now() - t0),
  };

  setCached(key, result);
  return result;
}
