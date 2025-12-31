from io import BytesIO
from datetime import datetime
from typing import List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph, SimpleDocTemplate, Spacer
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle

from models import Propusk
from propusk.pdf_generator import _FONTS_AVAILABLE


def generate_org_report(org_name: str, propusks: List[Propusk]) -> BytesIO:
    """
    Формирует PDF-отчёт по пропускам организации (табличный вид).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    if _FONTS_AVAILABLE:
        base_font = "DejaVu"
        bold_font = "DejaVu-Bold"
    else:
        base_font = "Helvetica"
        bold_font = "Helvetica-Bold"

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName=bold_font,
        fontSize=16,
        leading=20,
    )
    cell_style = ParagraphStyle(
        "Cell",
        fontName=base_font,
        fontSize=9,
        leading=11,
        alignment=TA_LEFT,
    )
    header_style = ParagraphStyle(
        "Header",
        fontName=bold_font,
        fontSize=9,
        leading=11,
    )

    story = []
    story.append(Paragraph("Сведения о парковке", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Владелец: {org_name or '—'}", cell_style))
    story.append(Spacer(1, 4))

    data = [
        [
            Paragraph("№ Разрешения", header_style),
            Paragraph("Марка", header_style),
            Paragraph("ГосНомер А/М", header_style),
            Paragraph("ФИО", header_style),
            Paragraph("Информация", header_style),
            Paragraph("Подпись", header_style),
        ]
    ]

    for p in propusks:
        data.append(
            [
                str(p.id_propusk),
                p.mark.mark_name if p.mark else "",
                p.gos_id,
                p.abonent.full_name if p.abonent else "",
                p.info or "",
                "",
            ] # type: ignore
        )

    table = Table(
        data,
        colWidths=[22 * mm, 24 * mm, 28 * mm, 45 * mm, 40 * mm, 25 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, 0), bold_font),
                ("FONT", (0, 1), (-1, -1), base_font),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )

    story.append(table)
    story.append(Spacer(1, 8))
    story.append(Paragraph(datetime.now().strftime("%d.%m.%Y"), cell_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
