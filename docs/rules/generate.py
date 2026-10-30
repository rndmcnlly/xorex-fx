# /// script
# requires-python = ">=3.11"
# dependencies = ["reportlab==4.4.10", "pymupdf==1.26.7"]
# ///
"""Draw a single, searchable, monochrome rules sheet and render its QC preview."""
from pathlib import Path
import json

import fitz
import reportlab
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

HERE = Path(__file__).resolve().parent
FONT_DIR = Path(reportlab.__file__).parent / "fonts"
for name, filename in [("Vera", "Vera.ttf"), ("Vera-Bold", "VeraBd.ttf"),
                       ("Vera-Italic", "VeraIt.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
pdfmetrics.registerFontFamily("Vera", normal="Vera", bold="Vera-Bold", italic="Vera-Italic")

PDF = HERE / "xorex-rules.pdf"
c = canvas.Canvas(str(PDF), pagesize=(612, 792), pageCompression=1, initialFontName="Vera")
c.setTitle("Xorex | How to play")
c.setAuthor("Xorex FX project")
c.setSubject("One-page rules: arrow keys, held gems, charge, and survival")


def text(x, y, value, size=10, bold=False, gray=0):
    c.setFillGray(gray)
    c.setFont("Vera-Bold" if bold else "Vera", size)
    c.drawString(x, y, value)


def para(x, top, width, value, size=9.6, leading=13.3):
    style = ParagraphStyle("body", fontName="Vera", fontSize=size, leading=leading,
                           textColor="black", spaceAfter=0)
    p = Paragraph(value, style)
    _, height = p.wrap(width, 792)
    p.drawOn(c, x, top - height)
    return top - height


def rule(y):
    c.setStrokeGray(.65)
    c.setLineWidth(.5)
    c.line(42, y, 570, y)


def section(y, number, label):
    text(42, y, number, 9, True, .4)
    text(65, y, label, 9, True)


def chevron(x, y, width=20, height=9, weight=2):
    c.setStrokeGray(0)
    c.setLineWidth(weight)
    p = c.beginPath()
    p.moveTo(x - width / 2, y - height / 2)
    p.lineTo(x, y + height / 2)
    p.lineTo(x + width / 2, y - height / 2)
    c.drawPath(p)


def arrow(x, y, direction, length=13):
    dx, dy = {"up": (0, 1), "down": (0, -1), "left": (-1, 0), "right": (1, 0)}[direction]
    c.setStrokeGray(0)
    c.setLineWidth(1)
    c.line(x-dx*length/2, y-dy*length/2, x+dx*length/2, y+dy*length/2)
    ex, ey = x+dx*length/2, y+dy*length/2
    c.line(ex, ey, ex-4*dx+3*dy, ey-4*dy-3*dx)
    c.line(ex, ey, ex-4*dx-3*dy, ey-4*dy+3*dx)


def key(x, y, direction):
    c.setLineWidth(.7)
    c.setStrokeGray(.35)
    c.roundRect(x, y-6, 26, 24, 3, fill=0, stroke=1)
    arrow(x+13, y+6, direction)


def orb(x, y, label, radius=8):
    c.setStrokeGray(0)
    c.setLineWidth(.75)
    c.circle(x, y, radius, fill=0, stroke=1)
    if label == "K":
        c.circle(x, y, radius-2, fill=0, stroke=1)
    c.setFillGray(0)
    c.setFont("Vera-Bold", 6.5)
    c.drawCentredString(x, y-2.3, label)


# Masthead: white paper, just a small echo of the original ship mark.
chevron(58, 744, 30, 17, 3)
text(88, 733, "XOREX", 34, True)
text(435, 744, "HOW TO PLAY", 9, True)
text(435, 729, "Arrow-key survival", 8.5)
text(42, 700, "Collect. Convert. Clear a path.", 15, True)
para(42, 685, 528, "Keep the field under control for as long as possible. New gems enter at the top, "
     "pushing each lane downward. <b>A lane reaching 15 gems ends the run.</b>", 10.2, 14)
rule(647)

section(628, "01", "READ THE FIELD")
# A deliberately small excerpt, not a misleading five-lane full board.
text(43, 609, "FIELD · 5 OF 20 LANES SHOWN", 7.2, True, .35)
for x in [57, 81, 105, 129, 153]:
    c.setStrokeGray(.82)
    c.setLineWidth(.45)
    c.line(x-11, 598, x-11, 536)
for x, labels in [(57, "RK"), (81, "BRG"), (105, "GWW"), (129, "RB"), (153, "WK")]:
    for i, label in enumerate(labels):
        orb(x, 585-i*19, label)
arrow(105, 599, "down", 9)
text(176, 579, "Bottom gems are", 8)
text(176, 567, "within reach.", 8)
c.setStrokeGray(.5)
c.setLineWidth(.6)
c.line(116, 547, 166, 547)
orb(105, 524, "R", 9)
c.circle(105, 524, 12, stroke=1, fill=0)
text(176, 521, "INVENTORY", 8, True)
chevron(105, 498, 24, 11)
text(176, 495, "YOUR SHIP", 8, True)
for y in [480, 475, 470]:
    chevron(105, y, 14, 5, .85)
text(176, 474, "CHARGE", 8, True)
text(43, 451, "Diagram labels: R red · G green · B blue", 7)
text(43, 440, "W white · K black (double ring)", 7)

para(329, 611, 241, "<b>Two stores, two jobs.</b><br/><b>Inventory</b> (held gems) sits <b>above</b> the ship. "
     "<b>Charge</b> (stored shots) sits <b>below</b>. Inventory is not ammunition yet.", 9.7, 13.4)
key(329, 531, "left")
key(361, 531, "right")
para(400, 549, 170, "<b>MOVE: select a lane.</b><br/>Stop at the edges; no wrapping.", 9.3, 12.8)
para(329, 505, 241, "<b>Tap, release, tap.</b> Each key press makes one action. Release that key before using it again. "
     "You never need to wait for an effect.", 9.3, 12.8)
rule(426)

section(407, "02", "YOUR NEXT MOVE DEPENDS ON WHAT YOU HOLD")
key(42, 376, "down")
text(78, 380, "DOWN", 13, True)
text(78, 365, "COLLECT or CONVERT", 9)
key(316, 376, "up")
text(352, 380, "UP", 13, True)
text(352, 365, "REPLACE or FIRE", 9)

y = para(42, 354, 247, "<b>Inventory empty? COLLECT</b> the whole same-color run at the bottom of this lane. "
         "A black gem blocks collection: you cannot pick it up.")
y = para(42, y-8, 247, "<b>Inventory has gems? CONVERT</b> it into charge. Empty charge or the same color: "
         "each gem adds <b>1 shot</b>. This uses up your inventory.")
para(42, y-8, 247, "A matching conversion is a <b>reload</b>. Different colors? White gems can boost charge; other mismatches lose both stores.", 9.3, 12.8)

y = para(316, 354, 254, "<b>Inventory has gems? REPLACE</b> the <b>whole held run</b> at the bottom of this lane. "
         "Your charge stays unchanged. Move to another lane first to sort or set up runs.")
y = para(316, y-8, 254, "<b>Inventory empty? FIRE</b> if you have charge. Spend <b>1 shot</b> to remove <b>1 bottom gem</b>, "
         "of any color, including black.")
para(316, y-8, 254, "Inventory takes priority: UP replaces it instead of firing. With both stores empty, UP does nothing.", 9.3, 12.8)
rule(207)

section(188, "03", "RECOGNIZE THE OUTCOME")
text(42, 166, "BUILD & BREAK THROUGH", 8.6, True)
y = para(42, 155, 247, "<b>White amplification:</b> convert white inventory into existing, nonwhite charge. "
         "Add <b>5 × (white count)² shots</b>; keep the charge color.", 9.1, 12.2)
y = para(42, y-5, 247, "<b>Example:</b> 2 white + red charge = <b>20 extra red shots</b>, not extra held gems.", 9.1, 12.2)
para(42, y-5, 247, "<b>Breakthrough:</b> fire at a black gem to open a path. Charge color matters for conversion, <b>not damage</b>.", 9.1, 12.2)

text(316, 166, "WATCH THE MIX", 8.6, True)
y = para(316, 155, 254, "<b>Mix loss:</b> converting nonwhite inventory into a different charge color loses <b>both stores</b>, even if the charge is white.", 9.1, 12.2)
y = para(316, y-5, 254, "<b>Dry fire:</b> firing into an empty lane still costs 1 shot.", 9.1, 12.2)
para(316, y-5, 254, "<b>Setup is valid:</b> REPLACE is not a penalty. White into empty or white charge adds normally, without amplification.", 9.1, 12.2)

rule(46)
text(42, 34, "Scan the tails. Plan the mix. Keep your hands moving.", 7.4, True)
text(477, 34, "XOREX FX / RULES", 6.5, False, .35)
c.showPage()
c.save()

doc = fitz.open(PDF)
assert len(doc) == 1, "Rules must stay on one page"
page = doc[0]
safe_text_area = fitz.Rect(28, 28, 584, 764)
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            box = fitz.Rect(span["bbox"])
            assert page.rect.contains(box), f"Clipped text: {span['text']}"
            assert safe_text_area.contains(box), f"Text too close to paper edge: {span['text']}"
            assert span["color"] == 0 or (span["color"] >> 16 & 255) == (span["color"] >> 8 & 255) == (span["color"] & 255)
for drawing in page.get_drawings():
    for channel in ("color", "fill"):
        color = drawing.get(channel)
        # PyMuPDF's Gray-to-RGB conversion introduces tiny channel rounding differences.
        assert color is None or max(color) - min(color) < .001, "Unexpected vector color"
assert all(doc.extract_font(f[0])[3] for f in page.get_fonts()), "All fonts must be embedded"
pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), colorspace=fitz.csGRAY, alpha=False)
pix.save(HERE / "xorex-rules-preview.png")
report = {"pages": len(doc), "size_points": list(page.rect), "pdf_bytes": PDF.stat().st_size,
          "preview_dpi": 180, "preview_pixels": [pix.width, pix.height],
          "fonts": [{"name": f[3], "embedded": bool(doc.extract_font(f[0])[3])} for f in page.get_fonts()],
          "text_characters": len(page.get_text()), "text_within_page": True,
          "minimum_text_edge_clearance_points": 28, "vector_art_grayscale": True,
          "preview_colorspace": "grayscale"}
(HERE / "quality-checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
