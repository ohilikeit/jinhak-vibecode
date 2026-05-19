#!/usr/bin/env python3
"""Generate a single job PDF with Korean labels for jobs-pdf-to-excel testing.

사용:
    python3 make-jobs-pdf.py <out.pdf> <title> <company> <role> <location> <deadline>

라벨 컨벤션은 SKILL.md(jobs-pdf-to-excel)의 추출 규칙과 일치한다.
"""
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


def build(out: Path, title: str, company: str, role: str, location: str, deadline: str) -> None:
    font = register_korean_font()
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(out), pagesize=A4)
    style = ParagraphStyle("kr", fontName=font, fontSize=12, leading=16)
    story = [
        Paragraph(title, style),
        Spacer(1, 10),
        Paragraph(f"회사명: {company}", style),
        Paragraph(f"직무: {role}", style),
        Paragraph(f"근무지: {location}", style),
        Paragraph(f"마감일: {deadline}", style),
    ]
    doc.build(story)


if __name__ == "__main__":
    if len(sys.argv) < 7:
        print("usage: make-jobs-pdf.py <out.pdf> <title> <company> <role> <location> <deadline>", file=sys.stderr)
        sys.exit(2)
    out = Path(sys.argv[1])
    build(out, *sys.argv[2:7])
    print(f"wrote {out}")
