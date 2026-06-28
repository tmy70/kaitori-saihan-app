// 事業計画書PDF（銀行提出用 / 社内方針確認用）
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS } from "./common";
import { Company, Project } from "@/lib/types";
import {
  calculate,
  calcBrokerage,
  breakEvenPrice,
  tsuboUnitPrice,
  usesTsuboPrice,
  consolidatedProfit,
  receivedBrokerage,
  lotPrice,
  sumLotsPrice,
  sumLotsTsubo,
  sumLotsArea,
  avgLotUnitPrice,
} from "@/lib/calc";
import { fmtMan, fmtPct, fmtYen, manToYen } from "@/lib/format";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS, ItemDef } from "@/lib/itemDefs";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";

// 本文（プレーン/簡易Markdown）を段落・見出しに分解して描画
function Body({ text }: { text: string }) {
  const lines = (text || "").split(/\r?\n/);
  return (
    <View>
      {lines.map((line, i) => {
        const t = line.trim();
        if (t === "") return <View key={i} style={{ height: 4 }} />;
        // 見出し: # / ## / 【...】
        if (/^#{1,3}\s/.test(t) || /^【.*】$/.test(t)) {
          const label = t.replace(/^#{1,3}\s/, "");
          return (
            <Text key={i} style={styles.sectionTitle}>
              {label}
            </Text>
          );
        }
        // 箇条書き
        if (/^[-・*]\s/.test(t)) {
          return (
            <Text key={i} style={{ marginBottom: 2, marginLeft: 8 }}>
              ・{t.replace(/^[-・*]\s/, "")}
            </Text>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            {t.replace(/\*\*/g, "")}
          </Text>
        );
      })}
    </View>
  );
}

function FinanceTable({ project }: { project: Project }) {
  const c = project.calc;
  const r = calculate(c);
  const unitPrice = tsuboUnitPrice(c.sellPrice, c.tsubo);
  // accent: 集計行の背景強調、brand: 営業利益の強調
  const rows: { k: string; v: string; accent?: boolean; brand?: boolean }[] = [
    { k: "物件タイプ", v: PROPERTY_TYPE_LABELS[c.propertyType] },
    { k: "販売価格", v: `${fmtMan(c.sellPrice)} 万円` },
  ];
  if (usesTsuboPrice(c.propertyType) && unitPrice > 0) {
    rows.push({ k: "坪単価", v: `${fmtMan(unitPrice)} 万円/坪${c.tsubo ? `（${fmtMan(c.tsubo)} 坪）` : ""}` });
  }
  rows.push(
    { k: "取得原価", v: `${fmtMan(r.acquisitionCost)} 万円` },
    { k: "経費", v: `${fmtMan(r.expensesTotal)} 万円` },
    { k: "売上原価", v: `${fmtMan(r.costOfSales)} 万円` },
    { k: "粗利益（粗利率）", v: `${fmtMan(r.grossProfit)} 万円（${fmtPct(r.grossMargin)}）`, accent: true },
    { k: "販売経費", v: `${fmtMan(r.sellingExpenses)} 万円`, accent: true },
    { k: "営業利益（営業利益率）", v: `${fmtMan(r.operatingProfit)} 万円（${fmtPct(r.operatingMargin)}）`, accent: true, brand: true }
  );
  if (c.groupBrokerage) {
    rows.push({
      k: "連結粗利（自社グループ仲介）",
      v: `${fmtMan(consolidatedProfit(r, c))} 万円`,
      accent: true,
      brand: true,
    });
  }
  return (
    <>
      <Text style={styles.sectionTitle}>収支計画（計算結果）</Text>
      {rows.map((row, i) => (
        <View key={i} style={[styles.row, row.accent ? { backgroundColor: COLORS.light } : {}]}>
          <Text style={styles.cellLabel}>{row.k}</Text>
          <Text style={[styles.cellValue, row.brand ? { color: COLORS.brand, fontSize: 11 } : {}]}>{row.v}</Text>
        </View>
      ))}
    </>
  );
}

function SimulationSection({ project }: { project: Project }) {
  const base = calculate(project.calc);
  const calc = project.calc;
  const rows = project.scenarios.map((s) => {
    const sellPrice = calc.sellPrice + s.sellPriceDelta;
    const acquisitionCost = base.acquisitionCost + s.costDelta;
    const costOfSales = acquisitionCost + base.expensesTotal;
    const grossProfit = sellPrice - costOfSales;
    const oldBrokerage = calc.selling.sellBrokerage ?? 0;
    const sellingExpenses = base.sellingExpenses - oldBrokerage + calcBrokerage(sellPrice);
    const operatingProfit = grossProfit - sellingExpenses;
    const operatingMargin = sellPrice > 0 ? operatingProfit / sellPrice : 0;
    return { label: s.label, sellPrice, grossProfit, operatingProfit, operatingMargin };
  });
  const otherSelling = base.sellingExpenses - (calc.selling.sellBrokerage ?? 0);
  const be0 = breakEvenPrice(base.costOfSales, 0, otherSelling, 0);
  const be10 = breakEvenPrice(base.costOfSales, 0, otherSelling, 0.1);

  return (
    <>
      <Text style={styles.sectionTitle} break>
        価格変更シミュレーション
      </Text>
      <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
        <Text style={[styles.td, { width: "28%", fontWeight: "bold" }]}>シナリオ</Text>
        <Text style={[styles.td, { width: "20%", textAlign: "right", fontWeight: "bold" }]}>販売価格</Text>
        <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold" }]}>粗利益</Text>
        <Text style={[styles.td, { width: "20%", textAlign: "right", fontWeight: "bold" }]}>営業利益</Text>
        <Text style={[styles.td, { width: "10%", textAlign: "right", fontWeight: "bold" }]}>率</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row" }}>
          <Text style={[styles.td, { width: "28%" }]}>{r.label}</Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmtMan(r.sellPrice)}</Text>
          <Text style={[styles.td, { width: "22%", textAlign: "right" }]}>{fmtMan(r.grossProfit)}</Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right", color: r.operatingProfit >= 0 ? COLORS.brand : "#dc2626" }]}>
            {fmtMan(r.operatingProfit)}
          </Text>
          <Text style={[styles.td, { width: "10%", textAlign: "right" }]}>{fmtPct(r.operatingMargin, 0)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
        <Text>損益分岐 販売価格（営業利益0）：<Text style={{ fontWeight: "bold" }}>{fmtMan(be0)} 万円</Text></Text>
        <Text>目標利益率10%の価格：<Text style={{ fontWeight: "bold", color: COLORS.brand }}>{fmtMan(be10)} 万円</Text></Text>
      </View>
    </>
  );
}

// ============================================================
// 銀行提出用：円表記の詳細な収支表（参考フォルダの事業計画書の書式に準拠）
// ============================================================

/** 円表記の費目明細テーブル（項目・金額(円)・備考）。金額0は既定で非表示。 */
function YenItemTable({
  heading,
  items,
  values,
  totalLabel,
  hideZero,
}: {
  heading: string;
  items: ItemDef[];
  values: Record<string, number>;
  totalLabel: string;
  hideZero: boolean;
}) {
  const shown = items.filter((it) => {
    if (!hideZero) return true;
    const v = values[it.key];
    return Number.isFinite(v) && v !== 0 && (it.label ?? "").trim() !== "";
  });
  const total = items.reduce((a, it) => a + (Number.isFinite(values[it.key]) ? values[it.key] : 0), 0);
  return (
    <>
      <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 8, marginBottom: 3 }}>{heading}</Text>
      <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
        <Text style={[styles.td, { width: "52%", fontWeight: "bold" }]}>項目</Text>
        <Text style={[styles.td, { width: "26%", textAlign: "right", fontWeight: "bold" }]}>金額（円）</Text>
        <Text style={[styles.td, { width: "22%", fontWeight: "bold" }]}>備考</Text>
      </View>
      {shown.map((it) => (
        <View key={it.key} style={{ flexDirection: "row" }}>
          <Text style={[styles.td, { width: "52%" }]}>{it.label || "（費目）"}</Text>
          <Text style={[styles.td, { width: "26%", textAlign: "right" }]}>{fmtYen(manToYen(values[it.key] ?? 0))}</Text>
          <Text style={[styles.td, { width: "22%", fontSize: 7, color: COLORS.muted }]}>{it.note ?? ""}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
        <Text style={[styles.td, { width: "52%", fontWeight: "bold" }]}>{totalLabel}</Text>
        <Text style={[styles.td, { width: "26%", textAlign: "right", fontWeight: "bold" }]}>{fmtYen(manToYen(total))}</Text>
        <Text style={[styles.td, { width: "22%" }]}> </Text>
      </View>
    </>
  );
}

/** 対象不動産の概要（稟議書の物件情報から自動生成）。空欄の項目は出力しない。 */
function PropertyOverview({ project }: { project: Project }) {
  const ri = project.ringi;
  const c = project.calc;
  const isMansion = project.propertyType === "mansion";
  const isSubdivision = project.propertyType === "subdivision";
  const lots = c.lots ?? [];
  // 面積（分譲地は区画合計、その他は計算書の坪数欄 or 稟議書の面積テキスト）
  const areaSqm = isSubdivision ? sumLotsArea(lots) : c.areaSqm;
  const tsubo = isSubdivision ? sumLotsTsubo(lots) : c.tsubo;
  const tsuboText = tsubo ? `${fmtMan(tsubo)} 坪` : "";
  const areaText = areaSqm ? `${fmtMan(areaSqm)} ㎡${tsuboText ? `（${tsuboText}）` : ""}` : "";
  const pairs: [string, string][] = [
    ["物件所在地", ri.address],
    ["物件種別", ri.propertyKind || PROPERTY_TYPE_LABELS[project.propertyType]],
    [isMansion ? "専有面積" : "土地面積", areaText || (isMansion ? ri.exclusiveArea : ri.landArea)],
    ...(isSubdivision ? ([["区画数", lots.length ? `${lots.length} 区画` : ""]] as [string, string][]) : []),
    ["建物面積", isMansion || isSubdivision ? "" : ri.buildingArea],
    ["築年数", isSubdivision ? "" : ri.buildingAge],
    ["構造", isSubdivision ? "" : ri.structure],
    ["駐車場", isMansion ? ri.mansionParking : isSubdivision ? "" : ri.parking],
    ["路線価", ri.rosenka],
  ];
  const rows = pairs.filter(([, v]) => v && String(v).trim() !== "");
  if (rows.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>対象不動産の概要</Text>
      {rows.map(([k, v], i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.cellLabel}>{k}</Text>
          <Text style={[styles.cellValue, { textAlign: "left", fontWeight: "normal" }]}>{v}</Text>
        </View>
      ))}
    </>
  );
}

/** 銀行提出用の詳細収支（取得原価・経費・販売経費の明細＋収益見込み）を円で出力 */
function BankFinanceTables({ project }: { project: Project }) {
  const c = project.calc;
  const r = calculate(c);
  const hideZero = !(c.showZeroInPdf ?? false);
  const acqItems: ItemDef[] = [...ACQUISITION_ITEMS[c.propertyType], ...(c.acquisitionExtra ?? [])];
  const expItems: ItemDef[] = [...EXPENSE_ITEMS[c.propertyType], ...(c.expensesExtra ?? [])];
  const sellItems: ItemDef[] = [...SELLING_ITEMS, ...(c.sellingExtra ?? [])];
  const showTsubo = usesTsuboPrice(c.propertyType);
  const unitPrice = tsuboUnitPrice(c.sellPrice, c.tsubo);
  const isSubdivision = c.propertyType === "subdivision";
  const lots = c.lots ?? [];
  // 想定販売価格の算定根拠（坪単価）
  const priceBasis = isSubdivision
    ? `全${lots.length}区画 合計（合計${fmtMan(sumLotsTsubo(lots))}坪・平均坪単価${fmtMan(avgLotUnitPrice(lots))}万円）`
    : showTsubo && unitPrice > 0 && c.tsubo
    ? `${fmtMan(c.tsubo)}坪 × ${fmtMan(unitPrice)}万円/坪`
    : "";

  // 収益見込み（区分・金額(円)・算定根拠）
  const profitRows: { k: string; v: number; basis: string; accent?: boolean }[] = [
    { k: "想定販売価格", v: c.sellPrice, basis: priceBasis },
    { k: "売上原価（取得原価＋経費）", v: r.costOfSales, basis: "取得原価＋経費" },
    { k: "粗利益", v: r.grossProfit, basis: `販売価格−売上原価（粗利率 ${fmtPct(r.grossMargin)}）` },
    { k: "販売経費", v: r.sellingExpenses, basis: "" },
    { k: "営業利益", v: r.operatingProfit, basis: `粗利益−販売経費（営業利益率 ${fmtPct(r.operatingMargin)}）`, accent: true },
  ];
  if (c.groupBrokerage) {
    profitRows.push({
      k: "連結粗利",
      v: consolidatedProfit(r, c),
      basis: `営業利益＋受取仲介手数料 ${fmtYen(manToYen(receivedBrokerage(c)))}円（税抜）`,
      accent: true,
    });
  }

  return (
    <>
      <Text style={styles.sectionTitle} break>
        収支計画（単位：円）
      </Text>
      {/* 分譲地：区画別の販売明細（円） */}
      {isSubdivision && lots.length > 0 && (
        <>
          <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 8, marginBottom: 3 }}>区画別 販売明細</Text>
          <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
            <Text style={[styles.td, { width: "28%", fontWeight: "bold" }]}>区画</Text>
            <Text style={[styles.td, { width: "18%", textAlign: "right", fontWeight: "bold" }]}>面積(坪)</Text>
            <Text style={[styles.td, { width: "24%", textAlign: "right", fontWeight: "bold" }]}>坪単価(万)</Text>
            <Text style={[styles.td, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>販売価格(円)</Text>
          </View>
          {lots.map((l) => (
            <View key={l.id} style={{ flexDirection: "row" }}>
              <Text style={[styles.td, { width: "28%" }]}>{l.name || "（区画）"}</Text>
              <Text style={[styles.td, { width: "18%", textAlign: "right" }]}>{fmtMan(l.tsubo ?? 0)}</Text>
              <Text style={[styles.td, { width: "24%", textAlign: "right" }]}>{fmtMan(l.unitPrice ?? 0)}</Text>
              <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>{fmtYen(manToYen(lotPrice(l)))}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
            <Text style={[styles.td, { width: "28%", fontWeight: "bold" }]}>合計（{lots.length}区画）</Text>
            <Text style={[styles.td, { width: "18%", textAlign: "right", fontWeight: "bold" }]}>{fmtMan(sumLotsTsubo(lots))}</Text>
            <Text style={[styles.td, { width: "24%", textAlign: "right" }]}>平均{fmtMan(avgLotUnitPrice(lots))}</Text>
            <Text style={[styles.td, { width: "30%", textAlign: "right", fontWeight: "bold", color: COLORS.brand }]}>{fmtYen(manToYen(sumLotsPrice(lots)))}</Text>
          </View>
        </>
      )}
      <YenItemTable heading="取得原価（売上原価の内訳）" items={acqItems} values={c.acquisition} totalLabel="取得原価 合計" hideZero={hideZero} />
      <YenItemTable heading="経費" items={expItems} values={c.expenses} totalLabel="経費 合計" hideZero={hideZero} />
      <YenItemTable heading="販売経費" items={sellItems} values={c.selling} totalLabel="販売経費 合計" hideZero={hideZero} />

      <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 8, marginBottom: 3 }}>収益見込み</Text>
      <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
        <Text style={[styles.td, { width: "34%", fontWeight: "bold" }]}>区分</Text>
        <Text style={[styles.td, { width: "26%", textAlign: "right", fontWeight: "bold" }]}>金額（円）</Text>
        <Text style={[styles.td, { width: "40%", fontWeight: "bold" }]}>算定根拠</Text>
      </View>
      {profitRows.map((row, i) => (
        <View key={i} style={[{ flexDirection: "row" }, row.accent ? { backgroundColor: COLORS.light } : {}]}>
          <Text style={[styles.td, { width: "34%", fontWeight: row.accent ? "bold" : "normal" }]}>{row.k}</Text>
          <Text
            style={[
              styles.td,
              { width: "26%", textAlign: "right", fontWeight: row.accent ? "bold" : "normal" },
              row.accent ? { color: COLORS.brand } : {},
            ]}
          >
            {fmtYen(manToYen(row.v))}
          </Text>
          <Text style={[styles.td, { width: "40%", fontSize: 7, color: COLORS.muted }]}>{row.basis}</Text>
        </View>
      ))}
    </>
  );
}

/** 資金計画（借入計画）。売上原価を借入希望額とし、決済日・返済原資を自動表示（参考書式§5準拠）。 */
function FundingPlan({ project }: { project: Project }) {
  const r = calculate(project.calc);
  const sch = project.ringi.schedule ?? [];
  const dateOf = (key: string) => sch.find((s) => s.key === key)?.date || "";
  const settlement = dateOf("settlement"); // ②売買決済
  const saleSettlement = dateOf("saleSettlement"); // ⑨売却決済（入金）
  const rows: [string, string][] = [
    ["借入希望額", `${fmtYen(manToYen(r.costOfSales))} 円（売上原価相当）`],
    ["借入実行（必要）時期", settlement || "売買決済時"],
    ["返済原資", "本物件の売却代金"],
    ["返済予定時期", saleSettlement || "売却決済（入金）時"],
  ];
  if (settlement && saleSettlement) {
    rows.push(["借入希望期間", `${settlement} 〜 ${saleSettlement}`]);
  }
  return (
    <>
      <Text style={styles.sectionTitle}>資金計画（借入計画）</Text>
      {rows.map(([k, v], i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.cellLabel}>{k}</Text>
          <Text style={[styles.cellValue, { textAlign: "left", fontWeight: "normal" }]}>{v}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 7.5, color: COLORS.muted, marginTop: 3 }}>
        ※ 取得資金を融資にて調達し、再販売の決済代金で一括返済する計画です。販売経費は売却代金から支払います。
      </Text>
    </>
  );
}

export function BankPlanPdf({ project, company }: { project: Project; company?: Company }) {
  return (
    <Document>
      <BasePage company={company}>
        {/* 銀行提出用は表面に「銀行提出用」の文言を出さない（タイトルは「事業計画書」のみ） */}
        <Text style={styles.docTitle}>事業計画書</Text>
        <Text style={{ textAlign: "center", color: COLORS.muted, marginBottom: 8 }}>
          発行：{company?.name ?? ""}　／　案件：{project.name}
        </Text>
        <Body text={project.bankPlan?.body ?? "（本文は事業計画書タブで生成・編集してください）"} />
        {/* 対象不動産の概要・円表記の詳細な収支表を自動添付（参考フォルダの書式に準拠） */}
        <PropertyOverview project={project} />
        <BankFinanceTables project={project} />
        <FundingPlan project={project} />
      </BasePage>
    </Document>
  );
}

export function InternalPlanPdf({ project, company }: { project: Project; company?: Company }) {
  return (
    <Document>
      <BasePage company={company}>
        <Text style={styles.docTitle}>事業計画書（社内方針確認用）</Text>
        <Text style={{ textAlign: "center", color: COLORS.muted, marginBottom: 8 }}>
          発行：{company?.name ?? ""}　／　案件：{project.name}
        </Text>
        <Body text={project.internalPlan?.body ?? "（本文は事業計画書タブで生成・編集してください）"} />
        <FinanceTable project={project} />
        <SimulationSection project={project} />
      </BasePage>
    </Document>
  );
}
