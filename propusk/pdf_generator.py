"""
Генератор PDF пропусков
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from io import BytesIO
from datetime import datetime
from typing import Optional
import os

from models import Propusk


# Глобальная регистрация шрифтов при импорте модуля
def _register_fonts():
    """Регистрация шрифтов с кириллицей"""
    try:
        # Путь к локальным шрифтам
        current_dir = os.path.dirname(os.path.abspath(__file__))
        fonts_dir = os.path.join(current_dir, 'fonts')
        
        font_regular = os.path.join(fonts_dir, 'DejaVuSans.ttf')
        font_bold = os.path.join(fonts_dir, 'DejaVuSans-Bold.ttf')
        
        print(f"\n🔍 Ищу шрифты в: {fonts_dir}")
        print(f"   Regular: {os.path.exists(font_regular)}")
        print(f"   Bold: {os.path.exists(font_bold)}")
        
        if os.path.exists(font_regular) and os.path.exists(font_bold):
            # Регистрируем локальные шрифты
            pdfmetrics.registerFont(TTFont('DejaVu', font_regular))
            pdfmetrics.registerFont(TTFont('DejaVu-Bold', font_bold))
            print("✅ Шрифты DejaVu успешно зарегистрированы!\n")
            return True
        else:
            print("⚠️  Шрифты DejaVu не найдены!")
            print(f"   Путь: {fonts_dir}")
            print("   Запусти: python install_fonts.py\n")
            return False
    except Exception as e:
        print(f"❌ Ошибка регистрации шрифтов: {e}\n")
        return False


# Регистрируем шрифты сразу при импорте
_FONTS_AVAILABLE = _register_fonts()


class PropuskPDFGenerator:
    """
    Генератор PDF пропусков
    Размер пропуска: 90mm x 50mm (стандартный пропуск)
    """
    
    # Размеры пропуска
    WIDTH = 90 * mm
    HEIGHT = 50 * mm
    
    # Отступы
    MARGIN = 3 * mm
    
    @staticmethod
    def generate_propusk_pdf(propusk: Propusk, logo_path: Optional[str] = None, template_data: Optional[dict] = None) -> BytesIO:
        """
        Генерация PDF для одного пропуска
        
        Args:
            propusk: объект пропуска
            logo_path: путь к файлу логотипа (опционально)
            
        Returns:
            BytesIO: PDF файл в памяти
        """
        buffer = BytesIO()
        
        # Создаём PDF
        c = canvas.Canvas(buffer, pagesize=(PropuskPDFGenerator.WIDTH, PropuskPDFGenerator.HEIGHT))
        
        # Рисуем пропуск
        if template_data:
            PropuskPDFGenerator._draw_from_template(c, propusk, template_data)
        else:
            PropuskPDFGenerator._draw_propusk(c, propusk, logo_path)
        
        # Сохраняем
        c.save()
        buffer.seek(0)
        
        return buffer
    
    @staticmethod
    def generate_multiple_propusks_pdf(propusks: list, logo_path: Optional[str] = None, template_data: Optional[dict] = None) -> BytesIO:
        """
        Генерация PDF для нескольких пропусков (на одной странице A4 несколько пропусков)
        
        Args:
            propusks: список объектов пропусков
            logo_path: путь к файлу логотипа
            
        Returns:
            BytesIO: PDF файл в памяти
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Размещаем пропуска на листе A4 (210 × 297 mm)
        # Делаем 2 колонки × 5 рядов = 10 пропусков на лист с отступами
        
        # Отступы от краёв листа
        page_margin_x = 10 * mm
        page_margin_y = 10 * mm
        
        # Расстояние между пропусками
        spacing_x = 5 * mm
        spacing_y = 5 * mm
        
        # Ширина и высота пропуска
        propusk_width = PropuskPDFGenerator.WIDTH
        propusk_height = PropuskPDFGenerator.HEIGHT
        
        # Вычисляем позиции для 2 колонок
        col_0_x = page_margin_x
        col_1_x = page_margin_x + propusk_width + spacing_x
        
        # Вычисляем позиции для 5 рядов (сверху вниз)
        # A4 высота = 297mm
        row_positions = []
        start_y = 297*mm - page_margin_y - propusk_height
        for i in range(5):
            row_y = start_y - i * (propusk_height + spacing_y)
            row_positions.append(row_y)
        
        x_positions = [col_0_x, col_1_x]
        y_positions = row_positions
        
        propusk_count = 0
        page_count = 0
        
        for propusk in propusks:
            if propusk_count >= len(x_positions) * len(y_positions):
                # Новая страница
                c.showPage()
                propusk_count = 0
                page_count += 1
            
            row = propusk_count // len(x_positions)
            col = propusk_count % len(x_positions)
            
            x = x_positions[col]
            y = y_positions[row]
            
            # Сохраняем состояние
            c.saveState()
            
            # Перемещаемся к позиции
            c.translate(x, y)
            
            # Рисуем пропуск
            if template_data:
                PropuskPDFGenerator._draw_from_template(c, propusk, template_data)
            else:
                PropuskPDFGenerator._draw_propusk(c, propusk, logo_path)
            
            # Восстанавливаем состояние
            c.restoreState()
            
            propusk_count += 1
        
        c.save()
        buffer.seek(0)
        
        return buffer
    
    @staticmethod
    def _draw_propusk(c: canvas.Canvas, propusk: Propusk, logo_path: Optional[str] = None):
        """
        Отрисовка одного пропуска
        
        Макет пропуска (90x50mm):
        ┌────────────────────────────────┐
        │ [LOGO]  2025    Разрешение №   │
        │         На стоянку             │
        │         Марка А/М  MERCEDES    │
        │                                │
        │     С 530 ВР 797              │
        │                                │
        │ ООО "Лукавто"          М.п.   │
        └────────────────────────────────┘
        """
        width = PropuskPDFGenerator.WIDTH
        height = PropuskPDFGenerator.HEIGHT
        margin = PropuskPDFGenerator.MARGIN
        
        # Выбираем шрифт (с кириллицей если доступен)
        if _FONTS_AVAILABLE:
            font_regular = "DejaVu"
            font_bold = "DejaVu-Bold"
        else:
            # Fallback на стандартные шрифты (без кириллицы)
            font_regular = "Helvetica"
            font_bold = "Helvetica-Bold"
        
        # Рамка
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(1)
        c.rect(0, 0, width, height)
        
        # Логотип (если есть)
        if logo_path and os.path.exists(logo_path):
            try:
                logo_size = 12 * mm
                c.drawImage(logo_path, margin, height - margin - logo_size, 
                           width=logo_size, height=logo_size, preserveAspectRatio=True)
            except:
                pass  # Если ошибка с логотипом - продолжаем без него
        
        # Год (справа от логотипа)
        c.setFont(font_bold, 14)
        year = propusk.release_date.year
        c.drawString(margin + 15*mm, height - margin - 8*mm, str(year))
        
        # Номер пропуска (справа вверху)
        c.setFont(font_regular, 8)
        c.drawRightString(width - margin, height - margin - 3*mm, f"Разрешение № {propusk.id_propusk}")
        
        # "На стоянку"
        c.setFont(font_regular, 8)
        org = propusk.organization
        parking_text = "На стоянку"
        if org and org.free_mesto:
            parking_text = f"На стоянку (мест: {org.free_mesto})"
        c.drawString(margin + 15*mm, height - margin - 12*mm, parking_text)
        
        # Марка автомобиля
        c.setFont(font_regular, 8)
        mark_text = "Марка А/М"
        c.drawString(margin + 15*mm, height - margin - 16*mm, mark_text)
        
        mark_name = propusk.mark.mark_name if propusk.mark else "N/A"
        c.setFont(font_bold, 9)
        c.drawString(margin + 35*mm, height - margin - 16*mm, mark_name)
        
        # ГОС. НОМЕР (крупно по центру)
        c.setFont(font_bold, 18)
        gos_id = propusk.gos_id
        text_width = c.stringWidth(gos_id, font_bold, 18)
        c.drawString((width - text_width) / 2, height / 2 - 3*mm, gos_id)
        
        # Организация (внизу слева)
        c.setFont(font_regular, 7)
        org_name = org.org_name if org else "N/A"
        # Обрезаем если слишком длинное
        if len(org_name) > 30:
            org_name = org_name[:27] + "..."
        c.drawString(margin, margin + 3*mm, org_name)
        
        # "М.п." (место печати) - внизу справа
        c.setFont(font_regular, 7)
        c.drawRightString(width - margin, margin + 3*mm, "М.п.")
        
        # Срок действия (маленьким шрифтом внизу)
        c.setFont(font_regular, 6)
        valid_text = f"Действителен до: {propusk.valid_until.strftime('%d.%m.%Y')}"
        c.drawCentredString(width / 2, margin + 0.5*mm, valid_text)
    
    @staticmethod
    def get_filename(propusk: Propusk) -> str:
        """
        Генерация имени файла для пропуска
        """
        gos_clean = propusk.gos_id.replace(" ", "_").replace("/", "_")
        date_str = datetime.now().strftime("%Y%m%d")
        return f"propusk_{propusk.id_propusk}_{gos_clean}_{date_str}.pdf"
    @staticmethod
    def _draw_from_template(c: canvas.Canvas, propusk: Propusk, template: dict):
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

        meta = template.get("meta", {}) or {}
        year_mode = meta.get("year_mode", "release_date")
        year_value = meta.get("year_value")
        if year_mode == "fixed" and year_value:
            year_text = year_value
        else:
            year_text = propusk.release_date.year if propusk.release_date else ""

        data_map = {
            "gos_id": propusk.gos_id,
            "id_propusk": propusk.id_propusk,
            "mark_name": propusk.mark.mark_name if propusk.mark else "",
            "model_name": propusk.model.model_name if propusk.model else "",
            "org_name": propusk.organization.org_name if propusk.organization else "",
            "abonent_fio": propusk.abonent.full_name if propusk.abonent else "",
            "valid_until": propusk.valid_until.strftime("%d.%m.%Y") if propusk.valid_until else "",
            "release_date": propusk.release_date.strftime("%d.%m.%Y") if propusk.release_date else "",
            "year": year_text,
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
                        img = ImageReader(BytesIO(image_bytes))
                        c.drawImage(img, x, y_top - h_mm * mm, width=w_mm * mm, height=h_mm * mm, preserveAspectRatio=True)
                    except Exception:
                        pass
        return
