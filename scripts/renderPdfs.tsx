// ============================================================
// PDFの実描画チェック（手元での確認用。npm run pdf:check）
//
// 7種のPDFを実際に描画してファイルに書き出す。
// 文字サイズ・ページ数・はみ出しは、書き出したPDFを scripts/checkPdfs.py で機械的に検査する。
// ブラウザを開かずに体裁の崩れへ気づけるようにするのが目的。
// ============================================================
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { Font, renderToFile } from "@react-pdf/renderer";

import { SateiPdf } from "../src/components/pdf/SateiPdf";
import { HoshoPdf } from "../src/components/pdf/HoshoPdf";
import { HikakuPdf } from "../src/components/pdf/HikakuPdf";
import { KonkyoPdf } from "../src/components/pdf/KonkyoPdf";
import { BankPdf } from "../src/components/pdf/BankPdf";
import { CalcPdf } from "../src/components/pdf/CalcPdf";
import { RingiPdf } from "../src/components/pdf/RingiPdf";
import { createSampleProject } from "../src/lib/sampleData";
import { normalizeProject } from "../src/lib/migrate";
import { INITIAL_COMPANIES } from "../src/lib/companies";
import { BANK_SCHEDULE_ROWS, Project, PropertyType } from "../src/lib/types";
import { priceLines } from "../src/lib/assessment";

const OUT = process.argv[2] || path.join(process.cwd(), "pdf-out");

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/NotoSansJP-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "public/fonts/NotoSansJP-Bold.ttf"), fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word) => (word.length > 1 ? Array.from(word) : [word]));

/** 実運用に近い、項目がひととおり埋まった案件を作る */
function fullProject(type: PropertyType): Project {
  const base = normalizeProject(createSampleProject(type));
  const lines = priceLines(type, base.assessment);
  return {
    ...base,
    name: `検証用案件（${type}）`,
    stage: "decided",
    assessment: {
      ...base.assessment!,
      address: "富山県富山市五福ハイツ南町一丁目2番3号",
      buildingAge: "1998年築（築27年）",
      staff: "富永 直樹",
      landAreaSqm: 176.87,
      buildingAreaSqm: 105.3,
      brokerAssessPrice: Math.round(base.assessment!.resalePrice * 0.95),
      offerPrice: lines[3].displayPrice,
      selectedProfitLine: 250,
    },
    docs: {
      ...base.docs,
      sellerName: "富山 太郎",
      issueDate: "2026-04-01",
      validUntil: "2026-05-01",
      sellerFee: "none",
      mediationDate: "2026-04-01",
      guaranteeUntil: "2026-07-01",
      brokerageMonths: "3〜6か月程度",
    },
    bank: {
      lotNumber: "五福ハイツ南町一丁目2番3",
      landCategory: "宅地",
      structure: "木造スレート葺2階建",
      useDistrict: "第一種低層住居専用地域",
      buildingCoverage: "60%",
      floorAreaRatio: "200%",
      roadAccess: "南側 幅員4.0m 市道に間口8.0mで接道",
      usage: "居住用",
      saleTiming: "2026年9月〜12月",
      saleMethod: "自社ホームページおよび不動産ポータルサイトへの掲載、現地販売会の実施",
      loanAmount: 1500,
      ownFunds: 300,
      repaymentSource: "本物件の売却代金",
      repaymentTiming: "売却決済時に一括返済",
      schedule: BANK_SCHEDULE_ROWS.map((r, i) => ({ ...r, when: `2026年${i + 4}月` })),
    },
    bankPlan: {
      body: "【事業概要】\n本事業は、富山市中心部へのアクセスが良い住宅地に所在する戸建住宅を取得し、内外装の改修を行ったうえで、子育て世帯を主な対象として再販売するものです。\n【リスクと対策】\n販売期間が長期化した場合に備え、価格改定の判断時期をあらかじめ定めて運用します。",
      edited: true,
    },
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const company = INITIAL_COMPANIES[0];
  const types: PropertyType[] = ["building", "land", "kenuri", "mansion", "subdivision"];

  for (const type of types) {
    const p = fullProject(type);
    const docs: [string, React.ReactElement][] = [
      ["satei", <SateiPdf project={p} company={company} />],
      ["hosho", <HoshoPdf project={p} company={company} />],
      ["hikaku", <HikakuPdf project={p} company={company} />],
      ["konkyo", <KonkyoPdf project={p} company={company} />],
      ["bank", <BankPdf project={p} company={company} />],
      ["calc", <CalcPdf project={p} company={company} />],
      ["ringi", <RingiPdf project={p} company={company} />],
    ];
    for (const [name, el] of docs) {
      const file = path.join(OUT, `${type}_${name}.pdf`);
      await renderToFile(el, file);
      process.stdout.write(`${path.basename(file)}\n`);
    }

    // 比較表は「売主様側の仲介手数料あり」の場合も書き出す（記載が切り替わることの確認用）
    if (type === "building") {
      const charged: Project = { ...p, docs: { ...p.docs, sellerFee: "charged" } };
      const file = path.join(OUT, `${type}_hikaku-charged.pdf`);
      await renderToFile(<HikakuPdf project={charged} company={company} />, file);
      process.stdout.write(`${path.basename(file)}\n`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
