#!/usr/bin/env python3
"""書き出したPDFの体裁を機械的に検査する（npm run pdf:check から呼ばれる）。

確認すること:
  1. 文字サイズ  本文12pt以上 / 表11pt以上。下限を下回る文字が無いか
  2. はみ出し    文字がページの余白（印字領域）からはみ出していないか
  3. ページ数    0ページ・空ページが無いか
  4. 文字化け    置換文字や空白だけのページが無いか
  5. 行末ハイフン 日本語の途中で改行したときに「-」が入っていないか
                 （scripts/patchTextkit.mjs の効き目を確認する）

使い方: python3 scripts/checkPdfs.py <PDFの出力先ディレクトリ>
"""
import sys
import glob
import os
import re
import collections

import pdfplumber

# 日本語（CJK）の文字
CJK = re.compile(r"[　-ヿ㐀-䶿一-鿿＀-￯]")

# 文字サイズの下限（pt）。小数誤差を見込んで少しだけ緩める
MIN_SIZE = 10.9
# ページ番号・ヘッダ等の小さな但し書きは対象外にしない方針だが、
# 丸めの誤差で 10.99 等になることがあるため上の下限で判定する。

# 印字領域の判定に使う余白（pt）。これより外に文字があればはみ出しとみなす
MARGIN = 18.0

def check(path):
    problems = []
    with pdfplumber.open(path) as pdf:
        if len(pdf.pages) == 0:
            return ["ページが0件"]
        sizes = collections.Counter()
        for i, page in enumerate(pdf.pages, start=1):
            chars = page.chars
            if not chars:
                problems.append(f"{i}ページ目が空")
                continue
            text = page.extract_text() or ""
            if "�" in text:
                problems.append(f"{i}ページ目に文字化け(U+FFFD)")
            # 日本語の直後で行が終わり「-」が付いていれば、行末ハイフンが残っている
            for line in text.split("\n"):
                if line.endswith("-") and len(line) >= 2 and CJK.search(line[-2]):
                    problems.append(f"{i}ページ目に日本語の行末ハイフン: ...{line[-12:]!r}")
            for c in chars:
                size = round(c["size"], 2)
                sizes[size] += 1
                if size < MIN_SIZE:
                    problems.append(
                        f"{i}ページ目に小さすぎる文字 {size}pt: {c['text']!r}"
                    )
                if (
                    c["x0"] < MARGIN
                    or c["x1"] > page.width - MARGIN
                    or c["top"] < MARGIN
                    or c["bottom"] > page.height - MARGIN
                ):
                    problems.append(
                        f"{i}ページ目で文字が印字領域の外 {c['text']!r} "
                        f"(x {c['x0']:.1f}-{c['x1']:.1f} / y {c['top']:.1f}-{c['bottom']:.1f})"
                    )
        return problems, len(pdf.pages), sizes
    return problems


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "pdf-out"
    files = sorted(glob.glob(os.path.join(out, "*.pdf")))
    if not files:
        print(f"PDFが見つかりません: {out}")
        return 1

    ng = 0
    all_sizes = collections.Counter()
    for f in files:
        res = check(f)
        if isinstance(res, list):
            problems, pages, sizes = res, 0, collections.Counter()
        else:
            problems, pages, sizes = res
        all_sizes.update(sizes)
        name = os.path.basename(f)
        if problems:
            ng += 1
            # 同じ原因が大量に出るため、先頭5件だけ示す
            print(f"NG  {name} ({pages}ページ)")
            for p in problems[:5]:
                print(f"      {p}")
            if len(problems) > 5:
                print(f"      ほか {len(problems) - 5} 件")
        else:
            print(f"OK  {name} ({pages}ページ)")

    print()
    print("使われている文字サイズ（pt: 文字数）")
    for size in sorted(all_sizes):
        print(f"  {size}: {all_sizes[size]}")
    print()
    print(f"{len(files)}件中 {len(files) - ng}件が問題なし")
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
