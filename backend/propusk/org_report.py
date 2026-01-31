from io import BytesIO
from datetime import datetime
from typing import List, Optional

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

from models import Propusk
from propusk.pdf_generator import _FONTS_AVAILABLE

DEFAULT_REPORT_TEMPLATE = {
    "page": {"width_mm": 297, "height_mm": 210},
    "grid_mm": 5,
    "meta": {},
    "elements": [
        {
            "id": "r_header_bg",
            "type": "rect",
            "x": 5,
            "y": 5,
            "width": 287,
            "height": 10,
            "stroke": "#2f2f2f",
            "stroke_width": 1,
            "fill": "#e1e6ec",
        },
        {
            "id": "r_header_text",
            "type": "text",
            "x": 7,
            "y": 7,
            "width": 90,
            "height": 6,
            "text": "Отчет по организации",
            "font_size": 10,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_owner_label",
            "type": "text",
            "x": 5,
            "y": 18,
            "width": 35,
            "height": 6,
            "text": "Организация",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_owner_value",
            "type": "field",
            "x": 40,
            "y": 18,
            "width": 252,
            "height": 6,
            "field": "org_name",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_free_label",
            "type": "text",
            "x": 5,
            "y": 25,
            "width": 35,
            "height": 6,
            "text": "Гостевых мест",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_free_value",
            "type": "field",
            "x": 40,
            "y": 25,
            "width": 20,
            "height": 6,
            "field": "free_mesto",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_perm_label",
            "type": "text",
            "x": 5,
            "y": 32,
            "width": 35,
            "height": 6,
            "text": "Постоянных мест",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_perm_value",
            "type": "field",
            "x": 40,
            "y": 32,
            "width": 20,
            "height": 6,
            "field": "permanent_count",
            "font_size": 8,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_table_header_bg",
            "type": "rect",
            "x": 5,
            "y": 40,
            "width": 287,
            "height": 8,
            "stroke": "#2f2f2f",
            "stroke_width": 1,
            "fill": "#ededed",
        },
        {
            "id": "r_table_body",
            "type": "rect",
            "x": 5,
            "y": 48,
            "width": 287,
            "height": 120,
            "stroke": "#2f2f2f",
            "stroke_width": 1,
            "fill": "",
        },
        {
            "id": "r_th_num",
            "type": "text",
            "x": 7,
            "y": 41,
            "width": 20,
            "height": 6,
            "text": "№ пропуска",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_th_mark",
            "type": "text",
            "x": 30,
            "y": 41,
            "width": 25,
            "height": 6,
            "text": "Марка а/м",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_th_gos",
            "type": "text",
            "x": 60,
            "y": 41,
            "width": 30,
            "height": 6,
            "text": "Госномер а/м",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_th_fio",
            "type": "text",
            "x": 95,
            "y": 41,
            "width": 60,
            "height": 6,
            "text": "ФИО",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_th_info",
            "type": "text",
            "x": 165,
            "y": 41,
            "width": 70,
            "height": 6,
            "text": "Примечание",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
        {
            "id": "r_th_sign",
            "type": "text",
            "x": 245,
            "y": 41,
            "width": 40,
            "height": 6,
            "text": "Подпись",
            "font_size": 7,
            "align": "left",
            "color": "#111827",
        },
    ],
}


def _parse_color(value, default=(0, 0, 0)):
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


def _get_fonts():
    if _FONTS_AVAILABLE:
        return "DejaVu", "DejaVu-Bold"
    return "Helvetica", "Helvetica-Bold"


def _draw_elements(c, elements, data_map, page_width, page_height, font_regular, font_bold):
    for el in elements:
        etype = el.get("type")
        x_mm = float(el.get("x", 0) or 0)
        y_mm = float(el.get("y", 0) or 0)
        w_mm = float(el.get("width", 0) or 0)
        h_mm = float(el.get("height", 0) or 0)
        x = x_mm * mm
        y_top = page_height - y_mm * mm

        if etype in ("field", "text"):
            value = el.get("text", "") if etype == "text" else data_map.get(el.get("field"), "")
            font = el.get("font", font_regular)
            if font not in ("DejaVu", "DejaVu-Bold", "Helvetica", "Helvetica-Bold"):
                font = font_regular
            if el.get("bold"):
                font = font_bold
            font_size = float(el.get("font_size", 10) or 10)
            r, g, b = _parse_color(el.get("color"))
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
            r, g, b = _parse_color(el.get("stroke"))
            c.setStrokeColorRGB(r, g, b)
            c.setLineWidth(float(el.get("stroke_width", 1) or 1))
            x2_mm = el.get("x2")
            y2_mm = el.get("y2")
            if x2_mm is not None and y2_mm is not None:
                x2 = float(x2_mm) * mm
                y2 = page_height - float(y2_mm) * mm
            else:
                x2 = x + w_mm * mm
                y2 = y_top - h_mm * mm
            c.line(x, y_top, x2, y2)
            continue

        if etype == "rect":
            r, g, b = _parse_color(el.get("stroke"))
            c.setStrokeColorRGB(r, g, b)
            c.setLineWidth(float(el.get("stroke_width", 1) or 1))
            fill = el.get("fill")
            if fill:
                fr, fg, fb = _parse_color(fill)
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
                    from reportlab.lib.utils import ImageReader

                    header, encoded = data_url.split(",", 1)
                    image_bytes = base64.b64decode(encoded)
                    img = ImageReader(BytesIO(image_bytes))
                    c.drawImage(
                        img,
                        x,
                        y_top - h_mm * mm,
                        width=w_mm * mm,
                        height=h_mm * mm,
                        preserveAspectRatio=True,
                    )
                except Exception:
                    pass


def _find_table_body(elements):
    for el in elements:
        if el.get("id") == "r_table_body":
            return el
    for el in elements:
        if el.get("type") == "table_body":
            return el
    return None


def _draw_table(c, propusks, table_rect, page_height, font_regular, font_bold):
    if not table_rect:
        return

    x_mm = float(table_rect.get("x", 5) or 5)
    y_mm = float(table_rect.get("y", 48) or 48)
    w_mm = float(table_rect.get("width", 287) or 287)
    h_mm = float(table_rect.get("height", 120) or 120)

    x = x_mm * mm
    y_top = page_height - y_mm * mm

    base_cols = [22, 30, 35, 70, 80, 50]
    total = sum(base_cols)
    scale = w_mm / total if total else 1
    cols = [c * scale for c in base_cols]
    col_positions = [x]
    for width in cols:
        col_positions.append(col_positions[-1] + width * mm)

    row_height_mm = 7
    rows_per_page = int(h_mm // row_height_mm)
    if rows_per_page <= 0:
        return

    def draw_grid(lines_count):
        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        c.setLineWidth(0.4)
        bottom = y_top - h_mm * mm
        for pos in col_positions:
            c.line(pos, y_top, pos, bottom)
        for i in range(lines_count + 1):
            y = y_top - i * row_height_mm * mm
            c.line(x, y, x + w_mm * mm, y)

    if not propusks:
        draw_grid(1)
        c.setFont(font_regular, 8)
        c.setFillColorRGB(0, 0, 0)
        c.drawCentredString(x + (w_mm * mm) / 2, y_top - 5 * mm, "Нет данных")
        return

    rows = propusks[:rows_per_page]
    draw_grid(len(rows))

    c.setFont(font_regular, 7.5)
    c.setFillColorRGB(0, 0, 0)
    for idx, p in enumerate(rows):
        y = y_top - (idx + 1) * row_height_mm * mm + 2.5 * mm
        values = [
            str(p.id_propusk),
            p.mark.mark_name if p.mark else "",
            p.gos_id,
            p.abonent.full_name if p.abonent else "",
            p.info or "",
            "",
        ]
        for col_idx, val in enumerate(values):
            x_text = col_positions[col_idx] + 1.2 * mm
            c.drawString(x_text, y, str(val))


def _render_report_page(c, template, data_map, propusks_page):
    page = template.get("page", {}) if template else {}
    page_width = float(page.get("width_mm", 297) or 297) * mm
    page_height = float(page.get("height_mm", 210) or 210) * mm

    font_regular, font_bold = _get_fonts()
    elements = (template or {}).get("elements") or DEFAULT_REPORT_TEMPLATE["elements"]

    _draw_elements(c, elements, data_map, page_width, page_height, font_regular, font_bold)
    table_rect = _find_table_body(elements) or _find_table_body(DEFAULT_REPORT_TEMPLATE["elements"])
    _draw_table(c, propusks_page, table_rect, page_height, font_regular, font_bold)


def _split_pages(propusks, rows_per_page):
    for i in range(0, len(propusks), rows_per_page):
        yield propusks[i : i + rows_per_page]


def generate_org_report(
    org_name: str,
    free_mesto: int,
    permanent_count: int,
    propusks: List[Propusk],
    template_data: Optional[dict] = None,
) -> BytesIO:
    buffer = BytesIO()
    page = (template_data or {}).get("page") or DEFAULT_REPORT_TEMPLATE["page"]
    page_width = float(page.get("width_mm", 297) or 297) * mm
    page_height = float(page.get("height_mm", 210) or 210) * mm

    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

    rows_per_page = int(float((template_data or {}).get("table_rows", 15) or 15))
    rows_per_page = max(rows_per_page, 1)

    data_map = {
        "org_name": org_name,
        "free_mesto": free_mesto,
        "permanent_count": permanent_count,
        "report_date": datetime.now().strftime("%d.%m.%Y"),
    }

    pages = list(_split_pages(propusks, rows_per_page)) or [[]]
    for idx, page_rows in enumerate(pages):
        _render_report_page(c, template_data or DEFAULT_REPORT_TEMPLATE, data_map, page_rows)
        if idx < len(pages) - 1:
            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer


def generate_all_orgs_report(org_items: list, template_data: Optional[dict] = None) -> BytesIO:
    buffer = BytesIO()
    page = (template_data or {}).get("page") or DEFAULT_REPORT_TEMPLATE["page"]
    page_width = float(page.get("width_mm", 297) or 297) * mm
    page_height = float(page.get("height_mm", 210) or 210) * mm

    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))
    rows_per_page = int(float((template_data or {}).get("table_rows", 15) or 15))
    rows_per_page = max(rows_per_page, 1)

    for idx, item in enumerate(org_items):
        data_map = {
            "org_name": item.get("org_name", ""),
            "free_mesto": item.get("free_mesto", 0),
            "permanent_count": item.get("permanent_count", 0),
            "report_date": datetime.now().strftime("%d.%m.%Y"),
        }
        propusks = item.get("propusks", [])
        pages = list(_split_pages(propusks, rows_per_page)) or [[]]
        for page_idx, page_rows in enumerate(pages):
            _render_report_page(c, template_data or DEFAULT_REPORT_TEMPLATE, data_map, page_rows)
            if page_idx < len(pages) - 1 or idx < len(org_items) - 1:
                c.showPage()

    c.save()
    buffer.seek(0)
    return buffer
