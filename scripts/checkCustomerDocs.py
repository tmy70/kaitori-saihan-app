#!/usr/bin/env python3
"""お客様向け書類の中身を点検する（npm run pdf:check の補助）。

買取査定書・買取保証書・仲介と買取の比較表は売主様にお渡しするものなので、
弊社の粗利や原価の内訳が載っていてはいけない。また、絵文字などの装飾も入れない。

  1. 社内用語（粗利・営業利益・売上原価・取得原価 等）が載っていないか
  2. 絵文字・装飾記号が入っていないか

使い方: python3 scripts/checkCustomerDocs.py <PDFの出力先ディレクトリ>
"""
import sys
import glob
import os
import re

import pdfplumber

# お客様向け書類（この3種に社内の数字が出てはいけない）
CUSTOMER_KINDS = ("satei", "hosho", "hikaku")

# 載っていてはいけない社内用語
INTERNAL_WORDS = [
    "粗利",
    "営業利益",
    "売上原価",
    "取得原価",
    "販売経費",
    "利益率",
    "リフォーム費用",
    "造成費用",
    "解体費用",
    "不動産取得税",
    "登記費用",
    "固都税",
    "収束計算",
    "再販想定価格",
]

# 絵文字・装飾記号（書面には入れない）
DECORATION = re.compile(
    "[\U0001f300-\U0001faff←-⇿☀-➿⬀-⯿️✔✖❌⭐]"
)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "pdf-out"
    files = sorted(glob.glob(os.path.join(out, "*.pdf")))
    if not files:
        print(f"PDFが見つかりません: {out}")
        return 1

    ng = 0
    checked = 0
    for f in files:
        name = os.path.basename(f)
        # ファイル名は「種別_書類」。書類名に "-変化形" が付く場合（hikaku-charged）も同じ書類として扱う
        kind = name.replace(".pdf", "").split("_")[-1].split("-")[0]
        problems = []
        with pdfplumber.open(f) as pdf:
            text = "\n".join((p.extract_text() or "") for p in pdf.pages)

        # 装飾記号はすべての書類で不可
        for m in set(DECORATION.findall(text)):
            problems.append(f"装飾記号 {m!r} が入っている")

        # 社内用語はお客様向けの3種のみ対象
        if kind in CUSTOMER_KINDS:
            checked += 1
            for w in INTERNAL_WORDS:
                if w in text:
                    problems.append(f"社内用語「{w}」が載っている")

        if problems:
            ng += 1
            print(f"NG  {name}")
            for p in problems:
                print(f"      {p}")

    print()
    print(f"お客様向け書類 {checked}件を点検。{'問題なし' if ng == 0 else f'{ng}件に問題あり'}")
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
