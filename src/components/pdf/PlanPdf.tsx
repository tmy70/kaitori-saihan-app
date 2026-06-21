// 事業計画書PDF（銀行提出用 / 社内方針確認用）
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS } from "./common";
import { Company, Project } from "@/lib/types";
import { calculate, calcBrokerage, breakEvenPrice } from "@/lib/calc";
import { fmtMan, fmtPct } from "@/lib/format";
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
  const rows: [string, string][] = [
    ["物件タイプ", PROPERTY_TYPE_LABELS[c.propertyType]],
    ["販売価格", `${fmtMan(c.sellPrice)} 万円`],
    ["取得原価", `${fmtMan(r.acquisitionCost)} 万円`],
    ["経費", `${fmtMan(r.expensesTotal)} 万円`],
    ["売上原価", `${fmtMan(r.costOfSales)} 万円`],
    ["粗利益（粗利率）", `${fmtMan(r.grossProfit)} 万円（${fmtPct(r.grossMargin)}）`],
    ["販売経費", `${fmtMan(r.sellingExpenses)} 万円`],
    ["営業利益（営業利益率）", `${fmtMan(r.operatingProfit)} 万円（${fmtPct(r.operatingMargin)}）`],
  ];
  return (
    <>
      <Text style={styles.sectionTitle}>収支計画（計算結果）</Text>
      {rows.map(([k, v], i) => (
        <View key={i} style={[styles.row, i >= 5 ? { backgroundColor: COLORS.light } : {}]}>
          <Text style={styles.cellLabel}>{k}</Text>
          <Text style={[styles.cellValue, i === 7 ? { color: COLORS.brand, fontSize: 11 } : {}]}>{v}</Text>
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

export function BankPlanPdf({ project, company }: { project: Project; company?: Company }) {
  return (
    <Document>
      <BasePage company={company}>
        <Text style={styles.docTitle}>事業計画書（銀行提出用）</Text>
        <Text style={{ textAlign: "center", color: COLORS.muted, marginBottom: 8 }}>
          発行：{company?.name ?? ""}　／　案件：{project.name}
        </Text>
        <Body text={project.bankPlan?.body ?? "（本文は事業計画書タブで生成・編集してください）"} />
        <FinanceTable project={project} />
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
