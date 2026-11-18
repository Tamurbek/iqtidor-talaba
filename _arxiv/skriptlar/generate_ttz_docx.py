# -*- coding: utf-8 -*-
"""
O'zbekiston Milliy universiteti Jizzax filiali
"Iqtidorli talabalar axborot-tahliliy portali va elektron reyting tizimi"
Dasturiy majmuasi bo'yicha to'laqonli Texnik Topshiriq (TTZ) Word (.docx) generatori.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_ttz_document(output_filename="Iqtidorli_Talabalar_Portali_Texnik_Topshiriq_TTZ.docx"):
    doc = docx.Document()
    
    # 1. Sahifa o'lchamlari va chetlari (A4, standart chetki masofalar: chap 3cm, o'ng 1.5cm, yuqori/pastki 2cm)
    sections = doc.sections
    for section in sections:
        section.page_width = Inches(8.27)   # A4 kengligi
        section.page_height = Inches(11.69) # A4 balandligi
        section.top_margin = Inches(0.79)   # 2 cm
        section.bottom_margin = Inches(0.79)# 2 cm
        section.left_margin = Inches(1.18)  # 3 cm
        section.right_margin = Inches(0.59) # 1.5 cm
        
        # Kolontitul sozlamalari
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Mirzo Ulug'bek nomidagi O'zMU Jizzax filiali | \"Iqtidorli talabalar\" portali TTZ — 2026")
        f_run.font.name = "Calibri"
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        
        header = section.header
        h_p = header.paragraphs[0]
        h_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        h_run = h_p.add_run("TEXNIK TOPSHIRIQ (TTZ) • O'zDSt 34.602-89 STANDARTI ASOSIDA")
        h_run.font.name = "Calibri"
        h_run.font.size = Pt(8)
        h_run.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # Ranglar palitrasi (Professional Corporate Blue & Slate)
    COLOR_PRIMARY = RGBColor(0x1E, 0x3A, 0x8A)    # Deep Navy Blue
    COLOR_SECONDARY = RGBColor(0x02, 0x84, 0xC7)  # Sky Blue
    COLOR_DARK = RGBColor(0x0F, 0x17, 0x2A)       # Slate Dark 900
    COLOR_TEXT = RGBColor(0x33, 0x41, 0x55)       # Slate Gray 700
    HEX_HEADER = "1E3A8A"
    HEX_ALT_ROW = "F8FAFC"
    HEX_BORDER = "CBD5E1"

    def set_cell_background(cell, color_hex):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_cell_borders(cell, top=None, bottom=None, left=None, right=None, color=HEX_BORDER, sz="4"):
        tcPr = cell._tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
        for b_name, b_val in borders.items():
            if b_val:
                node = OxmlElement(f'w:{b_name}')
                node.set(qn('w:val'), 'single')
                node.set(qn('w:sz'), sz)
                node.set(qn('w:space'), '0')
                node.set(qn('w:color'), color)
                tcBorders.append(node)
        tcPr.append(tcBorders)

    def add_callout(text, title="MUHIM QAYD:", border_color="1E3A8A", bg_color="F0F7FF"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.5)
        
        c = tbl.cell(0, 0)
        set_cell_background(c, bg_color)
        set_cell_margins(c, top=140, bottom=140, left=180, right=140)
        set_cell_borders(c, left=True, color=border_color, sz="24")
        
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        
        r1 = p.add_run(f"📌 {title} ")
        r1.bold = True
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        r1.font.color.rgb = COLOR_PRIMARY
        
        r2 = p.add_run(text)
        r2.font.name = "Calibri"
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = COLOR_TEXT
        
        p_sp = doc.add_paragraph()
        p_sp.paragraph_format.space_before = Pt(0)
        p_sp.paragraph_format.space_after = Pt(4)

    def format_table(tbl, col_widths=None):
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        
        for r_idx, row in enumerate(tbl.rows):
            trPr = row._tr.get_or_add_trPr()
            if r_idx == 0:
                trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            
            for c_idx, cell in enumerate(row.cells):
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                set_cell_margins(cell, top=110, bottom=110, left=130, right=130)
                if col_widths and c_idx < len(col_widths):
                    cell.width = col_widths[c_idx]
                
                if r_idx == 0:
                    set_cell_background(cell, HEX_HEADER)
                    set_cell_borders(cell, top=True, bottom=True, left=True, right=True, color="0F172A", sz="8")
                    for p in cell.paragraphs:
                        p.paragraph_format.space_before = Pt(0)
                        p.paragraph_format.space_after = Pt(0)
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        for r in p.runs:
                            r.bold = True
                            r.font.name = "Calibri"
                            r.font.size = Pt(9.5)
                            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                else:
                    bg = HEX_ALT_ROW if r_idx % 2 == 1 else "FFFFFF"
                    set_cell_background(cell, bg)
                    set_cell_borders(cell, top=True, bottom=True, left=True, right=True, color=HEX_BORDER, sz="4")
                    for p in cell.paragraphs:
                        p.paragraph_format.space_before = Pt(0)
                        p.paragraph_format.space_after = Pt(0)
                        for r in p.runs:
                            r.font.name = "Calibri"
                            r.font.size = Pt(9)
                            r.font.color.rgb = COLOR_TEXT

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.color.rgb = COLOR_SECONDARY
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(10.5)
        run.font.color.rgb = COLOR_DARK
        return p

    def add_p(text, bold_prefix=None, space_after=5):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = "Calibri"
            r_pre.font.size = Pt(10)
            r_pre.font.color.rgb = COLOR_DARK
            
        r_text = p.add_run(text)
        r_text.font.name = "Calibri"
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_TEXT
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = "Calibri"
            r_pre.font.size = Pt(10)
            r_pre.font.color.rgb = COLOR_DARK
            
        r_text = p.add_run(text)
        r_text.font.name = "Calibri"
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_TEXT
        return p

    # =========================================================================
    # TITUL SAHIFASI (COVER PAGE)
    # =========================================================================
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_after = Pt(2)
    r_h1 = p_head.add_run("O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI\n")
    r_h1.bold = True
    r_h1.font.name = "Calibri"
    r_h1.font.size = Pt(10)
    r_h1.font.color.rgb = COLOR_DARK
    
    r_h2 = p_head.add_run("MIRZO ULUG'BEK NOMIDAGI O'ZBEKISTON MILLIY UNIVERSITETI JIZZAX FILIALI\n")
    r_h2.bold = True
    r_h2.font.name = "Calibri"
    r_h2.font.size = Pt(11)
    r_h2.font.color.rgb = COLOR_PRIMARY

    # Tasdiqlash bloklari jadvali
    t_app = doc.add_table(rows=1, cols=2)
    t_app.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_app.columns[0].width = Inches(3.25)
    t_app.columns[1].width = Inches(3.25)
    
    c_left = t_app.cell(0, 0)
    c_right = t_app.cell(0, 1)
    set_cell_borders(c_left)
    set_cell_borders(c_right)
    
    p_cl = c_left.paragraphs[0]
    p_cl.paragraph_format.line_spacing = 1.15
    p_cl.add_run("“KELISHILGAN”\n").bold = True
    p_cl.add_run("Ilmiy ishlar va innovatsiyalar\nbo'yicha direktor o'rinbosari\n__________ dots. N.A. Alimov\n“____” _____________ 2026-yil")
    for r in p_cl.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        
    p_cr = c_right.paragraphs[0]
    p_cr.paragraph_format.line_spacing = 1.15
    p_cr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_cr.add_run("“TASDIQLAYMAN”\n").bold = True
    p_cr.add_run("Mirzo Ulug'bek nomidagi O'zMU\nJizzax filiali direktori\n__________ prof. O.X. Turakulov\n“____” _____________ 2026-yil")
    for r in p_cr.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(28)

    # Hujjat nomi va bosh sarlavhasi
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(8)
    r_main_t = p_title.add_run("TEXNIK TOPSHIRIQ\n(ТЗ / SPECIFICATION)\n")
    r_main_t.bold = True
    r_main_t.font.name = "Calibri"
    r_main_t.font.size = Pt(18)
    r_main_t.font.color.rgb = COLOR_PRIMARY
    
    r_sub_t = p_title.add_run("«IQTIDORLI TALABALARNING ILMIY-TADQIQOT FAOLIYATINI TASHKIL ETISH VA REYTINGINI BAHOLASH AXBOROT-TAHLILIY PORTALI»\nDASTURIY MAJMUASINI YARATISH BO'YICHA")
    r_sub_t.bold = True
    r_sub_t.font.name = "Calibri"
    r_sub_t.font.size = Pt(13)
    r_sub_t.font.color.rgb = COLOR_DARK

    p_doc_id = doc.add_paragraph()
    p_doc_id.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_doc_id.paragraph_format.space_after = Pt(20)
    r_id = p_doc_id.add_run("Hujjat kodi: TTZ-JBNUU-IQTIDOR-2026-V1.0\nDavlat standarti: O'zDSt 34.602-89 talablari asosida ishlab chiqilgan")
    r_id.font.name = "Calibri"
    r_id.font.size = Pt(9.5)
    r_id.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Hujjat pasporti jadvali
    t_pass = doc.add_table(rows=7, cols=2)
    format_table(t_pass, col_widths=[Inches(2.2), Inches(4.3)])
    
    passport_data = [
        ("Parametr / Rekvizit", "Tavsif va Ko'rsatkichlar"),
        ("Tizimning to'liq nomi:", "Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali iqtidorli talabalar axborot-tahliliy portali va elektron reyting tizimi"),
        ("Qisqartirilgan nomi:", "«Iqtidorli talabalar» portali (JBNUU Iqtidor Portal)"),
        ("Buyurtmachi tashkilot:", "O'zMU Jizzax filiali «Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi»"),
        ("Asosiy me'yoriy hujjat:", "Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali Kengashining 2026-yil 6-iyuldagi 11-sonli bayonnomasi bilan ma'qullangan «Iqtidor» tanlovi Nizomi"),
        ("Tizimning versiyasi va turi:", "Versiya 1.0 (Web-platforma, REST API, SPA/SSR gibrid boshqaruv majmuasi)"),
        ("Ishlab chiqilgan yili:", "Jizzax shahri, 2026-yil")
    ]
    for r_i, (k, v) in enumerate(passport_data):
        cell_k = t_pass.cell(r_i, 0)
        cell_v = t_pass.cell(r_i, 1)
        cell_k.paragraphs[0].text = k
        cell_v.paragraphs[0].text = v
        if r_i > 0:
            cell_k.paragraphs[0].runs[0].bold = True

    doc.add_page_break()

    # =========================================================================
    # MUNDARIJA (TABLE OF CONTENTS)
    # =========================================================================
    add_h1("MUNDARIJA (REJA)")
    toc_items = [
        ("1-BOB. UMUMIY MA'LUMOTLAR VA ASOSIY TUSHUNCHALAR", "3"),
        ("  1.1. Tizimning to'liq va rasmiy nomi", "3"),
        ("  1.2. Buyurtmachi va ishlab chiquvchi tashkilot rekvizitlari", "3"),
        ("  1.3. Ishlab chiqish uchun asos bo'lgan normativ-huquqiy hujjatlar", "3"),
        ("  1.4. Tizimda qo'llaniladigan asosiy tushunchalar va atamalar", "4"),
        ("2-BOB. TIZIMNING MAQSADI VA VAZIFALARI", "5"),
        ("  2.1. Tizimni yaratishdan ko'zlangan asosiy maqsadlar", "5"),
        ("  2.2. Avtomatlashtiriladigan asosiy vazifalar", "5"),
        ("  2.3. Tizimni joriy etishdan kutilayotgan texnik-iqtisodiy samara", "6"),
        ("3-BOB. TIZIM FOYDALANUVCHILARI VA HUQUQIY ROLLARI (RBAC MATRITSASI)", "7"),
        ("  3.1. Foydalanuvchilar toifalari", "7"),
        ("  3.2. Ruxsatlar va funksional vakolatlar matritsasi", "7"),
        ("4-BOB. TIZIMGA QO'YILADIGAN TEXNIK VA FUNKSIONAL TALABLAR", "9"),
        ("  4.1. Autentifikatsiya va Xavfsiz Kirish quyi tizimi (HEMIS + E-IMZO)", "9"),
        ("  4.2. Ommaviy axborot va aloqa portali moduli", "11"),
        ("  4.3. Iqtidorli talaba shaxsiy kabineti (Elektron portfolio)", "12"),
        ("  4.4. 1-Bosqich Masofaviy Imtihon/Test quyi tizimi", "14"),
        ("  4.5. 100 Ballik Reyting va Saralash baholash mexanizmi (Nizom 2-ilova)", "15"),
        ("  4.6. Administrator va Ekspertiza boshqaruv paneli (Admin Dashboard)", "17"),
        ("5-BOB. AXBOROT XAVFSIZLIGI, MAXFIYLIK VA ZERO-PII TALABLARI", "19"),
        ("  5.1. Zero-PII tamoyili va shaxsga doir ma'lumotlar daxlsizligi", "19"),
        ("  5.2. Kriptografik himoya va E-IMZO integratsiyasi xavfsizligi", "20"),
        ("  5.3. Veb-ilova va ma'lumotlar bazasi xavfsizligi choralari", "20"),
        ("6-BOB. FOYDALANUVCHI INTERFEYSI (UI/UX) VA DIZAYN TALABLARI", "21"),
        ("7-BOB. TIZIMNING TEXNIK VA DASTURIY ARXITEKTURASI", "22"),
        ("  7.1. Texnologiyalar steki (Tech Stack)", "22"),
        ("  7.2. Ma'lumotlar bazasi strukturasi (ER modellari)", "23"),
        ("  7.3. Tashqi axborot tizimlari bilan integratsiya shlyuzlari", "24"),
        ("  7.4. Server infratuzilmasi va Docker konteynerizatsiya talablari", "25"),
        ("8-BOB. SINOV, TOPSHIRISH VA QABUL QILISH TARTIBI", "26"),
        ("9-BOB. KAFOLAT MUDDATI VA TEXNIK XIZMAT KO'RSATISH", "27"),
        ("ILOVALAR (Baholash mezonlari shkalasi, API spetsifikatsiyasi)", "28")
    ]
    
    t_toc = doc.add_table(rows=len(toc_items), cols=2)
    format_table(t_toc, col_widths=[Inches(5.7), Inches(0.8)])
    for i, (title, page) in enumerate(toc_items):
        c0 = t_toc.cell(i, 0)
        c1 = t_toc.cell(i, 1)
        c0.paragraphs[0].text = title
        c1.paragraphs[0].text = page
        c1.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
        if not title.startswith("  "):
            c0.paragraphs[0].runs[0].bold = True
            c1.paragraphs[0].runs[0].bold = True
            set_cell_background(c0, "F1F5F9")
            set_cell_background(c1, "F1F5F9")

    doc.add_page_break()

    # =========================================================================
    # 1-BOB. UMUMIY MA'LUMOTLAR
    # =========================================================================
    add_h1("1-BOB. UMUMIY MA'LUMOTLAR VA ASOSIY TUSHUNCHALAR")
    
    add_h2("1.1. Tizimning to'liq va rasmiy nomi")
    add_p("Ushbu texnik topshiriq Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali qoshidagi «Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi» faoliyatini to'liq raqamlashtirish, talabalar yutuqlarini xolisona baholash hamda filial miqyosida o'tkaziladigan yillik «Iqtidor» tanlovini shaffof boshqarishga mo'ljallangan axborot tizimini ishlab chiqish talablarini belgilaydi.")
    add_bullet("Tizimning to'liq nomi: «Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali iqtidorli talabalar axborot-tahliliy portali va elektron reyting tizimi».", "Rasmiy nomi: ")
    add_bullet("Tizimning qisqartirilgan nomi: «Iqtidorli talabalar» portali (JBNUU Iqtidor Portal).", "Qisqa nomi: ")
    add_bullet("Inglizcha nomi: «Talented Students Research and Rating Information System of JBNUU».", "Xalqaro nomi: ")

    add_h2("1.2. Buyurtmachi va ishlab chiquvchi tashkilot rekvizitlari")
    add_bullet("Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali «Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi». Manzil: 130100, Jizzax viloyati, Jizzax shahri, Sh.Rashidov shoh ko'chasi, 259-uy. Rasmiy veb-sayt: jbnuu.uz.", "Buyurtmachi: ")
    add_bullet("O'zMU Jizzax filiali Dasturiy injiniring va axborot texnologiyalari kafedrasi hamda ixtisoslashtirilgan dasturchilar guruhi.", "Ishlab chiquvchi: ")

    add_h2("1.3. Ishlab chiqish uchun asos bo'lgan normativ-huquqiy hujjatlar")
    add_p("Tizim quyidagi me'yoriy-huquqiy hujjatlar talablari hamda davlat standartlariga qat'iy rioya qilgan holda loyihalashtirilgan va ishlab chiqilgan:")
    add_bullet("O'zbekiston Respublikasining 2020-yil 23-sentabrdagi «Ta'lim to'g'risida»gi O'RQ-637-son Qonuni;")
    add_bullet("O'zbekiston Respublikasi Prezidentining 2019-yil 8-oktabrdagi «O'zbekiston Respublikasi oliy ta'lim tizimini 2030-yilgacha rivojlantirish konsepsiyasini tasdiqlash to'g'risida»gi PF-5847-son Farmoni;")
    add_bullet("O'zbekiston Respublikasi Prezidentining 2020-yil 29-oktabrdagi «Ilm-fanni 2030-yilgacha rivojlantirish konsepsiyasini tasdiqlash to'g'risida»gi PF-6097-son Farmoni;")
    add_bullet("O'zbekiston Respublikasi Vazirlar Mahkamasining 2008-yil 13-oktabrdagi «O'zbekiston iqtidorli yoshlarini taqdirlash va moddiy rag'batlantirish to'g'risida»gi 226-son qarori;")
    add_bullet("Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali Kengashining 2026-yil 6-iyuldagi 11-sonli bayonnomasi bilan ma'qullangan «Iqtidor» tanlovi Nizomi;", "Asosiy lokal nizom: ")
    add_bullet("O'zDSt 34.602-89 «Axborot texnologiyalari. Avtomatlashtirilgan tizimlarni yaratish bo'yicha texnik topshiriq» davlat standarti;", "Texnik standart: ")
    add_bullet("O'zbekiston Respublikasining 2019-yil 2-iyuldagi «Shaxsga doir ma'lumotlar to'g'risida»gi O'RQ-547-son Qonuni.", "Xavfsizlik standarti: ")

    add_h2("1.4. Tizimda qo'llaniladigan asosiy tushunchalar va atamalar")
    add_bullet("Oliy ta'lim jarayonlarini boshqarish axborot tizimi (Higher Education Management Information System). Talabalar shaxsiy va akademik ma'lumotlari bazasi.", "HEMIS: ")
    add_bullet("O'zbekiston Respublikasi Davlat soliq qo'mitasi huzuridagi Yangi texnologiyalar ilmiy-axborot markazi tomonidan taqdim etiladigan elektron raqamli imzo drayveri va dasturiy majmuasi.", "E-IMZO: ")
    add_bullet("Shaxsga doir o'ta maxfiy ma'lumotlarni (jumladan, JSHSHIR/PINFL, pasport seriya va raqami) mahalliy ma'lumotlar bazasida saqlamaslik, faqat ochiq sertifikat seriya raqami va kriptografik imzo orqali autentifikatsiya qilish xavfsizlik arxitekturasi.", "Zero-PII: ")
    add_bullet("Talabaning o'quv fanlari bo'yicha o'rtacha o'zlashtirish ko'rsatkichi (Grade Point Average), 5.0 maksimal shkala bo'yicha hisoblanadi.", "GPA: ")
    add_bullet("Iqtidorli talabalarning ilmiy, ijodiy, sport va startap yutuqlarini tasdiqlovchi hujjatlar, maqolalar va sertifikatlarning elektron to'plami.", "Elektron portfolio: ")
    add_bullet("Rollar asosida kirish huquqlarini boshqarish modeli (Role-Based Access Control).", "RBAC: ")

    # =========================================================================
    # 2-BOB. TIZIMNING MAQSADI VA VAZIFALARI
    # =========================================================================
    add_h1("2-BOB. TIZIMNING MAQSADI VA ASOSIY VAZIFALARI")
    
    add_h2("2.1. Tizimni yaratishdan ko'zlangan asosiy maqsadlar")
    add_p("Loyihaning tub maqsadi — Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filialida ta'lim olayotgan, yuqori intellektual va ilmiy salohiyatga ega bo'lgan talabalarni aniqlash, ularning faoliyatini tizimli monitoring qilish, rag'batlantirish hamda filialda o'tkaziladigan yillik «Iqtidor» tanlovini 100% inson omilisiz, shaffof va adolatli raqamli mexanizm asosida tashkil etishdir.")
    
    add_bullet("Talabalarning ilmiy maqolalari, tezislari, patentlari, dasturiy guvohnomalari va tanlov yutuqlarini qog'ozsiz (paperless) qabul qilish va ekspertizadan o'tkazish;", "Raqamlashtirish: ")
    add_bullet("HEMIS axborot tizimi bilan avtomatik integratsiya qilib, talabaning GPA bali va akademik ko'rsatkichlarini to'g'ridan-to'g'ri sinxronlashtirish;", "Integratsiya: ")
    add_bullet("Har bir talaba uchun 100 ballik shkala bo'yicha dinamik, jonli yangilanuvchi ochiq reyting jadvalini shakllantirish;", "Shaffof reyting: ")
    add_bullet("E-IMZO elektron raqamli imzo orqali xavfsiz va qonuniy kuchga ega kirishni ta'minlash;", "Xavfsiz autentifikatsiya: ")
    add_bullet("O'zMU Jizzax filiali kengashi va rahbariyatiga iqtidorli talabalar bo'yicha analitik statistik hisobotlarni taqdim etish.", "Analitika va hisobot: ")

    add_h2("2.2. Avtomatlashtiriladigan asosiy vazifalar")
    add_p("Tizim orqali filialning «Iqtidorli talabalar bo'limi»ning quyidagi an'anaviy qog'ozbozlik jarayonlari to'liq avtomatlashtiriladi:")
    add_bullet("Talabalar arizalarini 24/7 rejimida onlayn topshirish va qabul qilish;");
    add_bullet("Ilmiy nashrlar (Scopus, Web of Science, OAK e'tirof etgan xalqaro va respublika jurnallari) hamda konferensiya materiallarini tekshirish va ballash;");
    add_bullet("1-saralash bosqichi doirasida masofaviy test/imtihon o'tkazish (IQ mantiqiy savollar, O'zbekiston tarixi, Chet tili) va natijalarni avtomatik hisoblash;");
    add_bullet("Ta'lim yo'nalishlari xususiyatidan kelib chiqqan holda 6 ta asosiy nominatsiya («Innovator», «Yangi avlod yaratuvchisi», «Zukko», «Lider», «Tadbirkor», «Ijodkor») bo'yicha talabalarni avtomatik saralash;");
    add_bullet("Guruh sardorlari (starostalar) va tyutorlar tomonidan guruh talabalari reytingini nazorat qilish va rag'batlantirishga tavsiya etish;");
    add_bullet("Saytda rasmiy yangiliklar, me'yoriy hujjatlar va tanlovlar bo'yicha ommaviy axborot berish.");

    add_h2("2.3. Tizimni joriy etishdan kutilayotgan texnik-iqtisodiy va ilmiy samara")
    add_bullet("Qog'oz xarajatlari va arizalarni qo'lda qabul qilish vaqtini 90% ga qisqartirish;", "Vaqt va mablag' tejami: ")
    add_bullet("Ballarni hisoblashda inson omili, tanish-bilishchilik va noxolis baholash ehtimolini 100% bartaraf etish;", "Adolat va shaffoflik: ")
    add_bullet("Talabalar o'rtasida sog'lom ilmiy raqobat muhitini shakllantirish, xalqaro e'tirofdagi maqolalar (Scopus/WoS) sonini keskin oshirish;", "Ilmiy o'sish: ")
    add_bullet("O'zbekiston Respublikasi Prezidenti va nomli Davlat stipendiyalariga munosib nomzodlarni erta aniqlash va maqsadli tayyorlash.", "Stipendiatlar zaxirasi: ")

    add_callout(
        "Tizim O'zbekiston Respublikasi Raqamli texnologiyalar vazirligi hamda Oliy ta'lim, fan va innovatsiyalar vazirligining OTMlarda byurokratiyani kamaytirish va axborot tizimlarini yagona ekotizimga birlashtirish talablariga to'liq javob beradi.",
        title="DAVLAT SIYOSATIGA MOSLIK:"
    )

    # =========================================================================
    # 3-BOB. FOYDALANUVCHILAR VA ROLLARI
    # =========================================================================
    add_h1("3-BOB. TIZIM FOYDALANUVCHILARI VA HUQUQIY ROLLARI (RBAC MATRITSASI)")
    
    add_h2("3.1. Foydalanuvchilar toifalari")
    add_p("Tizimda foydalanuvchilar o'z xizmat vazifalari va vakolatlariga muvofiq 6 ta asosiy toifaga bo'linadi:")
    add_bullet("Tizimning to'liq texnik boshqaruvi, audit, loglar, ma'lumotlar bazasi va xavfsizlik sozlamalariga ega administrator.", "1. Tizim administratori (Super Admin): ")
    add_bullet("Filial iqtidorli talabalar bo'limi rahbari. Arizalarni ko'rib chiqish, ekspertlar tayinlash, yakuniy reytingni tasdiqlash, nominatsiyalar va g'oliblarni belgilash huquqiga ega.", "2. Bo'lim boshlig'i (Department Head): ")
    add_bullet("Fakultetlar bo'yicha biriktirilgan mas'ul xodimlar. O'z fakulteti talabalari arizalarini dastlabki ko'rib chiqish va ball berish huquqiga ega.", "3. Fakultet koordinatori (Faculty Coordinator): ")
    add_bullet("Guruh talabalari faolligini monitoring qiluvchi, ilmiy to'garaklarga jalb etuvchi mas'ul shaxs.", "4. Tyutor / Starosta: ")
    add_bullet("Filialning kunduzgi bakalavriat ta'lim yo'nalishi talabasi. Shaxsiy kabinetga kirish, portfoliosini to'ldirish, imtihon topshirish va o'z ballini ko'rish huquqiga ega.", "5. Iqtidorli talaba (Student): ")
    add_bullet("Tizimda ro'yxatdan o'tmagan barcha tashqi foydalanuvchilar. Bosh sahifa, matbuot xizmati, yangiliklar va umumiy e'lonlarni ko'rish imkoniyati.", "6. Mehmon (Public User): ")

    add_h2("3.2. Ruxsatlar va funksional vakolatlar matritsasi")
    
    t_rbac = doc.add_table(rows=10, cols=7)
    format_table(t_rbac, col_widths=[Inches(2.3), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7)])
    
    rbac_data = [
        ("Funksional vazifa / Amallar", "Mehmon", "Talaba", "Starosta", "Koordinator", "Bo'lim boshlig'i", "Admin"),
        ("Ommaviy sahifalar va yangiliklarni ko'rish", "✅", "✅", "✅", "✅", "✅", "✅"),
        ("Shaxsiy kabinetga kirish (HEMIS / E-IMZO)", "❌", "✅", "✅", "✅", "✅", "✅"),
        ("Yutuqlar va maqolalarni yuklash (Portfolio)", "❌", "✅", "✅", "❌", "❌", "❌"),
        ("Tanlov va stipendiyalarga ariza topshirish", "❌", "✅", "✅", "❌", "❌", "❌"),
        ("Masofaviy 1-bosqich test/imtihon topshirish", "❌", "✅", "✅", "❌", "❌", "❌"),
        ("Guruh talabalari faolligini ko'rish", "❌", "❌", "✅", "✅", "✅", "✅"),
        ("Arizalarni ekspertiza qilish va ball berish", "❌", "❌", "❌", "✅", "✅", "✅"),
        ("Yangiliklar, e'lonlar va mezonlarni tahrirlash", "❌", "❌", "❌", "❌", "✅", "✅"),
        ("Foydalanuvchilarni bloklash / Ruxsat berish", "❌", "❌", "❌", "❌", "❌", "✅")
    ]
    for r_i, row in enumerate(rbac_data):
        for c_i, val in enumerate(row):
            cell = t_rbac.cell(r_i, c_i)
            cell.paragraphs[0].text = val
            if c_i > 0:
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            if r_i > 0 and c_i == 0:
                cell.paragraphs[0].runs[0].bold = True

    doc.add_page_break()

    # =========================================================================
    # 4-BOB. TEXNIK VA FUNKSIONAL TALABLAR
    # =========================================================================
    add_h1("4-BOB. TIZIMGA QO'YILADIGAN TEXNIK VA FUNKSIONAL TALABLAR")
    
    add_h2("4.1. Autentifikatsiya va Xavfsiz Kirish quyi tizimi (HEMIS + E-IMZO)")
    add_p("Tizimga kirish ikkita mustaqil, xavfsiz va zamonaviy usulda amalga oshiriladi:")
    
    add_h3("A) Asosiy usul: HEMIS ID va Parol orqali kirish")
    add_bullet("Talaba o'zining rasmiy HEMIS talaba ID raqami (masalan, 3852011001) va HEMIS paroli orqali kiradi;", "HEMIS integratsiyasi: ")
    add_bullet("Tizim fon rejimida Oliy ta'lim vazirligining rasmiy HEMIS REST API shlyuziga so'rov yuborib, talabaning shaxsi, o'qish joyi, fakulteti, kursi, yo'nalishi va o'rtacha GPA ko'rsatkichini mahalliy bazaga xavfsiz sinxronlashtiradi;", "Jonli sinxronizatsiya: ")
    add_bullet("Parolni ko'rsatish/yashirish (Eye SVG tugmasi), «Eslab qol» (Remember me) hamda avtomatik xavfsiz sessiya boshqaruvi mavjud.", "UI qulayligi: ")

    add_h3("B) Maxsus usul: E-IMZO (Elektron Raqamli Imzo) orqali kirish")
    add_bullet("O'zbekiston Respublikasi qonunchiligiga ko'ra yuridik kuchga ega elektron raqamli imzo (PFX / DSKEYS) kalitlari bilan tizimga kirish;", "Qonuniy maqom: ")
    add_bullet("Foydalanuvchi kompyuteridagi E-IMZO agenti (64443-port WSS) bilan server ko'prigi orqali to'g'ridan-to'g'ri aloqa o'rnatiladi. Brauzerdagi CORS va sertifikat to'siqlari mahalliy backend shlyuzi orqali 0.02 soniyada aylanib o'tiladi;", "WSS Ko'prik: ")
    add_bullet("Zero-PII tamoyili: Tizim foydalanuvchining JSHSHIR (PINFL) raqamini hech qachon ma'lumotlar bazasida saqlamaydi. Foydalanuvchi faqat kalit seriya raqami (masalan, 78a5d952) hamda F.I.O. mosligi orqali identifikatsiya qilinadi;", "Zero-PII Kafolati: ")
    add_bullet("Native Parol oynasi: Foydalanuvchi kalitni tanlab «Kirish» tugmasini bosganda, veb-sahifada emas, balki E-IMZO ning o'zining rasmiy desktop oynasi qalqib chiqadi va parolni kiritish so'raladi. Parol to'g'ri kiritilganda PKCS#7 kriptografik imzosi yaratilib serverda tekshiriladi;", "Desktop Dialog: ")
    add_bullet("Akkaunt xavfsizligi: Begona shaxs boshqa elektron kalit bilan admin yoki boshqa talabaning hisobiga kira olmaydi (403 Forbidden himoyasi).", "Begona kalit blokirovkasi: ")

    add_h3("C) «Parolni unutdingizmi?» 8 soniyalik taymerli slayder modali")
    add_p("Foydalanuvchi parolni unutganda tizim qulay va zamonaviy ko'rsatma oynasini taqdim etadi:")
    add_bullet("Foydalanuvchi havola ustiga bosganda, silliq blur fonli responsiv modal darcha ochiladi;");
    add_bullet("Darchada HEMIS tizimi orqali parolni qayta tiklash bo'yicha filial tyutoriga yoki dekanatga murojaat qilish bo'yicha qisqa tushunarli ko'rsatma beriladi;");
    add_bullet("Modal pastida 8 soniyalik chiziqli animatsiyali teskari taymer (Progress bar) joylashgan bo'lib, vaqt tugagach modal foydalanuvchi e'tiborini chalg'itmasdan avtomatik yopiladi (yoki «Tushunarli» tugmasi orqali darhol yopish mumkin).");

    add_h3("D) Brute-Force (Kuch bilan buzish) xurujlariga qarshi himoya")
    add_bullet("Bitta IP yoki foydalanuvchi loginiga nisbatan 5 ta ketma-ket xato urinish qayd etilganda, tizim ushbu manzilni 300 soniya (5 daqiqa) ga bloklaydi (HTTP 429 Too Many Requests);");
    add_bullet("Parollar bcrypt xesh algoritmi (salt 12 raund) orqali saqlanadi, ochiq holda hech qayerda ko'rinmaydi;");
    add_bullet("Muvaffaqiyatli kirilganda 48 soatlik HttpOnly, SameSite=Lax himoyalangan JWT Cookie o'rnatiladi.");

    add_h2("4.2. Ommaviy axborot va aloqa portali moduli")
    add_p("Tizimning tashqi ommaviy qismi Mirzo Ulug'bek nomidagi O'zMU Jizzax filialining korporativ brendbook uslubida tayyorlangan bo'lib, quyidagi bo'limlarni o'z ichiga oladi:")
    add_bullet("Filial faoliyati, Shavkat Mirziyoyevning yoshlar haqidagi iqtibosi, bo'lim vazifalari, so'nggi yangiliklar, e'lonlar va mezonlar;", "Bosh sahifa (/): ")
    add_bullet("Katta vizual poster banner, vertikal tanlovlar ro'yxati (Talant shou, Media loyihalar, Startaplar, QVZ), fotogalereya va videoroliklar integratsiyasi;", "Matbuot xizmati (/matbuot-xizmati): ")
    add_bullet("Filial miqyosidagi hamda Respublika, xalqaro miqyosdagi faol tanlovlar va stipendiyalar kartochkalari, qabul muddatlari va talablari;", "Tanlovlar sahifasi (/tanlovlar): ")
    add_bullet("Iqtidorli talabalarning ilmiy to'garaklari («Yosh dasturchilar», «Robototexnika», «Startap inkubatori», «Liderlar klubi») faoliyati;", "Talabalar akademiyasi (/talabalar-akademiyasi): ")
    add_bullet("Har bir yangilik uchun alohida slug manzili, ko'rishlar soni (view counter), teglar va rasmlar galereyasi;", "Yangiliklar batafsil (/yangiliklar/{id}): ")
    add_bullet("«Iqtidor» tanlovi Nizomi, baholash mezonlari jadvallari va rasmiy ariza shakllarini PDF formatda yuklab olish imkoniyati.", "Me'yoriy hujjatlar: ")

    add_h2("4.3. Iqtidorli talaba shaxsiy kabineti (Elektron portfolio)")
    add_p("Tizimga kirgan talaba uchun quyidagi keng qamrovli raqamli imkoniyatlar yaratilgan:")
    add_bullet("Talabaning fotosurati, F.I.O., HEMIS ID, fakultet, yo'nalish, guruh, kurs hamda joriy o'rtacha GPA ko'rsatkichi;", "Talaba profili: ")
    add_bullet("Jonli hisoblanadigan joriy jamlangan ball (maksimal 100 ball), GPA bo'yicha ball, 1-bosqich imtihon bali hamda ilmiy yutuqlar uchun berilgan ballar vitrinasi;", "Reyting kartochkasi: ")
    add_bullet("Talaba o'zining ilmiy maqolalari, konferensiya tezislari, Scopus/WoS maqolalari, patent va mualliflik guvohnomalari, olimpiada diplomlarini PDF/rasm ko'rinishida yuklaydi. Har bir yuklangan hujjat bo'yicha ekspert tekshiruvi holati (Kutilmoqda, Tasdiqlandi, Rad etildi) va berilgan ball real vaqtda ko'rsatiladi;", "Ilmiy portfolio yuborish: ")
    add_bullet("Filialdagi mavjud tanlovlarga (Prezident, Navoiy, Beruniy, Filial direktori stipendiyasi va h.k.) onlayn ariza yuborish;", "Tanlovlarga ariza berish: ")
    add_bullet("Topshirilgan arizalarning ekspert xulosalari, komissiya a'zolarining izohlari va yakuniy qarorlarni kuzatib borish.", "Holat monitoringi: ")

    add_h2("4.4. 1-Bosqich Masofaviy Imtihon/Test quyi tizimi")
    add_p("«Iqtidor» tanlovi Nizomining 1-saralash bosqichi talablariga muvofiq, talabalarning fundamental va mantiqiy bilimlarini baholovchi masofaviy test moduli joriy etilgan:")
    add_bullet("20 ta mantiqiy-matematik savol (har biri 1 balldan, jami 20 ball);", "1. IQ va Mantiqiy fikrlash bloki: ")
    add_bullet("10 ta test savoli (har biri 1 balldan, jami 10 ball);", "2. O'zbekiston tarixi bloki: ")
    add_bullet("10 ta test savoli (har biri 1 balldan, jami 10 ball);", "3. Chet tili (Ingliz tili) bloki: ")
    add_bullet("Maksimal ball — 40 ball. Imtihon vaqti — 45 daqiqa. Imtihon yakunlangach, natija avtomatik bazaga yoziladi va talabaga unikal sertifikat raqami biriktiriladi.", "Umumiy shartlar: ")

    add_h2("4.5. 100 Ballik Reyting va Saralash baholash mexanizmi")
    add_p("Talabalarning umumiy reyting bali «Iqtidor» tanlovi Nizomi 2-ilovasiga 100% mos ravishda 3 ta asosiy komponentdan jamlanadi:")
    
    # Formula jadvali
    t_calc = doc.add_table(rows=5, cols=4)
    format_table(t_calc, col_widths=[Inches(0.6), Inches(2.5), Inches(1.2), Inches(2.2)])
    calc_rows = [
        ("№", "Baholash yo'nalishi", "Maks. ball", "Hisoblash qoidasi va mezoni"),
        ("1", "O'zlashtirish ko'rsatkichi (GPA)", "20 ball", "GPA * 4 (masalan, 5.0 GPA = 20 ball, 4.5 GPA = 18 ball)"),
        ("2", "1-bosqich masofaviy imtihon", "40 ball", "IQ testi (20) + Tarix (10) + Chet tili (10)"),
        ("3", "Ilmiy-ijodiy yutuqlar (Portfolio)", "40 ball", "Scopus/WoS, OAK maqolalari, patentlar, olimpiada g'olibliklari bo'yicha yig'indi ball"),
        ("JAMI", "YAKUNIY KOMPOZIT REYTING BALLI", "100 BALL", "Uchala komponent yig'indisi asosida avtomatik saralanadi")
    ]
    for r_i, row in enumerate(calc_rows):
        for c_i, val in enumerate(row):
            cell = t_calc.cell(r_i, c_i)
            cell.paragraphs[0].text = val
            if c_i in [0, 2]:
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            if r_i in [0, 4]:
                cell.paragraphs[0].runs[0].bold = True

    add_p("Ushbu 100 ballik tizim natijalari asosida talabalar o'z ta'lim yo'nalishlari bo'yicha quyidagi 6 ta nominatsiyaga saralanadi:")
    add_bullet("Tabiiy fanlar, fizika, kimyo va amaliy texnologiyalar yo'nalishidagi eng yuqori ball to'plagan talaba;", "1. «Innovator» nominatsiyasi: ")
    add_bullet("Axborot texnologiyalari, dasturiy injiniring va sun'iy intellekt yo'nalishi iqtidori;", "2. «Yangi avlod yaratuvchisi» nominatsiyasi: ")
    add_bullet("Amaliy matematika, matematika va fundamental aniq fanlar yo'nalishi talabalari uchun;", "3. «Zukko» nominatsiyasi: ")
    add_bullet("Ijtimoiy faol, talabalar kengashi va tashkilotchilik qobiliyatiga ega yetakchi talaba;", "4. «Lider» nominatsiyasi: ")
    add_bullet("Iqtisodiyot, raqamli biznes va startap loyihalari mualliflari bo'lgan iqtidorlar;", "5. «Tadbirkor» nominatsiyasi: ")
    add_bullet("Adabiyot, jurnalistika, madaniyat va san'at yo'nalishidagi ijodkor talabalar uchun.", "6. «Ijodkor» nominatsiyasi: ")

    add_h2("4.6. Administrator va Ekspertiza boshqaruv paneli (Admin Dashboard)")
    add_p("Filial rahbariyati va bo'lim mas'ullari uchun `/admin` manzili ostida keng qamrovli boshqaruv paneli ishlab chiqilgan:")
    add_bullet("Jami talabalar soni, ko'rib chiqish kutilayotgan arizalar, tasdiqlangan ilmiy ishlar, o'rtacha ballar grafiklari;", "Monitoring vidjeti: ")
    add_bullet("Talabalar yuborgan PDF maqolalarni to'g'ridan-to'g'ri ko'rish, OAK/Scopus talablariga muvofiqligini tekshirish, ball biriktirish yoki sababini yozib rad etish;", "Arizalarni ekspertiza qilish: ")
    add_bullet("Top talabalar ro'yxatini filtrlash (fakultet, yo'nalish, kurs bo'yicha) va rasmiy bayonnoma uchun Excel/PDF formatda yuklab olish;", "Reytingni boshqarish va eksport: ")
    add_bullet("Filial guruhlari, guruh starosta va tyutorlarini biriktirish, ularga kirish huquqlarini taqsimlash;", "Guruhlar va starosta nazorati: ")
    add_bullet("Saytdagi yangiliklar, e'lonlar, tanlovlar muddati va me'yoriy hujjatlarni qo'shish, o'chirish va tahrirlash (CRUD);", "Kontent boshqaruvi: ")
    add_bullet("Foydalanuvchilarni faolsizlantirish, yangi xodimlarni ro'yxatdan o'tkazish, ularning E-IMZO seriya raqamlarini bog'lash.", "Foydalanuvchilar nazorati: ")

    doc.add_page_break()

    # =========================================================================
    # 5-BOB. AXBOROT XAVFSIZLIGI VA ZERO-PII
    # =========================================================================
    add_h1("5-BOB. AXBOROT XAVFSIZLIGI, MAXFIYLIK VA ZERO-PII TALABLARI")
    
    add_h2("5.1. Zero-PII tamoyili va shaxsga doir ma'lumotlar daxlsizligi")
    add_p("O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni hamda E-IMZO agentligining xavfsizlik talablariga asosan, tizimda Zero-PII (Zero Personally Identifiable Information) konsepsiyasi to'liq amalga oshirilgan:")
    add_bullet("Talabaning 14 xonali JSHSHIR (PINFL) raqami, pasport seriya va raqami ma'lumotlar bazasining hech bir jadvalida yoki ustunida saqlanmaydi;", "JSHSHIR saqlanmasligi: ")
    add_bullet("Talaba E-IMZO orqali kirganda, uning ochiq kalit sertifikatidagi xesh va seriya raqami (masalan, 78a5d952) tekshiriladi;", "Seriya bo'yicha bog'lash: ")
    add_bullet("Agar tizim xalqaro yoki davlat serveriga deploy qilinsa ham, ma'lumotlar bazasidan shaxsiy identifikatorlar sizib chiqish xavfi mutlaqo mavjud emas.", "Huquqiy kafolat: ")

    add_h2("5.2. Kriptografik himoya va E-IMZO integratsiyasi xavfsizligi")
    add_bullet("Server har bir kirish so'rovi uchun 32 baytli kriptografik tasodifiy token (Challenge) yaratadi va xotirada 120 soniya saqlaydi;", "Bir martalik Challenge: ")
    add_bullet("Talaba imzosi PKCS#7 xalqaro kriptografik standarti asosida tekshiriladi;", "PKCS#7 standarti: ")
    add_bullet("E-IMZO drayveri bilan barcha ichki aloqalar SSL/TLS shifrlangan WSS kanali orqali amalga oshiriladi;", "WSS xavfsiz kanali: ")
    add_bullet("Har bir foydalanuvchining roli JWT (JSON Web Token) ichida imzolanib, 48 soatlik HttpOnly, Secure, SameSite=Lax flaglari bilan cookie ga joylanadi (JavaScript orqali tokenni o'g'irlab bo'lmaydi).", "JWT va HttpOnly Cookie: ")

    add_h2("5.3. Veb-ilova va ma'lumotlar bazasi xavfsizligi choralari")
    add_bullet("Barcha kiruvchi so'rovlar Pydantic v2 schemalari orqali tiplashtiriladi va qat'iy tekshiriladi. Noto'g'ri parametrlar 422 xatosi bilan to'xtatiladi;", "Validatsiya: ")
    add_bullet("SQLAlchemy 2.0 parametrli so'rovlar (ORM) orqali SQL Injection hujumlariga qarshi 100% immunitet ta'minlangan;", "SQL Injection himoyasi: ")
    add_bullet("Jinja2 andoza dvigateli barcha foydalanuvchi ma'lumotlarini HTML-kodlash (auto-escaping) orqali XSS xurujlarini bartaraf etadi;", "XSS himoyasi: ")
    add_bullet("Server javoblarida `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block` kabi global sarlavhalar mavjud.", "Global xavfsizlik sarlavhalari: ")

    # =========================================================================
    # 6-BOB. UI/UX VA DIZAYN TALABLARI
    # =========================================================================
    add_h1("6-BOB. FOYDALANUVCHI INTERFEYSI (UI/UX) VA DIZAYN TALABLARI")
    add_p("Tizim interfeysi foydalanuvchi uchun qulay, zamonaviy va intuitiv tushunarli bo'lishi shart:")
    add_bullet("Sayt barcha turdagi qurilmalarda — katta monitorlar (1920x1080), noutbuklar, planshetlar va smartfonlarda (iOS va Android) birdek mukammal moslashuvchan (Responsive) ishlaydi;", "Moslashuvchanlik: ")
    add_bullet("O'zMU brend ranglariga asoslangan chuqur ko'k (#1E3A8A), ochiq ko'k (#0284C7), to'q kulrang (#0F172A) va sof oq fon uyg'unligi;", "Ranglar gammasi: ")
    add_bullet("Tizimda og'ir yoki sun'iy intellekt yaratgan g'alati rasmlar emas, balki yengil, toza SVG vektor piktogrammalaridan foydalanilgan;", "SVG Vektor grafikasi: ")
    add_bullet("Tugmalar bosilishi, modallarning ochilishi, progress barlar va yuklanish indikatorlari (spinners) silliq CSS3 mikro-animatsiyalari bilan boyitilgan;", "Mikro-animatsiyalar: ")
    add_bullet("Tizim interfeysining asosiy tili — O'zbek tili (lotin yozuvida). Barcha atamalar va bildirishnomalar rasmiy akademik uslubda shakllantirilgan.", "Til muhiti: ")

    # =========================================================================
    # 7-BOB. TEXNIK VA DASTURIY ARXITEKTURA
    # =========================================================================
    add_h1("7-BOB. TIZIMNING TEXNIK VA DASTURIY ARXITEKTURASI")
    
    add_h2("7.1. Texnologiyalar steki (Tech Stack)")
    add_bullet("Python 3.11+ / FastAPI asinxron yuqori samarali web-freymvorki (Asgi / Uvicorn serveri);", "Backend texnologiyasi: ")
    add_bullet("SQLAlchemy 2.0 (Asinxron rejim: aiosqlite / asyncpg) + Alembic migratsiyalari;", "ORM va Baza drayveri: ")
    add_bullet("PostgreSQL 16 (Production rejimida) / SQLite (Mahalliy dasturlash va tezkor sinov rejimida);", "Ma'lumotlar bazasi: ")
    add_bullet("Jinja2 Server-Side Rendering (SSR) + Vanilla JavaScript (ES6+) + Zamonaviy Vanilla CSS3 (Custom design system);", "Frontend texnologiyasi: ")
    add_bullet("Docker va Docker Compose orqali to'liq konteynerlashtirish, Nginx teskari proksi-serveri.", "DevOps va Deployment: ")

    add_h2("7.2. Ma'lumotlar bazasi strukturasi (Asosiy jadvallar)")
    t_db = doc.add_table(rows=9, cols=3)
    format_table(t_db, col_widths=[Inches(1.8), Inches(1.5), Inches(3.2)])
    db_tables = [
        ("Jadval nomi", "Tegishli Model", "Vazifasi va asosiy maydonlari"),
        ("users", "User", "Foydalanuvchilar: hemis_id, full_name, hashed_password, role, faculty, gpa, eimzo_serial"),
        ("student_achievements", "StudentAchievement", "Yutuqlar: user_id, title, achievement_type, points, status, file_url, admin_comment"),
        ("contest_applications", "ContestApplication", "Arizalar: user_id, contest_name, nomination, status, stage, essay_url, portfolio_url"),
        ("student_exam_results", "StudentExamResult", "Imtihonlar: user_id, iq_score, history_score, lang_score, total_score, certificate_no"),
        ("news", "News", "Yangiliklar: title, slug, summary, content, image_url, views, category, status"),
        ("announcements", "Announcement", "E'lonlar: title, deadline, target_direction, is_active"),
        ("documents", "Document", "Me'yoriy hujjatlar: title, file_url, category, file_size"),
        ("roles", "Role", "Tizim rollari va ruxsatlar matritsasi")
    ]
    for r_i, row in enumerate(db_tables):
        for c_i, val in enumerate(row):
            cell = t_db.cell(r_i, c_i)
            cell.paragraphs[0].text = val
            if r_i > 0 and c_i == 0:
                cell.paragraphs[0].runs[0].bold = True

    add_h2("7.3. Tashqi axborot tizimlari bilan integratsiya shlyuzlari")
    add_bullet("REST API JSON protokoli orqali talaba akademik holati va GPA sini sinxronlash;", "1. OTM HEMIS tizimi: ")
    add_bullet("CAPIWS WebSocket (wss://127.0.0.1:64443/ajax/) shlyuzi orqali elektron raqamli imzolash va sertifikat tekshiruvi;", "2. E-IMZO moduli: ")
    add_bullet("Excel (.xlsx) formatida ekspert xulosalari va g'oliblar ro'yxatini yuklab olish imkoniyati.", "3. Tashqi tahliliy eksport: ")

    add_h2("7.4. Server infratuzilmasi va Docker konteynerizatsiya talablari")
    add_bullet("Kamida 4 yadro (vCPU), 8 GB operativ xotira (RAM), 100 GB SSD/NVMe disk xotirasi;", "Minimal server talablari: ")
    add_bullet("Ubuntu Linux 22.04 LTS yoki 24.04 LTS (x86_64);", "Operatsion tizim: ")
    add_bullet("Loyiha papkasida `docker-compose.yml` va `Dockerfile` mavjud bo'lib, `docker compose up --build -d` buyrug'i orqali ma'lumotlar bazasi va veb-ilova avtomatik tarzda ko'tariladi va birlamchi seed-ma'lumotlar yuklanadi.", "Avtomatlashtirilgan o'rnatish: ")

    # =========================================================================
    # 8-BOB. SINOV VA QABUL QILISH TARTIBI
    # =========================================================================
    add_h1("8-BOB. SINOV, TOPSHIRISH VA QABUL QILISH TARTIBI")
    add_p("Dasturiy ta'minotni qabul qilish 3 bosqichda amalga oshiriladi:")
    add_bullet("Dasturchilar guruhi tomonidan har bir API endpoint va sahifaning to'g'ri ishlashi, E-IMZO va HEMIS ulanishi tekshiriladi;", "1. Dastlabki laboratoriya sinovi: ")
    add_bullet("Avtorizatsiya mustahkamligi, Zero-PII tamoyiliga rioya etilganligi va SQLi/XSS himoyasi bo'yicha mustaqil test o'tkaziladi;", "2. Axborot xavfsizligi auditi: ")
    add_bullet("Filialning bir guruh iqtidorli talabalari va mas'ul ekspertlari ishtirokida real tanlov arizalarini yuborish va baholash bo'yicha pilot amaliyoti o'tkaziladi;", "3. Tajriba-sinov ekspluatatsiyasi: ")
    add_bullet("Sinov natijalari bo'yicha ikki tomonlama Dasturiy majmuani foydalanishga qabul qilish Dalolatnomasi imzolanadi.", "Qabul dalolatnomasi: ")

    # =========================================================================
    # 9-BOB. KAFOLAT VA TEXNIK QO'LLAB-QUVVATLASH
    # =========================================================================
    add_h1("9-BOB. KAFOLAT MUDDATI VA TEXNIK XIZMAT KO'RSATISH")
    add_bullet("Tizim qabul qilingan kundan e'tiboran 12 (o'n ikki) kalendar oy davomida kafolatli xizmat ko'rsatiladi;", "Kafolat muddati: ")
    add_bullet("Kafolat davrida aniqlangan dasturiy xatolar (bugs) va tizim kamchiliklari ishlab chiquvchi tomonidan 24 soat ichida bepul bartaraf etiladi;", "Nosozliklarni bartaraf etish: ")
    add_bullet("Tizim ma'lumotlar bazasi har kuni avtomatik zaxiralanadi (daily backup) va kamida 30 kunlik arxiv xavfsiz serverda saqlanadi;", "Zaxira nusxalash (Backup): ")
    add_bullet("Kelgusida tizimga talabalar uchun sun'iy intellekt (AI) asosidagi shaxsiy ilmiy maslahatchi va ilmiy jurnallarga maqola tavsiya qilish moduli qo'shilishi mumkin.", "Rivojlantirish istiqboli: ")

    # =========================================================================
    # ILOVA: BAHOLASH MEZONLARI JADVALI
    # =========================================================================
    doc.add_page_break()
    add_h1("1-ILOVA. «IQTIDOR» TANLOVI BO'YICHA ILMIY YUTUQLARNI BAHOLASH MEZONLARI")
    add_p("Ushbu baholash shkalasi O'zMU Jizzax filiali Kengashi tomonidan tasdiqlangan Nizomga muvofiq portfoliosi qabul qilingan talabalarga beriladigan ballarni belgilaydi (Maksimal 40 ball doirasida):")
    
    t_criteria = doc.add_table(rows=10, cols=3)
    format_table(t_criteria, col_widths=[Inches(0.6), Inches(4.5), Inches(1.4)])
    
    crit_data = [
        ("№", "Ilmiy yoki ijodiy yutuq turi", "Biriktiriladigan ball"),
        ("1", "Scopus yoki Web of Science xalqaro bazasidagi ilmiy maqola", "15 ball (har biri uchun)"),
        ("2", "OAK (Oliy attestatsiya komissiyasi) e'tirof etgan respublika jurnali maqolasi", "8 ball (har biri uchun)"),
        ("3", "Xalqaro ilmiy-amaliy konferensiya to'liq maqolasi yoki tezisi", "5 ball"),
        ("4", "Respublika ilmiy konferensiyasi materiallari to'plamidagi tezis", "3 ball"),
        ("5", "Ixtiroga olingan patent yoki dasturiy mahsulot uchun mualliflik guvohnomasi (Adliya vazirligi)", "12 ball"),
        ("6", "Respublika fan olimpiadasi, Respublika startap va innovatsion tanlovlar g'olibi (1-3 o'rin)", "10 ball"),
        ("7", "Xalqaro va Respublika miqyosidagi sport, madaniyat, san'at musobaqalari g'olibi", "8 ball"),
        ("8", "Xalqaro chet tili sertifikati (IELTS 7.0+, TOEFL 95+, CEFR C1 darajasi)", "10 ball"),
        ("9", "Filial ichki tanlovlari, olimpiadalari va intellektual o'yinlar g'olibi", "4 ball")
    ]
    for r_i, row in enumerate(crit_data):
        for c_i, val in enumerate(row):
            cell = t_criteria.cell(r_i, c_i)
            cell.paragraphs[0].text = val
            if c_i in [0, 2]:
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            if r_i > 0 and c_i == 0:
                cell.paragraphs[0].runs[0].bold = True

    add_callout(
        "Talaba portfoliosi bo'yicha to'plangan ilmiy ballar yig'indisi 40 balldan oshsa ham, yakuniy reyting hisobida maksimal 40 ball sifatida hisobga olinadi (GPA 20 + Imtihon 40 + Ilmiy yutuqlar 40 = Jami 100 ball).",
        title="LIMIT CHEKLOVI:"
    )

    # Imzolar bloki
    doc.add_paragraph().paragraph_format.space_after = Pt(20)
    t_sign = doc.add_table(rows=1, cols=2)
    t_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sign.columns[0].width = Inches(3.25)
    t_sign.columns[1].width = Inches(3.25)
    
    cs1 = t_sign.cell(0, 0)
    cs2 = t_sign.cell(0, 1)
    set_cell_borders(cs1)
    set_cell_borders(cs2)
    
    ps1 = cs1.paragraphs[0]
    ps1.add_run("Buyurtmachi nomidan:\n«Iqtidorli talabalarning ilmiy-tadqiqot\nfaoliyatini tashkil etish bo'limi» boshlig'i\n\n_________________ (Imzo)\n")
    for r in ps1.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        
    ps2 = cs2.paragraphs[0]
    ps2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    ps2.add_run("Ishlab chiquvchi nomidan:\nLoyihaning yetakchi me'mori va\ndasturchilar guruhi rahbari\n\n_________________ (Imzo)\n")
    for r in ps2.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)

    doc.save(output_filename)
    print(f"Hujjat muvaffaqiyatli saqlandi: {output_filename}")

if __name__ == "__main__":
    create_ttz_document()
