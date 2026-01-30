"""
PDF generator for temporary passes.
"""
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from datetime import datetime
import os


def _register_fonts():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        fonts_dir = os.path.join(os.path.dirname(current_dir), "propusk", "fonts")
        font_regular = os.path.join(fonts_dir, "DejaVuSans.ttf")
        font_bold = os.path.join(fonts_dir, "DejaVuSans-Bold.ttf")
        if os.path.exists(font_regular) and os.path.exists(font_bold):
            pdfmetrics.registerFont(TTFont("DejaVu", font_regular))
            pdfmetrics.registerFont(TTFont("DejaVu-Bold", font_bold))
            return True
    except Exception:
        return False
    return False


_FONTS_AVAILABLE = _register_fonts()


class TemporaryPassPDFGenerator:
    WIDTH = 90 * mm
    HEIGHT = 50 * mm
    MARGIN = 3 * mm

    @staticmethod
    def generate_pdf(temp_pass, template_data: dict | None = None) -> BytesIO:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(TemporaryPassPDFGenerator.WIDTH, TemporaryPassPDFGenerator.HEIGHT))
        if template_data:
            TemporaryPassPDFGenerator._draw_from_template(c, temp_pass, template_data)
        else:
            TemporaryPassPDFGenerator._draw(c, temp_pass)
        c.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw(c: canvas.Canvas, temp_pass) -> None:
        width = TemporaryPassPDFGenerator.WIDTH
        height = TemporaryPassPDFGenerator.HEIGHT
        margin = TemporaryPassPDFGenerator.MARGIN

        if _FONTS_AVAILABLE:
            font_regular = "DejaVu"
            font_bold = "DejaVu-Bold"
        else:
            font_regular = "Helvetica"
            font_bold = "Helvetica-Bold"

        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(1)
        c.rect(0, 0, width, height)

        c.setFont(font_bold, 10)
        c.drawString(margin, height - margin - 6 * mm, "Временный пропуск")

        c.setFont(font_regular, 8)
        org_name = temp_pass.organization.org_name if temp_pass.organization else ""
        if len(org_name) > 32:
            org_name = org_name[:29] + "..."
        c.drawString(margin, height - margin - 12 * mm, org_name)

        c.setFont(font_bold, 18)
        gos_id = temp_pass.gos_id
        text_width = c.stringWidth(gos_id, font_bold, 18)
        c.drawString((width - text_width) / 2, height / 2 - 3 * mm, gos_id)

        c.setFont(font_regular, 7)
        valid_from = TemporaryPassPDFGenerator._fmt_dt(temp_pass.valid_from)
        valid_until = TemporaryPassPDFGenerator._fmt_dt(temp_pass.valid_until)
        c.drawString(margin, margin + 7 * mm, f"С: {valid_from}")
        c.drawString(margin, margin + 3 * mm, f"До: {valid_until}")

        if temp_pass.phone:
            c.drawRightString(width - margin, margin + 3 * mm, f"Тел: {temp_pass.phone}")

        entered = TemporaryPassPDFGenerator._fmt_dt(temp_pass.entered_at, time_only=True)
        exited = TemporaryPassPDFGenerator._fmt_dt(temp_pass.exited_at, time_only=True)
        c.setFont(font_regular, 7)
        if entered:
            c.drawRightString(width - margin, height - margin - 12 * mm, f"Заехал: {entered}")
        if exited:
            c.drawRightString(width - margin, height - margin - 16 * mm, f"Выехал: {exited}")

    @staticmethod
    def get_filename(temp_pass) -> str:
        gos_clean = temp_pass.gos_id.replace(" ", "_").replace("/", "_")
        date_str = datetime.now().strftime("%Y%m%d")
        return f"temporary_pass_{temp_pass.id}_{gos_clean}_{date_str}.pdf"

    @staticmethod
    def _fmt_dt(value, time_only: bool = False) -> str:
        if not value:
            return ""
        dt = value.astimezone() if value.tzinfo else value
        if time_only:
            return dt.strftime("%H:%M")
        return dt.strftime("%d.%m.%Y %H:%M")

    @staticmethod
    def _draw_from_template(c: canvas.Canvas, temp_pass, template: dict):
        width_mm = template.get("page", {}).get("width_mm", 90)
        height_mm = template.get("page", {}).get("height_mm", 50)
        width = width_mm * mm
        height = height_mm * mm

        if _FONTS_AVAILABLE:
            font_regular = "DejaVu"
            font_bold = "DejaVu-Bold"
        else:
            font_regular = "Helvetica"
            font_bold = "Helvetica-Bold"

        data_map = {
            "user_name": temp_pass.creator.full_name if temp_pass.creator else "",
            "org_name": temp_pass.organization.org_name if temp_pass.organization else "",
            "gos_id": temp_pass.gos_id or "",
            "phone": temp_pass.phone or "",
            "comment": temp_pass.comment or "",
            "entered_at": TemporaryPassPDFGenerator._fmt_dt(temp_pass.entered_at),
            "exited_at": TemporaryPassPDFGenerator._fmt_dt(temp_pass.exited_at),
            "created_at": TemporaryPassPDFGenerator._fmt_dt(temp_pass.created_at),
        }

        def parse_color(value, default=(0, 0, 0)):
            if not value:
                return default
            if isinstance(value, (list, tuple)) and len(value) == 3:
                return tuple(value)
            if isinstance(value, str) and value.startswith("#") and len(value) == 7:
                r = int(value[1:3], 16) / 255.0
                g = int(value[3:5], 16) / 255.0
                b = int(value[5:7], 16) / 255.0
                return (r, g, b)
            return default

        elements = template.get("elements", [])
        for el in elements:
            etype = el.get("type")
            x_mm = float(el.get("x", 0) or 0)
            y_mm = float(el.get("y", 0) or 0)
            w_mm = float(el.get("width", 0) or 0)
            h_mm = float(el.get("height", 0) or 0)
            x = x_mm * mm
            y_top = height - y_mm * mm

            if etype in ("field", "text"):
                value = el.get("text", "") if etype == "text" else data_map.get(el.get("field"), "")
                font = el.get("font", font_regular)
                if font not in ("DejaVu", "DejaVu-Bold", "Helvetica", "Helvetica-Bold"):
                    font = font_regular
                if el.get("bold"):
                    font = font_bold
                font_size = float(el.get("font_size", 10) or 10)
                r, g, b = parse_color(el.get("color"))
                c.setFillColorRGB(r, g, b)
                c.setFont(font, font_size)
                y = y_top - font_size
                align = el.get("align", "left")
                if align == "center" and w_mm:
                    c.drawCentredString(x + (w_mm * mm) / 2, y, str(value))
                elif align == "right" and w_mm:
                    c.drawRightString(x + (w_mm * mm), y, str(value))
                else:
                    c.drawString(x, y, str(value))
                continue

            if etype == "line":
                r, g, b = parse_color(el.get("stroke"))
                c.setStrokeColorRGB(r, g, b)
                c.setLineWidth(float(el.get("stroke_width", 1) or 1))
                x2_mm = el.get("x2")
                y2_mm = el.get("y2")
                if x2_mm is not None and y2_mm is not None:
                    x2 = float(x2_mm) * mm
                    y2 = height - float(y2_mm) * mm
                else:
                    x2 = x + w_mm * mm
                    y2 = y_top - h_mm * mm
                c.line(x, y_top, x2, y2)
                continue

            if etype == "rect":
                r, g, b = parse_color(el.get("stroke"))
                c.setStrokeColorRGB(r, g, b)
                c.setLineWidth(float(el.get("stroke_width", 1) or 1))
                fill = el.get("fill")
                if fill:
                    fr, fg, fb = parse_color(fill)
                    c.setFillColorRGB(fr, fg, fb)
                    fill_flag = 1
                else:
                    fill_flag = 0
                c.rect(x, y_top - h_mm * mm, w_mm * mm, h_mm * mm, stroke=1, fill=fill_flag)
                continue

            if etype == "logo":
                data_url = el.get("data_url")
                if data_url:
                    try:
                        import base64
                        header, encoded = data_url.split(",", 1)
                        image_bytes = base64.b64decode(encoded)
                        from reportlab.lib.utils import ImageReader
                        img = ImageReader(BytesIO(image_bytes))
                        c.drawImage(img, x, y_top - h_mm * mm, width=w_mm * mm, height=h_mm * mm, preserveAspectRatio=True)
                    except Exception:
                        pass
        return
