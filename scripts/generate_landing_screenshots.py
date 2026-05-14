from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "Screen shots"
OUT_DIR = ROOT / "public" / "landing-screenshots"
PORTRAIT_SHEET = Path.home() / ".codex" / "generated_images" / "019e02ac-424b-7411-b13b-f58f7b1c98ff" / "ig_0ad8dd5c350ffa610169fc9773a284819193075269bee4bd4d.png"

DUMMY_NAMES = [
    "AMARA OKAFOR",
    "SAMUEL ADEYEMI",
    "ZARA NWOSU",
    "DAVID EZE",
    "MAYA BELLO",
    "TOBI BALOGUN",
    "AISHA IBRAHIM",
    "CHINEDU OKONKWO",
    "FATIMA SANI",
    "KEMI OJO",
    "DANIEL OKAFOR",
    "MRS. GRACE ADEBIYI",
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_portraits(sheet_path: Path) -> list[Image.Image]:
    sheet = Image.open(sheet_path).convert("RGB")
    w, h = sheet.size
    cell_w, cell_h = w // 4, h // 4
    portraits = []
    for row in range(4):
        for col in range(4):
            crop = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            # Trim the contact-sheet gutters and keep a square center crop.
            side = min(crop.size)
            crop = crop.crop(((crop.width - side) // 2, (crop.height - side) // 2, (crop.width + side) // 2, (crop.height + side) // 2))
            portraits.append(crop)
    return portraits


def paste_circle(base: Image.Image, portrait: Image.Image, box, border=(59, 130, 246), border_width=0):
    x1, y1, x2, y2 = map(int, box)
    size = min(x2 - x1, y2 - y1)
    portrait = portrait.resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size - 1, size - 1), fill=255)
    if border_width:
        ring_size = size + border_width * 2
        ring = Image.new("RGBA", (ring_size, ring_size), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring)
        rd.ellipse((0, 0, ring_size - 1, ring_size - 1), fill=border + (255,))
        ring_mask = Image.new("L", (ring_size, ring_size), 0)
        rmd = ImageDraw.Draw(ring_mask)
        rmd.ellipse((0, 0, ring_size - 1, ring_size - 1), fill=255)
        base.paste(ring, (x1 - border_width, y1 - border_width), ring_mask)
    base.paste(portrait, (x1, y1), mask)


def cover_text(draw, box, fill=(255, 255, 255), radius=0):
    if radius:
        rounded_rect(draw, box, radius, fill)
    else:
        draw.rectangle(box, fill=fill)


def add_sidebar_dummy(im: Image.Image, portraits: list[Image.Image]):
    if im.width < 1800:
        return
    draw = ImageDraw.Draw(im)
    y = im.height - 155
    cover_text(draw, (0, y - 10, 470, im.height), fill=(255, 255, 255))
    paste_circle(im, portraits[10], (30, y + 12, 105, y + 87), border=(203, 213, 225), border_width=2)
    draw.text((130, y + 15), "Demo Admin", fill=(15, 23, 42), font=font(28, True))
    draw.text((130, y + 58), "admin.demo@tis.com", fill=(100, 116, 139), font=font(23))


def dashboard(im: Image.Image, portraits: list[Image.Image]):
    draw = ImageDraw.Draw(im)
    sx, sy = im.width / 3795, im.height / 1852
    def b(x1, y1, x2, y2):
        return (int(x1 * sx), int(y1 * sy), int(x2 * sx), int(y2 * sy))

    cover_text(draw, b(795, 203, 1785, 298), fill=(42, 99, 235), radius=8)
    draw.text((int(798 * sx), int(224 * sy)), "Welcome back, Demo Admin", fill=(255, 255, 255), font=font(int(48 * sx), True))
    replacements = [
        (b(875, 832, 1022, 979), b(1090, 805, 1445, 930), "Amara Okafor", "Basic 4 Peony", 0, (255, 250, 252)),
        (b(1810, 832, 1957, 979), b(2022, 805, 2355, 930), "Samuel Adeyemi", "Basic 3 Peony", 1, (247, 253, 255)),
        (b(2738, 832, 2885, 979), b(2950, 805, 3270, 930), "Zara Nwosu", "Basic 5 Daisy", 2, (247, 253, 255)),
    ]
    for photo_box, text_box, name, klass, idx, card_fill in replacements:
        cover_text(draw, (photo_box[0] - 20, photo_box[1] - 20, photo_box[2] + 20, photo_box[3] + 20), fill=card_fill, radius=20)
        paste_circle(im, portraits[idx], photo_box, border=(14, 165, 233), border_width=6)
        cover_text(draw, text_box, fill=card_fill, radius=8)
        draw.text((text_box[0], text_box[1]), name, fill=(15, 23, 42), font=font(int(38 * sx), True))
        draw.text((text_box[0], text_box[1] + int(62 * sy)), klass, fill=(100, 116, 139), font=font(int(30 * sx)))


def student_table(im: Image.Image, portraits: list[Image.Image]):
    draw = ImageDraw.Draw(im)
    sx, sy = im.width / 3730, im.height / 1787
    row_y = [1380, 1525, 1670]
    for i, y in enumerate(row_y):
        py = int(y * sy)
        px = int(588 * sx)
        cover_text(draw, (px, py - 5, px + int(95 * sx), py + int(85 * sy)), fill=(255, 255, 255), radius=12)
        paste_circle(im, portraits[i + 3], (px, py, px + int(70 * sx), py + int(70 * sy)))
        tx = int(700 * sx)
        cover_text(draw, (tx, py + int(12 * sy), tx + int(520 * sx), py + int(55 * sy)), fill=(255, 255, 255))
        draw.text((tx, py + int(14 * sy)), DUMMY_NAMES[i], fill=(15, 23, 42), font=font(int(28 * sx), True))
        phone_x = int(2205 * sx)
        cover_text(draw, (phone_x, py + int(10 * sy), phone_x + int(400 * sx), py + int(55 * sy)), fill=(255, 255, 255))
        draw.text((phone_x, py + int(14 * sy)), f"0803{i + 2}45{i + 7}210", fill=(71, 85, 105), font=font(int(27 * sx)))


def profile_page(im: Image.Image, portraits: list[Image.Image]):
    draw = ImageDraw.Draw(im)
    sx, sy = im.width / 3775, im.height / 1822
    paste_circle(im, portraits[6], (int(700 * sx), int(310 * sy), int(930 * sx), int(540 * sy)), border=(226, 232, 240), border_width=3)
    cover_text(draw, (int(955 * sx), int(315 * sy), int(1500 * sx), int(380 * sy)), fill=(255, 255, 255))
    draw.text((int(955 * sx), int(318 * sy)), "Maya Bello", fill=(15, 23, 42), font=font(int(42 * sx), True))


def staff_page(im: Image.Image, portraits: list[Image.Image]):
    draw = ImageDraw.Draw(im)
    sx, sy = im.width / 3792, im.height / 1840
    for i, y in enumerate([900, 1050, 1200, 1350]):
        px, py = int(590 * sx), int(y * sy)
        paste_circle(im, portraits[8 + i], (px, py, px + int(72 * sx), py + int(72 * sy)))
        tx = int(700 * sx)
        cover_text(draw, (tx, py + int(8 * sy), tx + int(540 * sx), py + int(58 * sy)), fill=(255, 255, 255))
        draw.text((tx, py + int(12 * sy)), DUMMY_NAMES[8 + i], fill=(15, 23, 42), font=font(int(28 * sx), True))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    portraits = make_portraits(PORTRAIT_SHEET)
    shutil.copy2(PORTRAIT_SHEET, OUT_DIR / "dummy-portrait-contact-sheet.png")

    for src in SRC_DIR.glob("*.png"):
        im = Image.open(src).convert("RGB")
        add_sidebar_dummy(im, portraits)
        name = src.name.lower()
        if name == "dashboard.png":
            dashboard(im, portraits)
        if "student management.png" == name:
            student_table(im, portraits)
        if "student management page 2" in name:
            profile_page(im, portraits)
        if "staff management" in name:
            staff_page(im, portraits)
        out = OUT_DIR / src.name
        im.save(out, optimize=True)
        print(out)


if __name__ == "__main__":
    main()
