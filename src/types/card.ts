export type AppStage = "gate" | "envelope" | "memories" | "folio";

export type LetterMode = "handwriting" | "typed" | "hybrid";

export type InkColorPreset =
  | "original"
  | "velvet"
  | "wine"
  | "midnight"
  | "sepia";

export interface InkSettings {
  /** Threshold sensitivity (0-100): higher detects lighter pen strokes */
  sensitivity: number;
  /** Ink density/contrast weight (0-100): higher thickens and darkens strokes */
  inkWeight: number;
  /** Suppresses faint horizontal/grid notebook lines */
  removeLines: boolean;
  /** Color tinting mode for extracted ink strokes */
  inkColor: InkColorPreset;
  /** Quarter-turn clockwise rotation in degrees */
  rotation: 0 | 90 | 180 | 270;
  /** Edge margin crop ratio (0 - 0.15) */
  cropMargin: number;
}

export interface HandwrittenPage {
  id: string;
  label: string;
  /** Raw source photo URL or compressed data URL */
  rawSrc: string;
  /** Baked transparent PNG/WebP ink data URL (computed on encode or cached) */
  extractedDataUrl?: string;
}

export interface MemoryPhoto {
  id: string;
  src: string;
  caption: string;
  date: string;
}

export interface CardConfig {
  version: number;
  passcode: string;
  anniversaryLabel: string;
  envelopeSubtitle: string;
  title: string;
  salutation: string;
  typedBody: string;
  signOff: string;
  senderSignature: string;
  letterMode: LetterMode;
  inkSettings: InkSettings;
  handwrittenPages: HandwrittenPage[];
  memories: MemoryPhoto[];
  audioSrc: string;
}
