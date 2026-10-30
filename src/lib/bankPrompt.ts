// ============================================================
// 銀行提出用「事業概要」の下書きをAIに頼むための依頼文を組み立てる。
//
// 数値はPDF側が計算結果から印字するため、ここでは文章（事業概要・リスクと対策）だけを頼む。
// 依頼文に数値を添えるのは、文章が実態と食い違わないようにするため。
// ============================================================
import { calculate } from "./calc";
import { fmtMan, fmtPct, fmtManAsYen } from "./format";
import { ngLabels } from "./checklist";
import { Company, PROPERTY_TYPE_LABELS, Project } from "./types";

export function buildBankPrompt(project: Project, company?: Company): string {
  const r = calculate(project.calc);
  const a = project.assessment;
  const bank = project.bank ?? {};

  const facts = [
    `発行会社: ${company?.name ?? ""}`,
    `案件名: ${project.name}`,
    `種別: ${PROPERTY_TYPE_LABELS[project.propertyType]}`,
    `所在地: ${a?.address ?? ""}`,
    bank.useDistrict ? `用途地域: ${bank.useDistrict}` : "",
    bank.roadAccess ? `接道: ${bank.roadAccess}` : "",
    bank.structure ? `構造: ${bank.structure}` : "",
    a?.buildingAge ? `築年: ${a.buildingAge}` : "",
    `販売価格: ${fmtManAsYen(project.calc.sellPrice)}`,
    `取得原価: ${fmtMan(r.acquisitionCost)} 万円`,
    `経費: ${fmtMan(r.expensesTotal)} 万円`,
    `粗利益: ${fmtMan(r.grossProfit)} 万円（${fmtPct(r.grossMargin)}）`,
    `営業利益: ${fmtMan(r.operatingProfit)} 万円（${fmtPct(r.operatingMargin)}）`,
    bank.loanAmount ? `借入希望額: ${fmtManAsYen(bank.loanAmount)}` : "",
    bank.repaymentSource ? `返済原資: ${bank.repaymentSource}` : "",
    bank.saleTiming ? `販売時期: ${bank.saleTiming}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ngs = ngLabels(project.ringi?.checklist ?? []);
  const risks = ngs.length > 0 ? ngs.map((n) => `- ${n}`).join("\n") : "（特になし）";

  return `あなたは日本の中小不動産会社の事業計画書を作成する担当者です。
以下の案件について、銀行提出用 事業計画書の「事業概要」と「リスクと対策」の本文を、
日本語の堅実なビジネス文書として作成してください。

【守ること】
- 数値は事実です。改変・創作しないこと。収支の表はこちらで別途作成するため、本文に表は作らないこと。
- 章立ては【事業概要】【リスクと対策】の2つのみ。見出しは【】で囲むこと。
- 事業概要では、立地・周辺の生活利便性・商品性（どのような買主に、どのように売るか）を具体的に書くこと。
- 誇張した表現や、根拠のない断定は使わないこと。
- 出力は本文のみ（前置き・コードブロックは不要）。

# 案件の事実（改変禁止）
${facts}

# 社内チェックで挙がった懸念点
${risks}
`;
}
