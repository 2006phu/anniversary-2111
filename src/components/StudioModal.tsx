import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  ImagePlus,
  Loader2,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  CardConfig,
  HandwrittenPage,
  InkColorPreset,
  LetterMode,
  MemoryPhoto,
} from "../types/card";
import { extractHandwritingInk } from "../utils/inkExtractor";
import { compressImageFile } from "../utils/imageCompressor";
import {
  downloadEncodedCard,
  parseEncodedCardFile,
  resetCardConfig,
} from "../utils/cardStorage";

interface StudioModalProps {
  isOpen: boolean;
  initialConfig: CardConfig;
  onClose: () => void;
  onApply: (compiled: CardConfig) => { ok: boolean; error?: string };
}

type StudioTab = "letter" | "memories" | "encode";

const INK_COLOR_OPTIONS: { id: InkColorPreset; label: string; swatch: string }[] = [
  { id: "original", label: "Mực gốc", swatch: "linear-gradient(135deg,#334155,#1e293b)" },
  { id: "midnight", label: "Xanh cổ điển", swatch: "#19223E" },
  { id: "velvet", label: "Đen nhung", swatch: "#24161B" },
  { id: "wine", label: "Đỏ rượu", swatch: "#6C1C2C" },
  { id: "sepia", label: "Nâu Sepia", swatch: "#4B3021" },
];

const MODE_OPTIONS: { id: LetterMode; label: string; desc: string }[] = [
  {
    id: "handwriting",
    label: "Thư viết tay",
    desc: "Tách nền giấy từ ảnh chụp, giữ trọn nét chữ thật lên mặt thiệp",
  },
  {
    id: "typed",
    label: "Văn bản",
    desc: "Trình bày lời chúc bằng kiểu chữ nghệ thuật hiện đại",
  },
  {
    id: "hybrid",
    label: "Kết hợp cả hai",
    desc: "Lời mở đầu bằng văn bản kèm bức thư viết tay bên dưới",
  },
];

export function StudioModal({
  isOpen,
  initialConfig,
  onClose,
  onApply,
}: StudioModalProps) {
  const [tab, setTab] = useState<StudioTab>("letter");
  const [draft, setDraft] = useState<CardConfig>(initialConfig);
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewMeta, setPreviewMeta] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialConfig);
      setSelectedPageIdx(0);
      setStatusMessage(null);
    }
  }, [isOpen, initialConfig]);

  const activePage =
    draft.handwrittenPages[
      Math.min(selectedPageIdx, Math.max(0, draft.handwrittenPages.length - 1))
    ];

  // Live Before/After ink extraction preview
  useEffect(() => {
    if (!isOpen || !activePage) return;
    let cancelled = false;
    setIsPreviewLoading(true);

    extractHandwritingInk(activePage.rawSrc, draft.inkSettings)
      .then((res) => {
        if (!cancelled) {
          setPreviewUrl(res.dataUrl);
          setPreviewMeta(`${res.width}×${res.height}px · ${res.processingMs}ms`);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreviewUrl("");
          setStatusMessage({
            type: "error",
            text:
              err instanceof Error ? err.message : "Lỗi tách nét chữ từ ảnh.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activePage,
    draft.inkSettings.sensitivity,
    draft.inkSettings.inkWeight,
    draft.inkSettings.removeLines,
    draft.inkSettings.inkColor,
    draft.inkSettings.rotation,
    draft.inkSettings.cropMargin,
  ]);

  if (!isOpen) return null;

  const updateInkSetting = <K extends keyof CardConfig["inkSettings"]>(
    key: K,
    val: CardConfig["inkSettings"][K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      inkSettings: { ...prev.inkSettings, [key]: val },
      handwrittenPages: prev.handwrittenPages.map((p) => ({
        ...p,
        extractedDataUrl: undefined,
      })),
    }));
  };

  const handleUploadHandwritten = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStatusMessage(null);
    try {
      const nextPages: HandwrittenPage[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i], 1600, 0.9);
        nextPages.push({
          id: `hw-${Date.now()}-${i}`,
          label: `Trang ${draft.handwrittenPages.length + i + 1}`,
          rawSrc: compressed,
        });
      }
      setDraft((prev) => {
        const usingSampleOnly =
          prev.handwrittenPages.length === 1 &&
          prev.handwrittenPages[0].id === "sample-letter-1";
        const merged = usingSampleOnly
          ? nextPages.map((p, idx) => ({ ...p, label: `Trang ${idx + 1}` }))
          : [...prev.handwrittenPages, ...nextPages];
        return {
          ...prev,
          letterMode: prev.letterMode === "typed" ? "handwriting" : prev.letterMode,
          handwrittenPages: merged,
        };
      });
      setSelectedPageIdx(0);
      setStatusMessage({
        type: "ok",
        text: `Đã tải lên ${nextPages.length} trang thư viết tay và tự động tách nền giấy.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Không thể tải ảnh thư tay.",
      });
    }
  };

  const handleUploadMemories = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStatusMessage(null);
    try {
      const added: MemoryPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const src = await compressImageFile(files[i], 1300, 0.84);
        added.push({
          id: `mem-${Date.now()}-${i}`,
          src,
          caption: "Khoảnh khắc dịu dàng của hai đứa",
          date: draft.anniversaryLabel,
        });
      }
      setDraft((prev) => ({
        ...prev,
        memories: [...prev.memories, ...added],
      }));
      setStatusMessage({
        type: "ok",
        text: `Đã thêm ${added.length} ảnh kỷ niệm vào thiệp.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Không thể tải ảnh kỷ niệm.",
      });
    }
  };

  const buildCompiledConfig = async (): Promise<CardConfig> => {
    const compiledPages = await Promise.all(
      draft.handwrittenPages.map(async (page) => {
        if (page.extractedDataUrl) return page;
        const res = await extractHandwritingInk(page.rawSrc, draft.inkSettings);
        return {
          ...page,
          extractedDataUrl: res.dataUrl,
        };
      })
    );
    return {
      ...draft,
      handwrittenPages: compiledPages,
    };
  };

  const handleApplyAndCompile = async () => {
    setIsCompiling(true);
    setStatusMessage(null);
    try {
      const compiled = await buildCompiledConfig();
      const saveResult = onApply(compiled);
      if (!saveResult.ok && saveResult.error) {
        setStatusMessage({ type: "error", text: saveResult.error });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Lỗi khi mã hóa giao diện thiệp.",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadBundle = async () => {
    setIsCompiling(true);
    setStatusMessage(null);
    try {
      const compiled = await buildCompiledConfig();
      downloadEncodedCard(compiled);
      setStatusMessage({
        type: "ok",
        text: "Đã xuất tệp mã hóa card-data.json chứa sẵn nét chữ tách nền & ảnh kỷ niệm.",
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi xuất gói mã hóa.",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleImportBundle = async (file: File | undefined) => {
    if (!file) return;
    setStatusMessage(null);
    try {
      const imported = await parseEncodedCardFile(file);
      setDraft(imported);
      setSelectedPageIdx(0);
      setStatusMessage({
        type: "ok",
        text: "Đã nhập gói mã hóa thành công. Bấm 'Mã hóa & Áp dụng ngay' để hiển thị.",
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Tệp JSON không hợp lệ.",
      });
    }
  };

  const moveMemory = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= draft.memories.length) return;
    setDraft((prev) => {
      const list = [...prev.memories];
      [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
      return { ...prev, memories: list };
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atelier — Thiết kế & Mã hóa Thiệp"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-velvet)]/88 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="flex max-h-[92dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)] text-[var(--text-cream)] shadow-[var(--shadow-card)]">
        {/* Studio Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-7">
          <div>
            <h2 className="font-display text-2xl font-medium text-[var(--text-cream)]">
              L'Atelier — Studio &amp; Mã hóa Thiệp
            </h2>
            <p className="text-xs text-[var(--text-cream-muted)]">
              Tải lên thư tay giữ nguyên nét chữ, thêm ảnh kỷ niệm và đóng gói thành giao diện thiệp hoàn chỉnh
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Studio"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-cream-muted)] hover:border-[var(--gold-champagne)] hover:text-[var(--text-cream)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Mục chỉnh sửa thiệp"
          className="flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] px-5 py-3 sm:px-7"
        >
          {[
            { id: "letter", label: "1. Thư & Nét Chữ Tay" },
            { id: "memories", label: `2. Ảnh Kỷ Niệm (${draft.memories.length})` },
            { id: "encode", label: "3. Thông Tin & Mã Hóa" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id as StudioTab)}
              className={`shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium ${
                tab === item.id
                  ? "border-[var(--gold-champagne)] bg-[var(--wax-wine)] text-[var(--text-cream)]"
                  : "border-[var(--border-subtle)] text-[var(--text-cream-muted)] hover:border-[var(--gold-champagne)]/60 hover:text-[var(--text-cream)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Scrollable Workspace Body */}
        <div className="atelier-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {statusMessage && (
            <div
              role="status"
              className={`mb-5 rounded-xl border px-4 py-3 text-xs ${
                statusMessage.type === "error"
                  ? "border-[var(--text-rose-error)]/40 bg-[var(--wax-wine)]/20 text-[var(--text-rose-error)]"
                  : "border-[var(--gold-champagne)]/40 bg-[var(--gold-champagne-soft)] text-[var(--gold-champagne-bright)]"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* TAB 1: LETTER & HANDWRITING INK EXTRACTOR */}
          {tab === "letter" && (
            <div className="space-y-6">
              {/* Mode Switcher */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, letterMode: m.id }))}
                    className={`cursor-pointer rounded-xl border p-3.5 text-left ${
                      draft.letterMode === m.id
                        ? "border-[var(--gold-champagne)] bg-[var(--bg-velvet-soft)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-velvet)]/40 hover:border-[var(--gold-champagne)]/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-[var(--text-cream)]">
                      {m.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-cream-muted)]">
                      {m.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Handwriting Upload & Live Before/After Extraction */}
              {(draft.letterMode === "handwriting" ||
                draft.letterMode === "hybrid") && (
                <div className="space-y-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/45 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl text-[var(--text-cream)]">
                        Trích xuất nét mực từ ảnh thư viết tay
                      </h3>
                      <p className="text-xs text-[var(--text-cream-muted)]">
                        Xử lý hoàn toàn trên trình duyệt: tự động xóa nền giấy, bóng tối &amp; dòng kẻ mờ
                      </p>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--gold-champagne)] bg-[var(--wax-wine)] px-4 py-2 text-xs font-medium text-[var(--text-cream)] hover:bg-[var(--wax-wine-highlight)]">
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tải ảnh thư tay lên</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(e) => handleUploadHandwritten(e.target.files)}
                      />
                    </label>
                  </div>

                  {/* Page selector when > 1 */}
                  {draft.handwrittenPages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {draft.handwrittenPages.map((pg, idx) => (
                        <div key={pg.id} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPageIdx(idx)}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                              idx === selectedPageIdx
                                ? "border-[var(--gold-champagne)] bg-[var(--gold-champagne-soft)] text-[var(--gold-champagne-bright)]"
                                : "border-[var(--border-subtle)] text-[var(--text-cream-muted)]"
                            }`}
                          >
                            {pg.label}
                          </button>
                          {draft.handwrittenPages.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Xóa ${pg.label}`}
                              onClick={() => {
                                setDraft((prev) => ({
                                  ...prev,
                                  handwrittenPages: prev.handwrittenPages.filter(
                                    (_, i) => i !== idx
                                  ),
                                }));
                                setSelectedPageIdx(0);
                              }}
                              className="cursor-pointer p-1 text-[var(--text-cream-muted)] hover:text-[var(--text-rose-error)]"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Before & After Comparison */}
                  {activePage && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/70 p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-cream-muted)]">
                          <span>Ảnh gốc trên giấy</span>
                          <span>{activePage.label}</span>
                        </div>
                        <div className="flex h-[270px] items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-velvet-elevated)]">
                          <img
                            src={activePage.rawSrc}
                            alt="Ảnh thư tay gốc"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--border-gold)] bg-[var(--bg-velvet)]/70 p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-[var(--gold-champagne)]">
                          <span>Nét mực đã tách lên giấy thiệp</span>
                          <span>{isPreviewLoading ? "Đang xử lý…" : previewMeta}</span>
                        </div>
                        <div className="paper-cotton flex h-[270px] items-center justify-center overflow-hidden rounded-lg border border-[var(--border-paper)] p-3">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Kết quả nét chữ đã tách nền"
                              className="max-h-full max-w-full object-contain mix-blend-multiply"
                            />
                          ) : (
                            <Loader2 className="h-6 w-6 animate-spin text-[var(--wax-wine)]" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ink Tuning Sliders & Controls */}
                  <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <label htmlFor="ink-sens" className="text-[var(--text-cream-muted)]">
                          Ngưỡng tách nền
                        </label>
                        <span>{draft.inkSettings.sensitivity}</span>
                      </div>
                      <input
                        id="ink-sens"
                        type="range"
                        min={10}
                        max={95}
                        value={draft.inkSettings.sensitivity}
                        onChange={(e) =>
                          updateInkSetting("sensitivity", Number(e.target.value))
                        }
                        className="atelier-range w-full cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <label htmlFor="ink-weight" className="text-[var(--text-cream-muted)]">
                          Độ đậm nét chữ
                        </label>
                        <span>{draft.inkSettings.inkWeight}</span>
                      </div>
                      <input
                        id="ink-weight"
                        type="range"
                        min={15}
                        max={95}
                        value={draft.inkSettings.inkWeight}
                        onChange={(e) =>
                          updateInkSetting("inkWeight", Number(e.target.value))
                        }
                        className="atelier-range w-full cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <label htmlFor="ink-crop" className="text-[var(--text-cream-muted)]">
                          Cắt gọn viền ảnh
                        </label>
                        <span>{Math.round(draft.inkSettings.cropMargin * 100)}%</span>
                      </div>
                      <input
                        id="ink-crop"
                        type="range"
                        min={0}
                        max={14}
                        value={Math.round(draft.inkSettings.cropMargin * 100)}
                        onChange={(e) =>
                          updateInkSetting("cropMargin", Number(e.target.value) / 100)
                        }
                        className="atelier-range w-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    {/* Ink Color Palette */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--text-cream-muted)]">
                        Màu mực:
                      </span>
                      {INK_COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateInkSetting("inkColor", c.id)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                            draft.inkSettings.inkColor === c.id
                              ? "border-[var(--gold-champagne)] bg-[var(--gold-champagne-soft)] text-[var(--text-cream)]"
                              : "border-[var(--border-subtle)] text-[var(--text-cream-muted)]"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/25"
                            style={{ background: c.swatch }}
                            aria-hidden="true"
                          />
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-cream-muted)]">
                        <input
                          type="checkbox"
                          checked={draft.inkSettings.removeLines}
                          onChange={(e) =>
                            updateInkSetting("removeLines", e.target.checked)
                          }
                          className="h-4 w-4 accent-[var(--gold-champagne)]"
                        />
                        <span>Khử dòng kẻ mờ</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          updateInkSetting(
                            "rotation",
                            (((draft.inkSettings.rotation + 90) % 360) as
                              | 0
                              | 90
                              | 180
                              | 270)
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-cream)] hover:border-[var(--gold-champagne)]"
                      >
                        <RotateCw className="h-3 w-3" aria-hidden="true" />
                        <span>Xoay 90°</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Typed Body Editor */}
              {(draft.letterMode === "typed" || draft.letterMode === "hybrid") && (
                <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/45 p-4">
                  <label
                    htmlFor="typed-letter-body"
                    className="block text-sm font-medium text-[var(--text-cream)]"
                  >
                    Nội dung lời chúc dạng văn bản
                  </label>
                  <textarea
                    id="typed-letter-body"
                    rows={6}
                    value={draft.typedBody}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, typedBody: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] p-3 text-sm leading-relaxed text-[var(--text-cream)] focus:border-[var(--gold-champagne)]"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEMORY PHOTOS */}
          {tab === "memories" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl text-[var(--text-cream)]">
                    Ảnh kỷ niệm bên trong thiệp
                  </h3>
                  <p className="text-xs text-[var(--text-cream-muted)]">
                    Ảnh sẽ được nén nhẹ tự động và hiển thị dưới dạng xấp ảnh Polaroid tương tác
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--gold-champagne)] bg-[var(--wax-wine)] px-4 py-2 text-xs font-medium text-[var(--text-cream)] hover:bg-[var(--wax-wine-highlight)]">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm ảnh kỷ niệm</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => handleUploadMemories(e.target.files)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {draft.memories.map((mem, idx) => (
                  <div
                    key={mem.id}
                    className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/55 p-3"
                  >
                    <img
                      src={mem.src}
                      alt=""
                      className="h-24 w-20 shrink-0 rounded-lg object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <input
                        type="text"
                        value={mem.caption}
                        aria-label={`Chú thích ảnh ${idx + 1}`}
                        placeholder="Chú thích kỷ niệm..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((p) => ({
                            ...p,
                            memories: p.memories.map((item, i) =>
                              i === idx ? { ...item, caption: val } : item
                            ),
                          }));
                        }}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-2.5 py-1.5 text-xs text-[var(--text-cream)]"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={mem.date}
                          aria-label={`Ngày kỷ niệm ảnh ${idx + 1}`}
                          placeholder="Ngày / mốc"
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((p) => ({
                              ...p,
                              memories: p.memories.map((item, i) =>
                                i === idx ? { ...item, date: val } : item
                              ),
                            }));
                          }}
                          className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-2.5 py-1 text-xs text-[var(--text-cream-muted)]"
                        />

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveMemory(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Đưa ảnh lên trước"
                            className="cursor-pointer rounded-md p-1 text-[var(--text-cream-muted)] hover:text-[var(--text-cream)] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMemory(idx, 1)}
                            disabled={idx === draft.memories.length - 1}
                            aria-label="Đưa ảnh xuống sau"
                            className="cursor-pointer rounded-md p-1 text-[var(--text-cream-muted)] hover:text-[var(--text-cream)] disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                memories: p.memories.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label="Xóa ảnh"
                            className="cursor-pointer rounded-md p-1 text-[var(--text-cream-muted)] hover:text-[var(--text-rose-error)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CARD METADATA & ENCODING */}
          {tab === "encode" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="field-title"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Tiêu đề lá thư
                  </label>
                  <input
                    id="field-title"
                    type="text"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm text-[var(--text-cream)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-subtitle"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Dòng đề tặng trên phong bì
                  </label>
                  <input
                    id="field-subtitle"
                    type="text"
                    value={draft.envelopeSubtitle}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, envelopeSubtitle: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm text-[var(--text-cream)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-anniv-label"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Dấu ngày kỷ niệm (trên dấu sáp &amp; tiêu đề)
                  </label>
                  <input
                    id="field-anniv-label"
                    type="text"
                    value={draft.anniversaryLabel}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, anniversaryLabel: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm text-[var(--text-cream)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-passcode"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Mật mã ngày kỷ niệm (4 chữ số DDMM)
                  </label>
                  <input
                    id="field-passcode"
                    type="text"
                    maxLength={4}
                    value={draft.passcode}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setDraft((p) => ({ ...p, passcode: clean }));
                    }}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm tracking-widest text-[var(--text-cream)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-signoff"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Lời kết
                  </label>
                  <input
                    id="field-signoff"
                    type="text"
                    value={draft.signOff}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, signOff: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm text-[var(--text-cream)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-signature"
                    className="mb-1.5 block text-xs text-[var(--text-cream-muted)]"
                  >
                    Chữ ký
                  </label>
                  <input
                    id="field-signature"
                    type="text"
                    value={draft.senderSignature}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, senderSignature: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)] px-3 py-2 text-sm text-[var(--text-cream)]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-velvet)]/45 p-4">
                <button
                  type="button"
                  onClick={handleDownloadBundle}
                  disabled={isCompiling}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-gold)] bg-[var(--bg-velvet-elevated)] px-4 py-2 text-xs text-[var(--text-cream)] hover:border-[var(--gold-champagne)]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tải gói mã hóa (card-data.json)</span>
                </button>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-cream-muted)] hover:border-[var(--gold-champagne)] hover:text-[var(--text-cream)]">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Nhập gói mã hóa (.json)</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(e) => handleImportBundle(e.target.files?.[0])}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const def = resetCardConfig();
                    setDraft(def);
                    setSelectedPageIdx(0);
                    setStatusMessage({
                      type: "ok",
                      text: "Đã khôi phục về mẫu thiệp kỷ niệm 21/11 mặc định.",
                    });
                  }}
                  className="ml-auto cursor-pointer text-xs text-[var(--text-cream-muted)] underline-offset-4 hover:text-[var(--text-rose-error)] hover:underline"
                >
                  Khôi phục mẫu 21/11
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Studio Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-velvet)]/65 px-5 py-3.5 sm:px-7">
          <span className="text-xs text-[var(--text-cream-muted)]">
            Mật mã hiện tại: <strong className="text-[var(--gold-champagne-bright)]">{draft.passcode || "2111"}</strong>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-cream-muted)] hover:border-[var(--gold-champagne)] hover:text-[var(--text-cream)]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleApplyAndCompile}
              disabled={isCompiling || draft.passcode.length !== 4}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--gold-champagne)] bg-[var(--wax-wine)] px-5 py-2 text-xs font-medium text-[var(--text-cream)] hover:bg-[var(--wax-wine-highlight)] disabled:opacity-50"
            >
              {isCompiling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Mã hóa &amp; Áp dụng ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
