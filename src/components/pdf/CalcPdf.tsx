// 計算書PDF
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS } from "./common";
import { Company, Project } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS, ItemDef } from "@/lib/itemDefs";
import { fmtMan, fmtPct } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";

function Rows({ items, values }: { items: ItemDef[]; values: Record<string, number> }) {
  return (
    <>
      {items.map((it) => (
        <View key={it.key} style={styles.row}>
          <Text style={styles.cellLabel}>{it.label}</Text>
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

        <Text style={styles.sectionTitle}>取得原価</Text>
        <Rows items={ACQUISITION_ITEMS[c.propertyType]} values={c.acquisition} />
        <TotalRow label="取得原価 合計" value={r.acquisitionCost} />

        <Text style={styles.sectionTitle}>経費</Text>
        <Rows items={EXPENSE_ITEMS} values={c.expenses} />
        <TotalRow label="経費 合計" value={r.expensesTotal} />

        <TotalRow label="売上原価（取得原価＋経費）" value={r.costOfSales} />

        <Text style={styles.sectionTitle}>利益</Text>
        <TotalRow label="粗利益（販売価格−売上原価）" value={r.grossProfit} accent />
        <View style={styles.row}>
          <Text style={styles.cellLabel}>粗利率</Text>
          <Text style={styles.cellValue}>{fmtPct(r.grossMargin)}</Text>
        </View>

        <Text style={styles.sectionTitle}>販売経費</Text>
        <Rows items={SELLING_ITEMS} values={c.selling} />
        <TotalRow label="販売経費 合計" value={r.sellingExpenses} />

        <TotalRow label="営業利益（粗利益−販売経費）" value={r.operatingProfit} accent />
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.cellLabel}>営業利益率</Text>
          <Text style={[styles.cellValue, { color: COLORS.brand }]}>{fmtPct(r.operatingMargin)}</Text>
        </View>
      </BasePage>
    </Document>
  );
}
