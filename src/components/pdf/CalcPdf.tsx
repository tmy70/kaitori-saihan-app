// 計算書PDF
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS } from "./common";
import { Company, Project } from "@/lib/types";
import {
  calculate,
  tsuboUnitPrice,
  usesTsuboPrice,
  consolidatedProfit,
  receivedBrokerage,
  lotPrice,
  sumLotsPrice,
  sumLotsTsubo,
  avgLotUnitPrice,
} from "@/lib/calc";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS, ItemDef } from "@/lib/itemDefs";
import { fmtMan, fmtPct } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";

function Rows({
  items,
  values,
  hideZero,
}: {
  items: ItemDef[];
  values: Record<string, number>;
  hideZero: boolean;
}) {
  // hideZero のとき、金額0・未入力・費目名未入力の費目は出力しない（1ページに収めるため）
  const shown = items.filter((it) => {
    if (!hideZero) return true;
    const v = values[it.key];
    return Number.isFinite(v) && v !== 0 && (it.label ?? "").trim() !== "";
  });
  return (
    <>
      {shown.map((it) => (
        <View key={it.key} style={styles.row}>
          <Text style={styles.cellLabel}>{it.label || "（費目名未入力）"}</Text>
          <Text style={styles.cellValue}>{fmtMan(values[it.key] ?? 0)} 万円</Text>
        </View>
      ))}
    </>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={[styles.row, { backgroundColor: COLORS.light }]}>
      <Text style={[styles.cellLabel, { fontWeight: "bold", color: COLORS.text }]}>{label}</Text>
      <Text style={[styles.cellValue, accent ? { color: COLORS.brand, fontSize: 11 } : {}]}>
        {fmtMan(value)} 万円
      </Text>
    </View>
  );
}

export function CalcPdf({ project, company }: { project: Project; company?: Company }) {
  const c = project.calc;
  const r = calculate(c);
  // 既定では金額0・未入力の費目は出力しない（showZeroInPdf ですべて表示に切替可）
  const hideZero = !(c.showZeroInPdf ?? false);
  // 既定の費目 ＋ 追加費目（手動で足した費目）を結合して出力する
  const acqItems: ItemDef[] = [...ACQUISITION_ITEMS[c.propertyType], ...(c.acquisitionExtra ?? [])];
  const expItems: ItemDef[] = [...EXPENSE_ITEMS[c.propertyType], ...(c.expensesExtra ?? [])];
  const sellItems: ItemDef[] = [...SELLING_ITEMS, ...(c.sellingExtra ?? [])];
  // 坪単価（土地・マンションのみ）
  const showTsubo = usesTsuboPrice(c.propertyType);
  const unitPrice = tsuboUnitPrice(c.sellPrice, c.tsubo);
  // 分譲地：区画一覧
  const isSubdivision = c.propertyType === "subdivision";
  const lots = c.lots ?? [];
  return (
    <Document>
      <BasePage company={company}>
        <Text style={styles.docTitle}>{company?.name ?? ""} 収支計算書</Text>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>案件名</Text>
          <Text style={styles.cellValue}>{project.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>物件タイプ</Text>
          <Text style={styles.cellValue}>{PROPERTY_TYPE_LABELS[c.propertyType]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>販売価格</Text>
          <Text style={[styles.cellValue, { color: COLORS.brand }]}>{fmtMan(c.sellPrice)} 万円</Text>
        </View>
        {showTsubo && unitPrice > 0 && (
          <View style={styles.row}>
            <Text style={styles.cellLabel}>坪単価</Text>
            <Text style={styles.cellValue}>
              {fmtMan(unitPrice)} 万円/坪{c.tsubo ? `（${fmtMan(c.tsubo)} 坪）` : ""}
            </Text>
          </View>
        )}

        {/* 分譲地：区画別の販売明細 */}
        {isSubdivision && lots.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>区画別 販売明細</Text>
            <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
              <Text style={[styles.td, { width: "34%", fontWeight: "bold" }]}>区画</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold" }]}>坪数</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold" }]}>坪単価</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold" }]}>価格</Text>
            </View>
            {lots.map((l) => (
              <View key={l.id} style={{ flexDirection: "row" }}>
                <Text style={[styles.td, { width: "34%" }]}>{l.name || "（区画）"}</Text>
                <Text style={[styles.td, { width: "22%", textAlign: "right" }]}>{fmtMan(l.tsubo ?? 0)} 坪</Text>
                <Text style={[styles.td, { width: "22%", textAlign: "right" }]}>{fmtMan(l.unitPrice ?? 0)} 万/坪</Text>
                <Text style={[styles.td, { width: "22%", textAlign: "right" }]}>{fmtMan(lotPrice(l))} 万円</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", backgroundColor: COLORS.light }}>
              <Text style={[styles.td, { width: "34%", fontWeight: "bold" }]}>合計（{lots.length}区画）</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold" }]}>{fmtMan(sumLotsTsubo(lots))} 坪</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right" }]}>平均{fmtMan(avgLotUnitPrice(lots))}</Text>
              <Text style={[styles.td, { width: "22%", textAlign: "right", fontWeight: "bold", color: COLORS.brand }]}>{fmtMan(sumLotsPrice(lots))} 万円</Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>取得原価</Text>
        <Rows items={acqItems} values={c.acquisition} hideZero={hideZero} />
        <TotalRow label="取得原価 合計" value={r.acquisitionCost} />

        <Text style={styles.sectionTitle}>経費</Text>
        <Rows items={expItems} values={c.expenses} hideZero={hideZero} />
        <TotalRow label="経費 合計" value={r.expensesTotal} />

        <TotalRow label="売上原価（取得原価＋経費）" value={r.costOfSales} />

        <Text style={styles.sectionTitle}>利益</Text>
        <TotalRow label="粗利益（販売価格−売上原価）" value={r.grossProfit} accent />
        <View style={styles.row}>
          <Text style={styles.cellLabel}>粗利率</Text>
          <Text style={styles.cellValue}>{fmtPct(r.grossMargin)}</Text>
        </View>

        <Text style={styles.sectionTitle}>販売経費</Text>
        <Rows items={sellItems} values={c.selling} hideZero={hideZero} />
        <TotalRow label="販売経費 合計" value={r.sellingExpenses} />

        <TotalRow label="営業利益（粗利益−販売経費）" value={r.operatingProfit} accent />
        <View style={[styles.row, c.groupBrokerage ? {} : { borderBottomWidth: 0 }]}>
          <Text style={styles.cellLabel}>営業利益率</Text>
          <Text style={[styles.cellValue, { color: COLORS.brand }]}>{fmtPct(r.operatingMargin)}</Text>
        </View>
        {c.groupBrokerage && (
          <>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>受取仲介手数料（税抜・自社グループ仲介）</Text>
              <Text style={styles.cellValue}>{fmtMan(receivedBrokerage(c))} 万円</Text>
            </View>
            <TotalRow label="連結粗利（営業利益＋受取手数料）" value={consolidatedProfit(r, c)} accent />
          </>
        )}
      </BasePage>
    </Document>
  );
}
