#!/usr/bin/env python3
"""Generate test-fixtures/sample.pdf with Korean text + a small table.

ReportLab은 외부 폰트로 한국어를 렌더링한다. 시스템에 깔린 WenQuanYi(TTF/TTC) 또는
폴백으로 사용 가능한 다른 unicode 폰트를 자동 탐색한다.
"""
from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors

KOREAN_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/unfonts-core/UnDotum.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]


def register_korean_font() -> str:
    for path in KOREAN_FONT_CANDIDATES:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont("KR", path))
                return "KR"
            except Exception:
                continue
    raise RuntimeError(
        "한국어 TTF 폰트를 찾지 못했습니다. /usr/share/fonts/ 아래에 한글 폰트를 설치하세요."
    )


def build(out_path: Path) -> None:
    font_name = register_korean_font()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(str(out_path), pagesize=A4)
    style = ParagraphStyle(
        "kr",
        fontName=font_name,
        fontSize=12,
        leading=16,
    )

    story = []
    story.append(Paragraph("진학 채용공고 샘플", style))
    story.append(Spacer(1, 12))
    story.append(Paragraph("회사명: 진학에듀", style))
    story.append(Paragraph("직무: 백엔드 엔지니어", style))
    story.append(Paragraph("근무지: 서울 강남구", style))
    story.append(Paragraph("마감일: 2026년 6월 30일", style))
    story.append(Spacer(1, 16))

    table_data = [
        ["항목", "내용"],
        ["경력", "3년 이상"],
        ["스택", "Python, FastAPI"],
        ["복지", "유연근무, 식대"],
    ]
    table = Table(table_data, hAlign="LEFT", colWidths=[120, 240])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ]
        )
    )
    story.append(table)
    doc.build(story)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "sample.pdf"
    build(out)
    print(f"wrote {out}")
