#!/usr/bin/env python3
"""Generate a single receipt PDF with Korean labels."""
from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle

KOREAN_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/unfonts-core/UnDotum.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]


def register_korean_font() -> str:
    for p in KOREAN_FONT_CANDIDATES:
        if Path(p).exists():
            try:
                pdfmetrics.registerFont(TTFont("KR", p))
                return "KR"
            except Exception:
                continue
    raise RuntimeError("한국어 TTF를 찾지 못했습니다.")


def build(out: Path, date: str, amount: str, item: str, dept: str) -> None:
    font = register_korean_font()
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(out), pagesize=A4)
    style = ParagraphStyle("kr", fontName=font, fontSize=12, leading=16)
    story = [
        Paragraph("지출 결의서", style),
        Spacer(1, 10),
        Paragraph(f"일자: {date}", style),
        Paragraph(f"금액: {amount}", style),
        Paragraph(f"항목: {item}", style),
        Paragraph(f"부서: {dept}", style),
    ]
    doc.build(story)


if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("usage: make-receipt-pdf.py <out.pdf> <date> <amount> <item> <dept>", file=sys.stderr)
        sys.exit(2)
    out = Path(sys.argv[1])
    build(out, *sys.argv[2:6])
    print(f"wrote {out}")
