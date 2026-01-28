"""
PDF report generator for temporary passes.
"""
from reportlab.lib.pagesizes import A4
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


class TemporaryPassReportGenerator:
    @staticmethod
    def generate_report(groups: list, template_data: dict | None = None) -> BytesIO:
        buffer = BytesIO()
        page = (template_data or {}).get("page") or {}
        width_mm = page.get("width_mm", 297)
        height_mm = page.get("height_mm", 210)
        c = canvas.Canvas(buffer, pagesize=(width_mm * mm, height_mm * mm))

        if _FONTS_AVAILABLE:
            font_regular = "DejaVu"
            font_bold = "DejaVu-Bold"
        else:
            font_regular = "Helvetica"
            font_bold = "Helvetica-Bold"

        width = width_mm * mm
        height = height_mm * mm
        margin = 12 * mm
        row_height = 7 * mm
        start_y = height - margin - 20 * mm
        meta = (template_data or {}).get("meta") or {}
        table_x = float(meta.get("table_x_mm", 5)) * mm
        table_y = float(meta.get("table_y_mm", 40)) * mm
        table_w = float(meta.get("table_width_mm", width_mm - 10)) * mm
        table_h = float(meta.get("table_height_mm", height_mm - 60)) * mm
        row_height = float(meta.get("row_height_mm", 7)) * mm

        def _draw_template_elements():
            if not template_data:
                return
            elements = template_data.get("elements", [])
            for el in elements:
                etype = el.get("type")
                x_mm = float(el.get("x", 0) or 0)
                y_mm = float(el.get("y", 0) or 0)
                w_mm = float(el.get("width", 0) or 0)
                h_mm = float(el.get("height", 0) or 0)
                x = x_mm * mm
                y_top = height - y_mm * mm
                if etype in ("field", "text"):
                    value = el.get("text", "") if etype == "text" else {
                        "report_date": datetime.now().strftime("%d.%m.%Y %H:%M"),
                    }.get(el.get("field"), "")
                    font = el.get("font", font_regular)
                    if font not in ("DejaVu", "DejaVu-Bold", "Helvetica", "Helvetica-Bold"):
                        font = font_regular
                    if el.get("bold"):
                        font = font_bold
                    font_size = float(el.get("font_size", 10) or 10)
                    c.setFont(font, font_size)
                    y = y_top - font_size
                    align = el.get("align", "left")
                    if align == "center" and w_mm:
                        c.drawCentredString(x + (w_mm * mm) / 2, y, str(value))
                    elif align == "right" and w_mm:
                        c.drawRightString(x + (w_mm * mm), y, str(value))
                    else:
                        c.drawString(x, y, str(value))
                elif etype == "rect":
                    c.setLineWidth(float(el.get("stroke_width", 1) or 1))
                    c.rect(x, y_top - h_mm * mm, w_mm * mm, h_mm * mm, stroke=1, fill=0)

        def _truncate(value: str, max_len: int) -> str:
            if not value:
                return ""
            return value if len(value) <= max_len else value[: max_len - 3] + "..."

        def draw_header():
            c.setFont(font_bold, 12)
            c.drawString(
                margin,
                height - margin,
                "\u041e\u0442\u0447\u0435\u0442: \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u0430",
            )
            c.setFont(font_regular, 8)
            c.drawRightString(width - margin, height - margin, datetime.now().strftime("%d.%m.%Y %H:%M"))

            c.setFont(font_bold, 8)
            y = height - margin - 8 * mm
            c.drawString(margin, y, "ID")
            c.drawString(margin + 12 * mm, y, "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440")
            c.drawString(margin + 45 * mm, y, "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f")
            c.drawString(margin + 100 * mm, y, "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c")
            c.drawString(margin + 155 * mm, y, "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442")
            c.drawString(margin + 220 * mm, y, "\u0421\u0442\u0430\u0442\u0443\u0441")

        if template_data:
            _draw_template_elements()
        else:
            draw_header()
        c.setFont(font_regular, 8)
        y = height - (table_y * 1.0) - 6 * mm if template_data else start_y
        for group in groups:
            org_name = group.get("org_name") or "\u041d\u0435\u0442 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438"
            if y < margin + 20 * mm:
                c.showPage()
                draw_header()
                c.setFont(font_regular, 8)
                y = start_y

            for item in group.get("items", []):
                if y < margin + 15 * mm:
                    c.showPage()
                    draw_header()
                    c.setFont(font_regular, 8)
                    y = start_y

                valid_from = item.valid_from.astimezone().strftime("%d.%m.%Y %H:%M") if item.valid_from else ""
                valid_until = item.valid_until.astimezone().strftime("%d.%m.%Y %H:%M") if item.valid_until else ""
                valid_period = f"{valid_from} - {valid_until}".strip(" -")
                status = "\u0410\u043d\u043d\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u043d" if item.revoked_at else "\u0410\u043a\u0442\u0438\u0432\u0435\u043d"
                creator_name = ""
                if getattr(item, "creator", None) and item.creator.full_name:
                    creator_name = item.creator.full_name
                elif getattr(item, "created_by", None):
                    creator_name = str(item.created_by)

                base_x = table_x if template_data else margin
                c.drawString(base_x, y, str(item.id))
                c.drawString(base_x + 12 * mm, y, _truncate(creator_name, 12))
                c.drawString(base_x + 45 * mm, y, _truncate(org_name, 28))
                c.drawString(base_x + 100 * mm, y, _truncate(item.gos_id or "", 22))
                c.drawString(base_x + 155 * mm, y, _truncate(valid_period, 28))
                c.drawString(base_x + 220 * mm, y, status)
                y -= row_height

        c.save()
        buffer.seek(0)
        return buffer


