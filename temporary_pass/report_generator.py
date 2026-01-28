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

        def _get_header_bottom_mm():
            if not template_data:
                return None
            elements = template_data.get("elements", [])
            for el in elements:
                if el.get("id") == "tr_line_header_bottom":
                    return float(el.get("y", 0) or 0)
            return None

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
            c.drawString(margin + 10 * mm, y, "\u0421\u043e\u0437\u0434\u0430\u043b")
            c.drawString(margin + 40 * mm, y, "\u0417\u0430\u0435\u0437\u0434")
            c.drawString(margin + 70 * mm, y, "\u0412\u044b\u0435\u0437\u0434")
            c.drawString(margin + 100 * mm, y, "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440")
            c.drawString(margin + 128 * mm, y, "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f")
            c.drawString(margin + 183 * mm, y, "\u0412\u0440\u0435\u043c\u044f \u0437\u0430\u0435\u0437\u0434\u0430")
            c.drawString(margin + 235 * mm, y, "\u0412\u0440\u0435\u043c\u044f \u0432\u044b\u0435\u0437\u0434\u0430")

        if template_data:
            _draw_template_elements()
        else:
            draw_header()
        row_font_size = 7 if template_data else 8
        c.setFont(font_regular, row_font_size)
        header_bottom_mm = _get_header_bottom_mm()
        row_offset_x_mm = float(meta.get("row_offset_x_mm", 5))
        row_offset_y_mm = float(meta.get("row_offset_y_mm", 5))
        if template_data and header_bottom_mm:
            row_text_offset_mm = max(2.5, float(meta.get("row_text_offset_mm", 2.5)))
            y = height - (header_bottom_mm + row_text_offset_mm + row_offset_y_mm) * mm
        else:
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

                entered_at = item.entered_at.astimezone().strftime("%d.%m.%Y %H:%M") if item.entered_at else ""
                exited_at = item.exited_at.astimezone().strftime("%d.%m.%Y %H:%M") if item.exited_at else ""
                creator_name = ""
                if getattr(item, "creator", None) and item.creator.full_name:
                    creator_name = item.creator.full_name
                elif getattr(item, "created_by", None):
                    creator_name = str(item.created_by)
                enter_name = ""
                if getattr(item, "enterer", None) and item.enterer.full_name:
                    enter_name = item.enterer.full_name
                elif getattr(item, "entered_by", None):
                    enter_name = str(item.entered_by)
                exit_name = ""
                if getattr(item, "exiter", None) and item.exiter.full_name:
                    exit_name = item.exiter.full_name
                elif getattr(item, "exited_by", None):
                    exit_name = str(item.exited_by)

                base_x = (table_x + row_offset_x_mm * mm) if template_data else margin
                c.drawString(base_x, y, str(item.id))
                c.drawString(base_x + 10 * mm, y, _truncate(creator_name, 12))
                c.drawString(base_x + 40 * mm, y, _truncate(enter_name, 12))
                c.drawString(base_x + 70 * mm, y, _truncate(exit_name, 12))
                c.drawString(base_x + 100 * mm, y, _truncate(item.gos_id or "", 16))
                c.drawString(base_x + 128 * mm, y, _truncate(org_name, 24))
                c.drawString(base_x + 183 * mm, y, _truncate(entered_at, 16))
                c.drawString(base_x + 235 * mm, y, _truncate(exited_at, 16))
                y -= row_height

        c.save()
        buffer.seek(0)
        return buffer


