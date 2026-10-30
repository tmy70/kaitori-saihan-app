// 銀行提出用 事業計画書
// 構成：事業概要／対象不動産の概要／販売計画／収支計画（円）／資金計画／事業スケジュール
// 金額はすべて円単位。1ページに詰め込まず、区切りのよいところでページを分ける。
import React from "react";
import { BANK_SCHEDULE_ROWS, Company, PROPERTY_TYPE_LABELS, Project } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS, ItemDef } from "@/lib/itemDefs";
import { areaLabel, fmtDateJa, fmtManAsYen, fmtPct } from "@/lib/format";
import {
  Document,
  DocPage,
  DocTitle,
  KeyValueTable,
  Note,
  P,
  Text,
  View,
  d,
  t,
} from "./docCommon";

export function BankPdf({ project, company }: { project: Project; company?: Company }) {
  const r = calculate(project.calc);
  const a = project.assessment;
  const bank = project.bank ?? {};
  const schedule =
    bank.schedule && bank.schedule.length > 0
      ? bank.schedule
      : BANK_SCHEDULE_ROWS.map((row) => ({ ...row, when: "" }));
  const scheduleRows = schedule.filter((row) => row.when.trim() !== "");

  const funded = (bank.loanAmount ?? 0) + (bank.ownFunds ?? 0);

  return (
    <Document title="事業計画書（銀行提出用）">
      {/* ---- 1ページ目：表紙相当・事業概要・物件概要 ---- */}
      <DocPage company={company}>
        <DocTitle>事業計画書</DocTitle>
        <P style={{ textAlign: "center" }}>
          {t(company?.name)}
        </P>
        <P style={{ textAlign: "right" }}>
          作成日　{fmtDateJa(project.docs?.issueDate)}
        </P>

        <Text style={d.heading}>事業概要</Text>
        {project.bankPlan?.body ? (
          <NarrativeBody text={project.bankPlan.body} />
        ) : (
          <P>
            {t(PROPERTY_TYPE_LABELS[project.propertyType])}として
            {a?.address ? `${t(a.address)}に所在する物件` : "本物件"}
            を取得し、改修のうえ再販売する事業です。
          </P>
        )}

        <Text style={d.heading}>対象不動産の概要</Text>
        <KeyValueTable
          labelWidth="28%"
          rows={[
            { label: "所在", value: a?.address ?? "" },
            { label: "地番", value: bank.lotNumber ?? "" },
            { label: "地目", value: bank.landCategory ?? "" },
            { label: "土地面積", value: areaLabel(a?.landAreaSqm) },
            { label: "建物面積", value: areaLabel(a?.buildingAreaSqm) },
            { label: "構造・階数", value: bank.structure ?? "" },
            { label: "築年", value: a?.buildingAge ?? "" },
            { label: "用途", value: bank.usage ?? "" },
            { label: "用途地域", value: bank.useDistrict ?? "" },
            { label: "建蔽率／容積率", value: joinSlash(bank.buildingCoverage, bank.floorAreaRatio) },
            { label: "接道", value: bank.roadAccess ?? "" },
          ]}
        />
      </DocPage>

      {/* ---- 2ページ目：販売計画・収支計画 ---- */}
      <DocPage company={company}>
        <Text style={d.heading}>販売計画</Text>
        <KeyValueTable
          labelWidth="28%"
          rows={[
            { label: "販売価格", value: fmtManAsYen(project.calc.sellPrice) },
            { label: "販売時期", value: bank.saleTiming ?? "" },
            { label: "販売方法", value: bank.saleMethod ?? "" },
            { label: "販売経費", value: fmtManAsYen(r.sellingExpenses) },
          ]}
        />

        <Text style={d.heading}>収支計画（単位：円）</Text>
        <YenTable
          label="取得原価"
          items={[...ACQUISITION_ITEMS[project.propertyType], ...(project.calc.acquisitionExtra ?? [])]}
          values={project.calc.acquisition}
          total={r.acquisitionCost}
        />
        <YenTable
          label="経費"
          items={[...EXPENSE_ITEMS[project.propertyType], ...(project.calc.expensesExtra ?? [])]}
          values={project.calc.expenses}
          total={r.expensesTotal}
        />
        <YenTable
          label="販売経費"
          items={[...SELLING_ITEMS, ...(project.calc.sellingExtra ?? [])]}
          values={project.calc.selling}
          total={r.sellingExpenses}
        />

        <View style={{ marginTop: 12 }}>
          <KeyValueTable
            labelWidth="40%"
            rows={[
              { label: "販売価格", value: fmtManAsYen(project.calc.sellPrice) },
              { label: "売上原価（取得原価＋経費）", value: fmtManAsYen(r.costOfSales) },
              { label: "粗利益", value: `${fmtManAsYen(r.grossProfit)}（${fmtPct(r.grossMargin)}）` },
              { label: "販売経費", value: fmtManAsYen(r.sellingExpenses) },
              { label: "営業利益", value: `${fmtManAsYen(r.operatingProfit)}（${fmtPct(r.operatingMargin)}）` },
            ]}
          />
        </View>
      </DocPage>

      {/* ---- 3ページ目：資金計画・スケジュール ---- */}
      <DocPage company={company}>
        <Text style={d.heading}>資金計画</Text>
        <KeyValueTable
          labelWidth="32%"
          rows={[
            { label: "借入希望額", value: bank.loanAmount ? fmtManAsYen(bank.loanAmount) : "" },
            { label: "自己資金", value: bank.ownFunds ? fmtManAsYen(bank.ownFunds) : "" },
            { label: "資金調達合計", value: funded > 0 ? fmtManAsYen(funded) : "" },
            { label: "取得に要する資金", value: fmtManAsYen(r.acquisitionCost + r.expensesTotal) },
            { label: "返済原資", value: bank.repaymentSource ?? "" },
            { label: "返済時期", value: bank.repaymentTiming ?? "" },
          ]}
        />

        <Text style={d.heading}>事業スケジュール</Text>
        {scheduleRows.length > 0 ? (
          <View style={d.table}>
            <View style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "40%" }]}>項目</Text>
              <Text style={[d.th, { width: "60%" }]}>時期</Text>
            </View>
            {scheduleRows.map((row) => (
              <View key={row.key} style={d.tr} wrap={false}>
                <Text style={[d.th, { width: "40%" }]}>{t(row.label)}</Text>
                <Text style={[d.td, { width: "60%" }]}>{t(row.when)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <P>（未入力）</P>
        )}

        <Note>
          本計画書の金額は、取得時点の見積り・査定に基づく計画値です。
          実際の工事費・諸費用の確定により変動する場合があります。
        </Note>
      </DocPage>
    </Document>
  );
}

/** 建蔽率／容積率をまとめて1行にする */
function joinSlash(a?: string, b?: string): string {
  if (a && b) return `${a} ／ ${b}`;
  return a || b || "";
}

/** 下書き本文を段落に分けて印字する（【見出し】は見出しとして扱う） */
function NarrativeBody({ text }: { text: string }) {
  const blocks = text.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
  return (
    <View>
      {blocks.map((line, i) =>
        /^【.*】$/.test(line) ? (
          <Text key={i} style={d.heading}>
            {t(line.replace(/[【】]/g, ""))}
          </Text>
        ) : (
          <Text key={i} style={d.paragraph}>
            {t(line)}
          </Text>
        )
      )}
    </View>
  );
}

/** 費目の円建て明細（金額0は出さない） */
function YenTable({
  label,
  items,
  values,
  total,
}: {
  label: string;
  items: ItemDef[];
  values: Record<string, number>;
  total: number;
}) {
  const rows = items.filter((it) => Number.isFinite(values[it.key]) && values[it.key] !== 0);
  return (
    <View style={{ marginBottom: 12 }}>
      <P style={{ fontWeight: "bold", marginBottom: 4 }}>{t(label)}</P>
      <View style={d.table}>
        {rows.length === 0 ? (
          <View style={d.tr} wrap={false}>
            <Text style={[d.td, { flex: 1 }]}>（該当なし）</Text>
          </View>
        ) : (
          rows.map((it) => (
            <View key={it.key} style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "60%" }]}>{t(it.label)}</Text>
              <Text style={[d.td, d.tdRight, { width: "40%" }]}>{fmtManAsYen(values[it.key])}</Text>
            </View>
          ))
        )}
        <View style={d.tr} wrap={false}>
          <Text style={[d.th, { width: "60%" }]}>合計</Text>
          <Text style={[d.th, { width: "40%", textAlign: "right" }]}>{fmtManAsYen(total)}</Text>
        </View>
      </View>
    </View>
  );
}
