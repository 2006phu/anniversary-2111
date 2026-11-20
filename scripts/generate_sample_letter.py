import os
import math
import urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "public", "samples")
FONT_CACHE_DIR = os.path.join(ROOT_DIR, "scripts", ".font_cache")
OUT_PATH = os.path.join(ASSETS_DIR, "sample-handwritten-letter.jpg")

FONT_CANDIDATES = [
    (
        "DancingScript-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf",
    ),
    (
        "Charm-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/charm/Charm-Regular.ttf",
    ),
    (
        "Caveat-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/caveat/Caveat%5Bwght%5D.ttf",
    ),
]

FALLBACK_FONT = "C:/Windows/Fonts/palai.ttf"


def supports_vietnamese(font_path: str) -> bool:
    try:
        font = ImageFont.truetype(font_path, 36)
        test_chars = ["ệ", "ư", "ơ", "đ", "ă", "ấ", "ủ"]
        missing = bytes(font.getmask("\u2603"))
        for ch in test_chars:
            if bytes(font.getmask(ch)) == missing:
                return False
        return True
    except Exception:
        return False


def get_handwriting_font() -> str:
    os.makedirs(FONT_CACHE_DIR, exist_ok=True)
    for filename, url in FONT_CANDIDATES:
        local_path = os.path.join(FONT_CACHE_DIR, filename)
        if not os.path.exists(local_path):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                with open(local_path, "wb") as f:
                    f.write(data)
            except Exception as exc:
                print(f"Could not download {filename}: {exc}")
                continue
        if os.path.exists(local_path) and supports_vietnamese(local_path):
            print(f"Using Vietnamese-verified handwriting font: {filename}")
            return local_path
    print(f"Falling back to {FALLBACK_FONT}")
    return FALLBACK_FONT


def main() -> None:
    os.makedirs(ASSETS_DIR, exist_ok=True)
    rng = np.random.default_rng(2111)

    W, H = 1100, 1450
    # Warm cream cotton paper base
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = xx / W
    ny = yy / H

    # Realistic directional camera lighting: brighter top-left, soft warm shadow bottom-right
    light = 1.04 - 0.24 * (0.55 * nx + 0.65 * ny) + 0.04 * np.sin(nx * 3.2) * np.cos(ny * 2.5)
    # Subtle warm paper fiber texture
    grain = rng.normal(0.0, 3.2, (H, W)).astype(np.float32)

    base_r = np.clip(246.0 * light + grain, 0, 255)
    base_g = np.clip(239.0 * light + grain * 0.95, 0, 255)
    base_b = np.clip(226.0 * light + grain * 0.9, 0, 255)

    paper_rgb = np.stack([base_r, base_g, base_b], axis=-1).astype(np.uint8)
    paper_img = Image.fromarray(paper_rgb, mode="RGB")

    # Faint notebook guide lines (soft blue-grey, subtle)
    lines_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lines_draw = ImageDraw.Draw(lines_layer)
    top_margin = 165
    line_step = 94
    for i in range(13):
        y_pos = top_margin + i * line_step
        lines_draw.line([(92, y_pos), (W - 92, y_pos)], fill=(158, 174, 194, 62), width=2)

    # Margin vertical rule
    lines_draw.line([(135, 95), (135, H - 95)], fill=(204, 148, 152, 48), width=2)
    paper_img = Image.alpha_composite(paper_img.convert("RGBA"), lines_layer)

    font_path = get_handwriting_font()
    font_main = ImageFont.truetype(font_path, 48)
    font_sign = ImageFont.truetype(font_path, 52)
    font_date = ImageFont.truetype(font_path, 38)

    # Try setting medium handwriting weight if variable font
    for fnt, w_val in [(font_main, 520), (font_sign, 580), (font_date, 500)]:
        try:
            fnt.set_variation_by_axes([w_val])
        except Exception:
            pass

    lines = [
        ("Gửi em thương,", 12, 0),
        ("", 0, 0),
        ("Một năm trôi qua thật nhẹ nhàng từ ngày 21/11 ấy,", 0, -0.4),
        ("mỗi buổi chiều tan tầm, mỗi tách cà phê còn ấm,", 4, 0.35),
        ("đều trở nên dịu dàng hơn khi có bàn tay em kề bên.", -2, -0.3),
        ("Cảm ơn em đã biến những ngày bình thường nhất", 3, 0.4),
        ("thành một điều kỳ diệu mà anh luôn muốn giữ mãi.", 0, -0.25),
        ("Dù mai này phố xá có đổi thay hay bận rộn hơn,", 2, 0.3),
        ("mong chúng ta vẫn giữ nguyên nhịp bước cùng nhau.", -1, -0.35),
        ("Chúc mừng kỷ niệm 21/11 của hai đứa mình.", 4, 0.25),
        ("", 0, 0),
        ("Thương em thật nhiều,", 460, -0.4),
        ("Anh — 21 · 11", 515, 0.3),
    ]

    ink_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    y_cursor = 114
    for idx, (text, x_offset, angle_deg) in enumerate(lines):
        if not text:
            y_cursor += 58
            continue

        line_canvas = Image.new("RGBA", (W, 130), (0, 0, 0, 0))
        ld = ImageDraw.Draw(line_canvas)
        fnt = font_sign if idx >= len(lines) - 2 else font_main
        if idx == 0:
            fnt = font_sign

        # Fountain-pen dark indigo-charcoal ink with slight stroke warmth
        ink_alpha = int(222 - idx * 1.1)
        x_start = 152 + x_offset
        # Draw slight double pass for natural fountain pen nib spread
        ld.text((x_start, 24), text, font=fnt, fill=(24, 30, 52, ink_alpha))
        ld.text((x_start + 0.6, 24.5), text, font=fnt, fill=(32, 39, 64, int(ink_alpha * 0.45)))

        rotated = line_canvas.rotate(
            angle_deg + float(rng.uniform(-0.3, 0.3)),
            resample=Image.Resampling.BICUBIC,
            center=(W // 2, 65),
        )
        ink_layer.alpha_composite(rotated, dest=(0, y_cursor - 20))
        y_cursor += line_step

    # Subtle date corner stamp
    corner = Image.new("RGBA", (320, 90), (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner)
    cd.text((16, 12), "Ngày 21 tháng 11", font=font_date, fill=(45, 52, 78, 195))
    ink_layer.alpha_composite(corner.rotate(1.1, resample=Image.Resampling.BICUBIC), dest=(705, 62))

    # Slight organic ink soften so it looks photographed on cotton paper
    ink_layer = ink_layer.filter(ImageFilter.GaussianBlur(radius=0.35))

    # Composite ink onto illuminated paper with multiply-like absorption
    paper_arr = np.array(paper_img.convert("RGB"), dtype=np.float32)
    ink_arr = np.array(ink_layer, dtype=np.float32)
    alpha = (ink_arr[:, :, 3:4] / 255.0) * (0.9 + 0.1 * rng.uniform(0.85, 1.0, (H, W, 1)))
    ink_rgb = ink_arr[:, :, :3]

    # Multiply blend where ink sits on paper so directional lighting affects ink realism too
    blended = paper_arr * (1.0 - alpha) + (paper_arr * (ink_rgb / 255.0)) * alpha
    # Gentle vignette and tiny lens softness
    final_img = Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8), mode="RGB")
    final_img = final_img.filter(ImageFilter.GaussianBlur(radius=0.3))
    final_img.save(OUT_PATH, format="JPEG", quality=92, optimize=True)
    print(f"Generated sample handwritten letter photo at {OUT_PATH}")


if __name__ == "__main__":
    main()
