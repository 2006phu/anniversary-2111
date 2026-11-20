import { DEFAULT_CARD_CONFIG } from "../data/defaultCard";
import type { CardConfig, InkColorPreset, LetterMode } from "../types/card";

const STORAGE_KEY = "anni_card_config_v3";

const VALID_MODES = new Set<LetterMode>(["handwriting", "typed", "hybrid"]);
const VALID_COLORS = new Set<InkColorPreset>([
  "original",
  "velvet",
  "wine",
  "midnight",
  "sepia",
]);

function sanitizeConfig(raw: unknown): CardConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_CARD_CONFIG;
  }
  const obj = raw as Record<string, unknown>;
  const rawInk = (obj.inkSettings && typeof obj.inkSettings === "object"
    ? obj.inkSettings
    : {}) as Record<string, unknown>;

  const rot = rawInk.rotation;
  const validRotation: 0 | 90 | 180 | 270 =
    rot === 90 || rot === 180 || rot === 270 ? rot : 0;

  const letterMode = VALID_MODES.has(obj.letterMode as LetterMode)
    ? (obj.letterMode as LetterMode)
    : DEFAULT_CARD_CONFIG.letterMode;

  const inkColor = VALID_COLORS.has(rawInk.inkColor as InkColorPreset)
    ? (rawInk.inkColor as InkColorPreset)
    : DEFAULT_CARD_CONFIG.inkSettings.inkColor;

  const pages = Array.isArray(obj.handwrittenPages)
    ? obj.handwrittenPages
        .filter(
          (p): p is { id: string; label: string; rawSrc: string; extractedDataUrl?: string } =>
            Boolean(p && typeof p === "object" && typeof (p as Record<string, unknown>).rawSrc === "string")
        )
        .map((p, idx) => ({
          id: typeof p.id === "string" && p.id ? p.id : `page-${idx + 1}`,
          label: typeof p.label === "string" && p.label ? p.label : `Trang ${idx + 1}`,
          rawSrc: p.rawSrc,
          extractedDataUrl:
            typeof p.extractedDataUrl === "string" ? p.extractedDataUrl : undefined,
        }))
    : DEFAULT_CARD_CONFIG.handwrittenPages;

  const memories = Array.isArray(obj.memories)
    ? obj.memories
        .filter(
          (m): m is { id: string; src: string; caption: string; date: string } =>
            Boolean(m && typeof m === "object" && typeof (m as Record<string, unknown>).src === "string")
        )
        .map((m, idx) => ({
          id: typeof m.id === "string" && m.id ? m.id : `mem-${idx + 1}`,
          src: m.src,
          caption: typeof m.caption === "string" ? m.caption : "",
          date: typeof m.date === "string" ? m.date : "",
        }))
    : DEFAULT_CARD_CONFIG.memories;

  const passcodeRaw =
    typeof obj.passcode === "string"
      ? obj.passcode.replace(/\D/g, "").slice(0, 4)
      : "";

  return {
    version: 1,
    passcode: passcodeRaw.length === 4 ? passcodeRaw : DEFAULT_CARD_CONFIG.passcode,
    anniversaryLabel:
      typeof obj.anniversaryLabel === "string" && obj.anniversaryLabel.trim()
        ? obj.anniversaryLabel
        : DEFAULT_CARD_CONFIG.anniversaryLabel,
    envelopeSubtitle:
      typeof obj.envelopeSubtitle === "string"
        ? obj.envelopeSubtitle
        : DEFAULT_CARD_CONFIG.envelopeSubtitle,
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title
        : DEFAULT_CARD_CONFIG.title,
    salutation:
      typeof obj.salutation === "string"
        ? obj.salutation
        : DEFAULT_CARD_CONFIG.salutation,
    typedBody:
      typeof obj.typedBody === "string"
        ? obj.typedBody
        : DEFAULT_CARD_CONFIG.typedBody,
    signOff:
      typeof obj.signOff === "string"
        ? obj.signOff
        : DEFAULT_CARD_CONFIG.signOff,
    senderSignature:
      typeof obj.senderSignature === "string"
        ? obj.senderSignature
        : DEFAULT_CARD_CONFIG.senderSignature,
    letterMode,
    inkSettings: {
      sensitivity:
        typeof rawInk.sensitivity === "number"
          ? Math.max(0, Math.min(100, rawInk.sensitivity))
          : DEFAULT_CARD_CONFIG.inkSettings.sensitivity,
      inkWeight:
        typeof rawInk.inkWeight === "number"
          ? Math.max(0, Math.min(100, rawInk.inkWeight))
          : DEFAULT_CARD_CONFIG.inkSettings.inkWeight,
      removeLines:
        typeof rawInk.removeLines === "boolean"
          ? rawInk.removeLines
          : DEFAULT_CARD_CONFIG.inkSettings.removeLines,
      inkColor,
      rotation: validRotation,
      cropMargin:
        typeof rawInk.cropMargin === "number"
          ? Math.max(0, Math.min(0.15, rawInk.cropMargin))
          : DEFAULT_CARD_CONFIG.inkSettings.cropMargin,
    },
    handwrittenPages: pages.length > 0 ? pages : DEFAULT_CARD_CONFIG.handwrittenPages,
    memories,
    audioSrc:
      typeof obj.audioSrc === "string" && obj.audioSrc
        ? obj.audioSrc
        : DEFAULT_CARD_CONFIG.audioSrc,
  };
}

export function loadCardConfig(): CardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_CONFIG;
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CARD_CONFIG;
  }
}

export function saveCardConfig(config: CardConfig): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Dung lượng ảnh vượt quá bộ nhớ trình duyệt (localStorage). Hãy tải file mã hóa card-data.json để lưu trữ vĩnh viễn.",
    };
  }
}

export function resetCardConfig(): CardConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
  return DEFAULT_CARD_CONFIG;
}

export function downloadEncodedCard(config: CardConfig): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "card-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function parseEncodedCardFile(file: File): Promise<CardConfig> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Tệp gói mã hóa không hợp lệ.");
  }
  return sanitizeConfig(parsed);
}
