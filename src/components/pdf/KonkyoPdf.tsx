// 社内用 計算根拠（稟議の添付用）
// 提示した買取価格が、どの費用と利益を差し引いた結果なのかを1枚で示す。
// お客様にはお渡ししない書面なので、利益・内訳をそのまま記載する。
import React from "react";
import { Company, PROPERTY_TYPE_LABELS, Project } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { assessmentToCalcInput, priceLines, resolveAssessment } from "@/lib/assessment";
import { PROFIT_LINES, WORK_COST_TARGET } from "@/lib/presets";
import { fmtDateJa, fmtManAsYen, fmtPct } from "@/lib/format";
import { propertyRows, staffOf } from "@/lib/docData";
import {
  Document,
  DocPage,
  DocTitle,
  KeyValueTable,
  Text,
  View,
  d,
  t,
} from "./docCommon";

export function KonkyoPdf({ project, company }: { project: Project; company?: Company }) {
  const type = project.propertyType;
  const a = project.assessment;
  const r = resolveAssessment(type, a);
  const offer = a?.offerPrice ?? 0;
  const calc = assessmentToCalcInput(type, a, offer);
  const result = calculate(calc);
  const lines = priceLines(type, a);
  const workLabel = WORK_COST_TARGET[type].label;

  // 差し引いた費用の内訳（提示価格に対応する実額）
  const costRows: { label: string; man: number; note?: string }[] = [
    { label: "買取価格", man: offer },
    {
      label: "購入時手数料",
      man: calc.acquisition.buyFee ?? 0,
      note: r.includeBuyFee ? "買取価格×3%＋6万円" : "固定額",
    },
    { label: workLabel, man: r.workCost },
    { label: "登記費用・印紙代", man: r.registration, note: "概算" },
    { label: "固都税精算金", man: r.taxProration, note: "概算" },
    { label: "不動産取得税", man: r.acquisitionTax, note: "概算" },
    { label: "その他取得諸費用", man: r.otherAcquisition, note: "概算" },
    { label: "経費", man: r.expenses, note: "概算" },
    { label: "販売時仲介手数料", man: r.sellBrokerage, note: "再販価格×3%＋6万円" },
    { label: "販売経費（手数料以外）", man: r.sellingOther, note: "概算" },
  ];

  return (
    <Document title="買取価格 計算根拠">
      <DocPage company={company}>
        <DocTitle>買取価格 計算根拠</DocTitle>
        <Text style={[d.paragraph, { textAlign: "right" }]}>
          作成日　{fmtDateJa(project.docs?.issueDate)}　／　担当　{t(staffOf(project)) || "―"}
        </Text>

        <Text style={d.heading}>案件</Text>
        <KeyValueTable
          rows={[
            { label: "案件名", value: project.name },
            { label: "発行会社", value: company?.name ?? "" },
            { label: "種別", value: PROPERTY_TYPE_LABELS[type] },
            ...propertyRows(project).filter((row) => row.label !== "種別"),
          ]}
        />

        <Text style={d.heading}>提示価格と利益</Text>
        <KeyValueTable
          rows={[
            { label: "再販想定価格", value: fmtManAsYen(r.resalePrice) },
            { label: "提示する買取価格", value: fmtManAsYen(offer) },
            { label: "売上原価", value: fmtManAsYen(result.costOfSales) },
            { label: "粗利益", value: `${fmtManAsYen(result.grossProfit)}（${fmtPct(result.grossMargin)}）` },
            { label: "販売経費", value: fmtManAsYen(result.sellingExpenses) },
            {
              label: "営業利益（手残り）",
              value: `${fmtManAsYen(result.operatingProfit)}（${fmtPct(result.operatingMargin)}）`,
            },
          ]}
          labelWidth="34%"
        />

        {/* 見出し行だけが前のページに取り残されないよう、表はまとめて次ページへ送る */}
        <View wrap={false}>
          <Text style={d.heading}>差し引いた費用の内訳</Text>
          <View style={d.table}>
            <View style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "40%" }]}>費目</Text>
              <Text style={[d.th, { width: "30%" }]}>金額</Text>
              <Text style={[d.th, { width: "30%" }]}>算出の根拠</Text>
            </View>
            {costRows.map((row, i) => (
              <View key={i} style={d.tr} wrap={false}>
                <Text style={[d.th, { width: "40%" }]}>{t(row.label)}</Text>
                <Text style={[d.td, d.tdRight, { width: "30%" }]}>{fmtManAsYen(row.man)}</Text>
                <Text style={[d.td, { width: "30%" }]}>{t(row.note ?? "実額")}</Text>
              </View>
            ))}
            <View style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "40%" }]}>費用合計</Text>
              <Text style={[d.th, { width: "30%", textAlign: "right" }]}>
                {fmtManAsYen(costRows.reduce((s, row) => s + row.man, 0))}
              </Text>
              <Text style={[d.th, { width: "30%" }]}>　</Text>
            </View>
          </View>
        </View>
      </DocPage>

      {/* 2ページ目：利益ラインごとの買取価格（詰め込まずページを分ける） */}
      <DocPage company={company}>
        <Text style={d.heading}>利益ラインごとの買取価格</Text>
        <Text style={d.paragraph}>
          再販想定価格 {fmtManAsYen(r.resalePrice)} を前提に、確保する利益ごとの買取価格を逆算した結果です。
          購入時手数料は買取価格に連動するため、収束計算により求めています。
        </Text>
        <View style={d.table}>
          <View style={d.tr} wrap={false}>
            <Text style={[d.th, { width: "25%" }]}>確保する利益</Text>
            <Text style={[d.th, { width: "30%" }]}>買取価格</Text>
            <Text style={[d.th, { width: "20%" }]}>利益率</Text>
            <Text style={[d.th, { width: "25%" }]}>購入時手数料</Text>
          </View>
          {lines.map((l) => (
            <View key={l.profit} style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "25%" }]}>{fmtManAsYen(l.profit)}</Text>
              <Text style={[d.td, d.tdRight, { width: "30%" }]}>
                {l.result.feasible ? fmtManAsYen(l.displayPrice) : "―"}
              </Text>
              <Text style={[d.td, d.tdRight, { width: "20%" }]}>
                {r.resalePrice > 0 ? fmtPct(l.profit / r.resalePrice) : "―"}
              </Text>
              <Text style={[d.td, d.tdRight, { width: "25%" }]}>{fmtManAsYen(l.result.buyFee)}</Text>
            </View>
          ))}
        </View>

        <Text style={d.heading}>逆算の考え方</Text>
        <Text style={d.paragraph}>
          買取価格 ＝ 再販想定価格 − 確保する利益 − {workLabel} − 取得時の諸費用 − 経費 − 販売経費
        </Text>
        <Text style={d.paragraph}>
          確保する利益は、販売経費まで差し引いた後に残る額（営業利益）です。
          購入時手数料（買取価格×3%＋6万円）は買取価格そのものに連動するため、
          買取価格を仮置きして費用を求め、その費用から買取価格を引き直す計算を
          差が収まるまで繰り返して確定させています（{PROFIT_LINES.length}本とも
          {lines[0]?.result.iterations ?? 0}回程度で収束）。
        </Text>

        <Text style={d.note}>
          「概算」と記載した費目は、評価額・見積りが確定するまでの種別ごとの目安額です。
          実額が判明した時点で計算書を更新してください。
        </Text>
      </DocPage>
    </Document>
  );
}
