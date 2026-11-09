from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)


def load_font(size):
    candidates = [
        Path(r"C:\Windows\Fonts\georgiab.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


# 先生成高分辨率母版，再缩小，避免安装图标边缘发虚。
size = 1024
image = Image.new("RGBA", (size, size), "#963a32")
draw = ImageDraw.Draw(image)
font = load_font(600)
box = draw.textbbox((0, 0), "M", font=font)
text_width = box[2] - box[0]
text_height = box[3] - box[1]
draw.text(
    ((size - text_width) / 2, (size - text_height) / 2 - 52),
    "M",
    font=font,
    fill="#fffaf5",
)
draw.line((242, 790, 782, 790), fill="#e3bd76", width=30)

for output_size, name in [
    (512, "icon-512.png"),
    (192, "icon-192.png"),
    (180, "apple-touch-icon.png"),
]:
    resized = image.resize((output_size, output_size), Image.Resampling.LANCZOS)
    resized.save(ASSETS / name, optimize=True)
    print(ASSETS / name)
