from __future__ import annotations

from pathlib import Path

from PIL import Image as PILImage
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
HELP_IMAGES = ROOT / "public" / "images" / "help"
OUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUT_DIR / "edunostics-premium-product-prospectus.pdf"

PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)

INK = colors.HexColor("#07111F")
NAVY = colors.HexColor("#0F172A")
TEXT = colors.HexColor("#111827")
MUTED = colors.HexColor("#64748B")
SOFT = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#E2E8F0")
WHITE = colors.white
BLUE = colors.HexColor("#1D4ED8")
BLUE_2 = colors.HexColor("#2563EB")
BLUE_SOFT = colors.HexColor("#DBEAFE")
CYAN = colors.HexColor("#0891B2")
CYAN_SOFT = colors.HexColor("#CFFAFE")
GREEN = colors.HexColor("#059669")
GREEN_SOFT = colors.HexColor("#D1FAE5")
AMBER = colors.HexColor("#D97706")
AMBER_SOFT = colors.HexColor("#FEF3C7")
PURPLE = colors.HexColor("#6D28D9")
PURPLE_SOFT = colors.HexColor("#EDE9FE")
ROSE = colors.HexColor("#BE123C")
ROSE_SOFT = colors.HexColor("#FFE4E6")


def set_font(c: canvas.Canvas, font: str, size: float, color=TEXT):
    c.setFillColor(color)
    c.setFont(font, size)


def rr(c: canvas.Canvas, x, y, w, h, fill, stroke=None, r=16, lw=0.7):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1 if stroke else 0)


def wrap(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        nxt = f"{cur} {word}".strip()
        if len(nxt) > max_chars and cur:
            lines.append(cur)
            cur = word
        else:
            cur = nxt
    if cur:
        lines.append(cur)
    return lines


def text_block(c: canvas.Canvas, x, y, title, body="", width_chars=56, title_size=22, title_color=TEXT):
    set_font(c, "Helvetica-Bold", title_size, title_color)
    for i, line in enumerate(wrap(title, 34)):
        c.drawString(x, y - i * (title_size + 4), line)
    offset = len(wrap(title, 34)) * (title_size + 4) + 4
    if body:
        set_font(c, "Helvetica", 10.2, MUTED)
        for i, line in enumerate(wrap(body, width_chars)):
            c.drawString(x, y - offset - i * 14, line)


def brand(c: canvas.Canvas, x, y, dark=False, size=27):
    rr(c, x, y, size, size, colors.HexColor("#10B981"), r=8)
    set_font(c, "Helvetica-Bold", size * 0.54, WHITE)
    c.drawCentredString(x + size / 2, y + size * 0.28, "E")
    set_font(c, "Helvetica-Bold", 14, WHITE if dark else TEXT)
    c.drawString(x + size + 9, y + size * 0.34, "Edunostics")


def footer(c: canvas.Canvas, page_no: int, dark=False):
    color = colors.HexColor("#94A3B8") if not dark else colors.HexColor("#BBD2FF")
    set_font(c, "Helvetica", 7.5, color)
    c.drawString(0.42 * inch, 0.25 * inch, "Edunostics Product Prospectus")
    c.drawRightString(PAGE_WIDTH - 0.42 * inch, 0.25 * inch, f"{page_no:02d}")


def page_bg(c: canvas.Canvas, page_no: int, section=""):
    c.setFillColor(SOFT)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.rect(0.22 * inch, 0.45 * inch, PAGE_WIDTH - 0.44 * inch, PAGE_HEIGHT - 0.78 * inch, fill=1, stroke=0)
    brand(c, 0.5 * inch, PAGE_HEIGHT - 0.62 * inch, False, 24)
    if section:
        set_font(c, "Helvetica-Bold", 10.5, MUTED)
        c.drawRightString(PAGE_WIDTH - 0.5 * inch, PAGE_HEIGHT - 0.45 * inch, section.upper())
    footer(c, page_no)


def img_bounds(img_name: str):
    with PILImage.open(HELP_IMAGES / img_name) as im:
        return im.size


def draw_image(c: canvas.Canvas, img_name: str, x, y, w, h, stroke=LINE, r=18, label=None):
    path = HELP_IMAGES / img_name
    if not path.exists():
        return
    iw, ih = img_bounds(img_name)
    scale = min(w / iw, h / ih)
    nw, nh = iw * scale, ih * scale
    rr(c, x, y, w, h, WHITE, stroke=stroke, r=r, lw=0.85)
    c.drawImage(str(path), x + (w - nw) / 2, y + (h - nh) / 2, width=nw, height=nh, preserveAspectRatio=True, mask="auto")
    if label:
        pill(c, x + 16, y + h - 33, label, BLUE, WHITE, w=128)


def pill(c: canvas.Canvas, x, y, text, fill, fg, w=None):
    width = w or max(76, len(text) * 5.2 + 22)
    rr(c, x, y, width, 22, fill, r=11)
    set_font(c, "Helvetica-Bold", 7.5, fg)
    c.drawCentredString(x + width / 2, y + 7.2, text)


def metric(c: canvas.Canvas, x, y, value, label, color):
    rr(c, x, y, 1.42 * inch, 0.76 * inch, WHITE, stroke=LINE, r=14)
    set_font(c, "Helvetica-Bold", 22, color)
    c.drawString(x + 13, y + 31, value)
    set_font(c, "Helvetica", 7.7, MUTED)
    c.drawString(x + 13, y + 14, label)


def annotation(c: canvas.Canvas, x, y, title, body, color, w=2.35 * inch):
    rr(c, x, y, w, 0.74 * inch, colors.Color(color.red, color.green, color.blue, alpha=0.10), stroke=color, r=14, lw=0.9)
    set_font(c, "Helvetica-Bold", 8.7, color)
    c.drawString(x + 12, y + 37, title)
    set_font(c, "Helvetica", 7.7, TEXT)
    for i, line in enumerate(wrap(body, 39)[:2]):
        c.drawString(x + 12, y + 22 - i * 10, line)


def feature_row(c: canvas.Canvas, x, y, number, title, color):
    rr(c, x, y, 2.38 * inch, 0.48 * inch, WHITE, stroke=LINE, r=13)
    rr(c, x + 8, y + 8, 22, 22, color, r=7)
    set_font(c, "Helvetica-Bold", 8, WHITE)
    c.drawCentredString(x + 19, y + 15, str(number))
    set_font(c, "Helvetica-Bold", 8.5, TEXT)
    c.drawString(x + 39, y + 16, title)


def arrow(c: canvas.Canvas, x1, y1, x2, y2, color=BLUE):
    c.setStrokeColor(color)
    c.setLineWidth(1.6)
    c.line(x1, y1, x2, y2)
    c.setFillColor(color)
    c.circle(x2, y2, 3.3, fill=1, stroke=0)


def cover(c: canvas.Canvas):
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.circle(PAGE_WIDTH * 0.88, PAGE_HEIGHT * 0.84, 150, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.circle(PAGE_WIDTH * 0.12, PAGE_HEIGHT * 0.12, 105, fill=1, stroke=0)
    brand(c, 0.62 * inch, PAGE_HEIGHT - 0.83 * inch, True, 32)
    set_font(c, "Helvetica-Bold", 35, WHITE)
    c.drawString(0.74 * inch, 4.18 * inch, "School results,")
    c.drawString(0.74 * inch, 3.7 * inch, "reports, and academics")
    c.drawString(0.74 * inch, 3.22 * inch, "in one platform")
    set_font(c, "Helvetica", 12.2, colors.HexColor("#DDEBFF"))
    c.drawString(0.76 * inch, 2.75 * inch, "A client-facing product prospectus for school owners,")
    c.drawString(0.76 * inch, 2.5 * inch, "administrators, principals, academic coordinators, and teachers.")
    draw_image(c, "dashboard_home.png", 5.0 * inch, 0.92 * inch, 5.45 * inch, 3.2 * inch, stroke=BLUE, r=20)
    pill(c, 0.78 * inch, 1.48 * inch, "Built for Nigerian schools", GREEN_SOFT, GREEN, 160)
    pill(c, 2.76 * inch, 1.48 * inch, "Product prospectus", BLUE_SOFT, BLUE, 140)
    footer(c, 1, dark=True)


def overview(c: canvas.Canvas, p: int):
    page_bg(c, p, "Product Overview")
    text_block(c, 0.72 * inch, 4.92 * inch, "One school system for the full academic cycle.", "Edunostics connects school setup, score entry, score review, broadsheets, report cards, attendance, lessons, assignments, quizzes, and academic controls.")
    draw_image(c, "dashboard_home.png", 5.28 * inch, 1.02 * inch, 5.28 * inch, 3.95 * inch, label="Dashboard")
    items = [
        ("Score Entry", GREEN),
        ("Report Cards", PURPLE),
        ("Broadsheets", AMBER),
        ("Attendance", CYAN),
        ("Lessons & Quizzes", BLUE),
        ("School Controls", ROSE),
    ]
    for i, (title, color) in enumerate(items):
        feature_row(c, 0.82 * inch + (i % 2) * 2.55 * inch, 2.8 * inch - (i // 2) * 0.62 * inch, i + 1, title, color)


def leadership(c: canvas.Canvas, p: int):
    page_bg(c, p, "Leadership Visibility")
    text_block(c, 0.72 * inch, 4.95 * inch, "See what needs attention before result deadlines.", "The dashboard is designed for owners and administrators who need fast visibility into academic health, report publishing, attendance gaps, and recent activity.", 50)
    draw_image(c, "dashboard_home.png", 0.72 * inch, 0.88 * inch, 6.75 * inch, 3.55 * inch, label="Leadership dashboard")
    metric(c, 7.75 * inch, 3.72 * inch, "100%", "score workflow visibility", GREEN)
    metric(c, 9.36 * inch, 3.72 * inch, "Live", "priority alerts", ROSE)
    annotation(c, 7.75 * inch, 2.6 * inch, "Academic health", "Track completion and report publishing status.", BLUE)
    annotation(c, 7.75 * inch, 1.64 * inch, "Priority alerts", "Surface missing attendance, coverage gaps, and unpublished reports.", ROSE)
    annotation(c, 7.75 * inch, 0.68 * inch, "Recent activity", "Know what changed across classes and users.", GREEN)


def score_workflow(c: canvas.Canvas, p: int):
    page_bg(c, p, "Score Entry and Review")
    text_block(c, 0.72 * inch, 4.95 * inch, "Scores move through a controlled workflow.", "Teachers enter scores by subject and class. Administrators review submissions before scores move into broadsheets and report cards.", 48)
    draw_image(c, "score_entry_table.png", 0.72 * inch, 0.88 * inch, 5.1 * inch, 3.48 * inch, label="Score entry")
    draw_image(c, "score_entry.png", 6.1 * inch, 0.88 * inch, 4.45 * inch, 3.48 * inch, label="Score controls")
    feature_row(c, 6.15 * inch, 4.54 * inch, 1, "CA and exam components", BLUE)
    feature_row(c, 8.72 * inch, 4.54 * inch, 2, "Upload and export tools", GREEN)
    annotation(c, 6.16 * inch, 3.72 * inch, "Why it matters", "Totals, grades, and remarks stay consistent across classes.", PURPLE, w=4.0 * inch)


def reports(c: canvas.Canvas, p: int):
    page_bg(c, p, "Report Cards")
    text_block(c, 0.72 * inch, 4.95 * inch, "Branded report cards without manual formatting.", "Edunostics brings biodata, attendance, academic performance, traits, psychomotor skills, comments, photos, and signatures into one report workflow.", 54)
    draw_image(c, "reports_list.png", 0.72 * inch, 0.88 * inch, 4.8 * inch, 3.55 * inch, label="Report workflow")
    draw_image(c, "report_workflow.png", 5.78 * inch, 0.88 * inch, 4.75 * inch, 3.55 * inch, label="Report generation")
    for x, label, color in [
        (0.9 * inch, "Preview", BLUE),
        (2.05 * inch, "Publish", GREEN),
        (3.2 * inch, "Download PDF", PURPLE),
        (4.75 * inch, "Comments", AMBER),
        (6.0 * inch, "Photo", CYAN),
        (6.92 * inch, "Signature", ROSE),
    ]:
        pill(c, x, 4.47 * inch, label, colors.Color(color.red, color.green, color.blue, alpha=0.12), color)


def broadsheet(c: canvas.Canvas, p: int):
    page_bg(c, p, "Broadsheet")
    text_block(c, 0.72 * inch, 4.95 * inch, "Class broadsheets generated from approved scores.", "A wide academic summary helps school leaders inspect subject performance, totals, grades, positions, averages, and class records before publishing.", 54)
    draw_image(c, "score_entry_table.png", 0.72 * inch, 1.06 * inch, 3.15 * inch, 2.15 * inch, label="Scores")
    draw_image(c, "dashboard_home.png", 4.0 * inch, 1.65 * inch, 3.15 * inch, 2.15 * inch, label="Review")
    draw_image(c, "reports_list.png", 7.28 * inch, 1.06 * inch, 3.15 * inch, 2.15 * inch, label="Reports")
    arrow(c, 3.9 * inch, 2.14 * inch, 4.0 * inch, 2.5 * inch)
    arrow(c, 7.15 * inch, 2.5 * inch, 7.28 * inch, 2.14 * inch)
    annotation(c, 0.88 * inch, 3.72 * inch, "Less spreadsheet work", "The school reviews a generated class summary instead of rebuilding sheets manually.", AMBER, w=4.4 * inch)
    annotation(c, 5.7 * inch, 3.72 * inch, "Decision support", "Class-level performance is easier to inspect before publication.", PURPLE, w=4.4 * inch)


def lms(c: canvas.Canvas, p: int):
    page_bg(c, p, "Academic Tools")
    text_block(c, 0.72 * inch, 4.95 * inch, "Support teaching before result week.", "The platform includes lesson planning, quizzes, assignments, scheme of work, and class progress tools so academic work is managed throughout the term.", 56)
    draw_image(c, "create_scheme.png", 0.72 * inch, 2.72 * inch, 3.18 * inch, 1.85 * inch, label="Scheme of work")
    draw_image(c, "create_assignment.png", 4.08 * inch, 2.72 * inch, 3.18 * inch, 1.85 * inch, label="Assignments")
    draw_image(c, "score_entry_initial.png", 7.44 * inch, 2.72 * inch, 3.18 * inch, 1.85 * inch, label="Class tools")
    feature_row(c, 1.02 * inch, 1.63 * inch, 1, "Lessons and media", CYAN)
    feature_row(c, 3.74 * inch, 1.63 * inch, 2, "Quizzes and scoring", PURPLE)
    feature_row(c, 6.46 * inch, 1.63 * inch, 3, "Assignments and due dates", BLUE)
    feature_row(c, 3.74 * inch, 0.92 * inch, 4, "Class progress tracking", GREEN)


def attendance(c: canvas.Canvas, p: int):
    page_bg(c, p, "Attendance and Behaviour")
    text_block(c, 0.72 * inch, 4.95 * inch, "Academic records go beyond scores.", "Attendance, affective traits, and psychomotor ratings help the school produce a fuller student record.", 54)
    draw_image(c, "attendance_page.png", 0.72 * inch, 1.02 * inch, 5.2 * inch, 3.5 * inch, label="Attendance")
    draw_image(c, "settings_overview.png", 6.18 * inch, 1.02 * inch, 4.25 * inch, 3.5 * inch, label="Behaviour setup")
    for i, (key, label, bg, fg) in enumerate(
        [
            ("P", "Present", GREEN_SOFT, GREEN),
            ("A", "Absent", ROSE_SOFT, ROSE),
            ("L", "Late", AMBER_SOFT, AMBER),
            ("E", "Excused", BLUE_SOFT, BLUE),
        ]
    ):
        x = 1.05 * inch + i * 1.12 * inch
        rr(c, x, 0.62 * inch, 0.85 * inch, 0.36 * inch, bg, stroke=fg, r=10)
        set_font(c, "Helvetica-Bold", 10, fg)
        c.drawString(x + 10, 0.76 * inch, key)
        set_font(c, "Helvetica", 7.7, TEXT)
        c.drawString(x + 28, 0.76 * inch, label)


def structure(c: canvas.Canvas, p: int):
    page_bg(c, p, "People and Setup")
    text_block(c, 0.72 * inch, 4.95 * inch, "Keep school data clean and ready for reports.", "Students, teachers, classes, subjects, academic sessions, and class arms form the foundation for score entry and report generation.", 58)
    draw_image(c, "students_list.png", 0.72 * inch, 2.5 * inch, 4.9 * inch, 2.15 * inch, label="Student table")
    draw_image(c, "add_teacher.png", 5.82 * inch, 2.5 * inch, 4.8 * inch, 2.15 * inch, label="Teacher setup")
    draw_image(c, "add_class.png", 0.72 * inch, 0.73 * inch, 3.05 * inch, 1.35 * inch, label="Classes")
    draw_image(c, "add_student.png", 4.12 * inch, 0.73 * inch, 3.05 * inch, 1.35 * inch, label="Student setup")
    draw_image(c, "add_teacher.png", 7.52 * inch, 0.73 * inch, 3.05 * inch, 1.35 * inch, label="Staff setup")


def controls(c: canvas.Canvas, p: int):
    page_bg(c, p, "Configuration")
    text_block(c, 0.72 * inch, 4.95 * inch, "Configure once. Run every term with consistency.", "School profile, grading, report templates, broadsheet templates, role access, comments, notifications, and academic terms are managed centrally.", 58)
    draw_image(c, "settings_overview.png", 0.72 * inch, 0.88 * inch, 6.0 * inch, 3.72 * inch, label="Settings")
    annotation(c, 7.1 * inch, 3.78 * inch, "Grading system", "Set score components, grades, remarks, and class-specific rules.", GREEN, w=3.12 * inch)
    annotation(c, 7.1 * inch, 2.78 * inch, "Templates", "Control report card and broadsheet layouts for official outputs.", PURPLE, w=3.12 * inch)
    annotation(c, 7.1 * inch, 1.78 * inch, "Role access", "Give each user the right modules and protect sensitive workflows.", BLUE, w=3.12 * inch)
    annotation(c, 7.1 * inch, 0.78 * inch, "Comments", "Support teacher and principal comment workflows.", AMBER, w=3.12 * inch)


def users(c: canvas.Canvas, p: int):
    page_bg(c, p, "User Benefits")
    text_block(c, 0.72 * inch, 4.95 * inch, "Built for every role in the school.", "Edunostics gives each user group a clearer way to participate in the academic workflow.", 56)
    cards = [
        ("Proprietors", "Visibility into results, reports, alerts, and class performance.", BLUE),
        ("Administrators", "Control setup, grading, templates, sessions, users, and publishing.", PURPLE),
        ("Teachers", "Enter scores, create lessons, assign work, and track class progress.", GREEN),
        ("Parents", "Receive clearer, faster access to published reports.", AMBER),
        ("Students", "Access lessons, quizzes, assignments, and academic progress where enabled.", CYAN),
    ]
    for i, (title, body, color) in enumerate(cards):
        x = 0.82 * inch + (i % 3) * 3.25 * inch
        y = 3.35 * inch - (i // 3) * 1.18 * inch
        annotation(c, x, y, title, body, color, w=2.82 * inch)
    metric(c, 1.3 * inch, 0.82 * inch, "1", "connected school workflow", BLUE)
    metric(c, 3.05 * inch, 0.82 * inch, "6", "core user groups", GREEN)
    metric(c, 4.8 * inch, 0.82 * inch, "All", "major academic modules", PURPLE)


def implementation(c: canvas.Canvas, p: int):
    page_bg(c, p, "Implementation")
    text_block(c, 0.72 * inch, 4.95 * inch, "A clear path from setup to adoption.", "Implementation starts with school structure and report format, then moves into pilot testing, staff training, and full rollout.", 56)
    steps = [
        ("Discovery", BLUE),
        ("Configuration", PURPLE),
        ("Training", GREEN),
        ("Pilot Class", AMBER),
        ("Full Rollout", CYAN),
    ]
    for i, (title, color) in enumerate(steps):
        x = 0.85 * inch + i * 1.95 * inch
        y = 2.85 * inch
        rr(c, x, y, 1.55 * inch, 0.85 * inch, WHITE, stroke=color, r=16, lw=1.1)
        rr(c, x + 12, y + 31, 26, 26, color, r=8)
        set_font(c, "Helvetica-Bold", 9, WHITE)
        c.drawCentredString(x + 25, y + 40, str(i + 1))
        set_font(c, "Helvetica-Bold", 9.1, TEXT)
        c.drawString(x + 45, y + 40, title)
        if i < len(steps) - 1:
            arrow(c, x + 1.55 * inch, y + 0.42 * inch, x + 1.84 * inch, y + 0.42 * inch)
    draw_image(c, "report_workflow.png", 2.3 * inch, 0.62 * inch, 6.65 * inch, 1.6 * inch, label="Pilot and rollout")


def cta(c: canvas.Canvas, p: int):
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.circle(PAGE_WIDTH * 0.9, PAGE_HEIGHT * 0.78, 135, fill=1, stroke=0)
    brand(c, 0.62 * inch, PAGE_HEIGHT - 0.82 * inch, True, 32)
    set_font(c, "Helvetica-Bold", 31, WHITE)
    c.drawString(0.78 * inch, 4.05 * inch, "Ready to modernize")
    c.drawString(0.78 * inch, 3.6 * inch, "your result workflow?")
    set_font(c, "Helvetica", 12, colors.HexColor("#DDEBFF"))
    c.drawString(0.8 * inch, 3.1 * inch, "Request a product walkthrough and implementation review.")
    c.drawString(0.8 * inch, 2.84 * inch, "We will map your current result process to Edunostics.")
    rr(c, 0.82 * inch, 2.05 * inch, 2.2 * inch, 0.5 * inch, BLUE, r=16)
    set_font(c, "Helvetica-Bold", 12, WHITE)
    c.drawCentredString(1.92 * inch, 2.23 * inch, "Book a Demo")
    rr(c, 3.25 * inch, 2.05 * inch, 2.9 * inch, 0.5 * inch, GREEN, r=16)
    c.drawCentredString(4.7 * inch, 2.23 * inch, "Implementation Review")
    draw_image(c, "dashboard_home.png", 6.35 * inch, 1.15 * inch, 4.25 * inch, 3.0 * inch, stroke=BLUE, r=20)
    footer(c, p, dark=True)


def build_pdf() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    c.setTitle("Edunostics Premium Product Prospectus")
    c.setAuthor("Edunostics")
    pages = [
        cover,
        overview,
        leadership,
        score_workflow,
        reports,
        broadsheet,
        lms,
        attendance,
        structure,
        controls,
        users,
        implementation,
        cta,
    ]
    for i, page in enumerate(pages, start=1):
        if i == 1:
            page(c)
        else:
            page(c, i)
        c.showPage()
    c.save()
    reader = PdfReader(str(OUTPUT))
    if len(reader.pages) != len(pages):
        raise RuntimeError(f"Expected {len(pages)} pages, got {len(reader.pages)}")
    text = "\n".join(page.extract_text() or "" for page in reader.pages[:5])
    for term in ["Edunostics", "Score Entry", "Report Cards", "Leadership"]:
        if term.lower() not in text.lower():
            raise RuntimeError(f"Missing expected text: {term}")


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
