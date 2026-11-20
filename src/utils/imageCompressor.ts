const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Chỉ hỗ trợ định dạng ảnh JPEG, PNG hoặc WebP."
    );
  }
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Ảnh vượt quá giới hạn 25MB.");
  }
}

export async function compressImageFile(
  file: File,
  maxEdge = 1400,
  quality = 0.84
): Promise<string> {
  validateImageFile(file);
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const w = Math.max(16, Math.round(srcW * scale));
    const h = Math.max(16, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas.");
    }

    ctx.drawImage(img, 0, 0, w, h);

    let out = canvas.toDataURL("image/webp", quality);
    if (!out.startsWith("data:image/webp")) {
      out = canvas.toDataURL("image/jpeg", quality);
    }
    return out;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
