import os
import numpy as np
from PIL import Image, ImageFilter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = r"C:\Users\User\.gemini\antigravity\brain\fc9e61ea-ff01-431a-97e9-045ada6676e1\.user_uploaded\media_1795175786606_6d91e265.jpg"
OUT_DIR = os.path.join(ROOT_DIR, "public", "letters")
RECT_OUT = os.path.join(OUT_DIR, "real-letter-rectified.jpg")
INK_OUT = os.path.join(OUT_DIR, "real-letter-ink.webp")
PREVIEW_OUT = os.path.join(ROOT_DIR, "scripts", ".letter_preview_on_paper.png")


def find_perspective_coeffs(src_pts: list[tuple[float, float]], dst_pts: list[tuple[float, float]]) -> list[float]:
    """Compute PIL Image.Transform.PERSPECTIVE coefficients mapping dst -> src."""
    matrix = []
    for p_dst, p_src in zip(dst_pts, src_pts):
        x, y = p_dst
        X, Y = p_src
        matrix.append([x, y, 1, 0, 0, 0, -X * x, -X * y])
        matrix.append([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    A = np.array(matrix, dtype=np.float64)
    B = np.array([coord for pt in src_pts for coord in pt], dtype=np.float64)
    res = np.linalg.solve(A, B)
    return res.tolist()


def box_mean_2d(arr: np.ndarray, radius: int) -> np.ndarray:
    """Exact O(1) per-pixel 2D box mean using a summed-area table."""
    h, w = arr.shape
    sat = np.zeros((h + 1, w + 1), dtype=np.float64)
    sat[1:, 1:] = np.cumsum(np.cumsum(arr, axis=0), axis=1)

    ys = np.arange(h)
    xs = np.arange(w)
    y0 = np.maximum(0, ys - radius)
    y1 = np.minimum(h - 1, ys + radius) + 1
    x0 = np.maximum(0, xs - radius)
    x1 = np.minimum(w - 1, xs + radius) + 1

    sums = (
        sat[np.ix_(y1, x1)]
        - sat[np.ix_(y0, x1)]
        - sat[np.ix_(y1, x0)]
        + sat[np.ix_(y0, x0)]
    )
    areas = (y1 - y0)[:, None] * (x1 - x0)[None, :]
    return sums / areas


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(SRC_PATH).convert("RGB")

    # Inner clean writing region corners (excluding wooden desk, left binder holes, and thick top/bottom rules)
    # Source (768 x 1024):
    # Top edge tilts slightly upward to right; bottom edge tilts slightly downward to right
    src_corners = [
        (134.0, 140.0),  # Top-Left (below top thick rule, right of binder holes, above "Gửi em,")
        (658.0, 114.0),  # Top-Right (below top thick rule)
        (686.0, 888.0),  # Bottom-Right (above bottom thick horizontal rule)
        (146.0, 880.0),  # Bottom-Left (below "Anh nhớ em ♡", right of holes)
    ]

    # High-res upright target dimensions
    out_w, out_h = 1040, 1480
    dst_corners = [
        (0.0, 0.0),
        (float(out_w), 0.0),
        (float(out_w), float(out_h)),
        (0.0, float(out_h)),
    ]

    coeffs = find_perspective_coeffs(src_corners, dst_corners)
    rectified = im.transform(
        (out_w, out_h),
        Image.Transform.PERSPECTIVE,
        coeffs,
        resample=Image.Resampling.BICUBIC,
    )
    rectified.save(RECT_OUT, format="JPEG", quality=94)

    arr = np.array(rectified, dtype=np.float32)
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]

    # 2D Summed-area local background estimation
    local_mean = box_mean_2d(lum, radius=46)
    bg_l = np.clip(local_mean * 1.03, 24.0, 255.0)
    norm = np.clip((lum / bg_l) * 255.0, 0.0, 255.0)
    darkness = 255.0 - norm

    # Ruled dotted lines have darkness ~ 12..42; real pen ink has darkness ~ 55..165
    noise_floor = 45.0
    span = 62.0
    gamma = 0.78

    raw_alpha = np.clip((darkness - noise_floor) / span, 0.0, 1.0)
    smooth_alpha = np.power(raw_alpha, gamma)
    alpha_u8 = np.where(smooth_alpha * 255.0 < 8.0, 0, np.round(smooth_alpha * 255.0)).astype(np.uint8)

    # Remove isolated 1-2px specks & tiny faint printed dotted-line specks while keeping all pen dots ('i', '.', ',')
    bin_mask = (alpha_u8 > 18).astype(np.int32)
    neighbor_3x3 = np.zeros_like(bin_mask)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            neighbor_3x3 += np.roll(np.roll(bin_mask, dy, axis=0), dx, axis=1)

    neighbor_5x5 = np.zeros_like(bin_mask)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            neighbor_5x5 += np.roll(np.roll(bin_mask, dy, axis=0), dx, axis=1)

    is_speck = (neighbor_3x3 <= 2) | ((darkness < 72.0) & (neighbor_5x5 <= 6))
    alpha_u8 = np.where(is_speck, 0, alpha_u8).astype(np.uint8)
    _ = ImageFilter

    # Rich warm fountain-pen ink color (#231922) with natural pressure shading
    ink_rgb = np.array([35.0, 25.0, 36.0], dtype=np.float32)
    depth_factor = 0.86 + 0.14 * (1.0 - smooth_alpha)
    out_rgba = np.zeros((out_h, out_w, 4), dtype=np.uint8)
    out_rgba[:, :, 0] = np.clip(ink_rgb[0] * depth_factor, 0, 255).astype(np.uint8)
    out_rgba[:, :, 1] = np.clip(ink_rgb[1] * depth_factor, 0, 255).astype(np.uint8)
    out_rgba[:, :, 2] = np.clip(ink_rgb[2] * depth_factor, 0, 255).astype(np.uint8)
    out_rgba[:, :, 3] = alpha_u8

    # Auto-trim empty borders cleanly with 28px padding
    ys, xs = np.where(alpha_u8 > 20)
    if len(xs) > 0 and len(ys) > 0:
        pad = 28
        tx0 = max(0, int(xs.min()) - pad)
        ty0 = max(0, int(ys.min()) - pad)
        tx1 = min(out_w, int(xs.max()) + 1 + pad)
        ty1 = min(out_h, int(ys.max()) + 1 + pad)
        out_rgba = out_rgba[ty0:ty1, tx0:tx1]

    ink_pil = Image.fromarray(out_rgba, mode="RGBA")
    ink_pil.save(INK_OUT, format="WEBP", quality=92, lossless=False)

    # Also save preview composited on ivory cotton card background (#FBF7F0)
    ivory = Image.new("RGBA", ink_pil.size, (251, 247, 240, 255))
    preview = Image.alpha_composite(ivory, ink_pil).convert("RGB")
    preview.save(PREVIEW_OUT, format="PNG")
    print(f"Rectified saved: {RECT_OUT}")
    print(f"Extracted ink saved: {INK_OUT} ({ink_pil.size}, {os.path.getsize(INK_OUT)/1024:.1f} KB)")
    print(f"Preview saved: {PREVIEW_OUT}")


if __name__ == "__main__":
    main()
