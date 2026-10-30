// 仲介と買取の比較表
// 売主様が「どちらで売るか」を判断するための対比。数字は入力された範囲だけを載せ、
// 根拠のない目安を勝手に入れない（仲介の販売期間は未入力なら「状況により異なります」）。
import React from "react";
import { Company, Project } from "@/lib/types";
import { calcBrokerage } from "@/lib/calc";
import { fmtManAsYen } from "@/lib/format";
import { propertyRows, staffOf } from "@/lib/docData";
import {
  Addressee,
  Document,
  DocPage,
  DocTitle,
  IssueDate,
  Issuer,
  KeyValueTable,
  Note,
  P,
  Text,
  View,
  d,
  t,
} from "./docCommon";

/** 比較する観点（上から順に印字する） */
interface CompareRow {
  item: string;
  brokerage: string;
  purchase: string;
}

export function HikakuPdf({ project, company }: { project: Project; company?: Company }) {
  const docs = project.docs ?? {};
  const a = project.assessment;
  const offer = a?.offerPrice ?? 0;
  const brokerAssess = a?.brokerAssessPrice ?? 0;

  // 仲介：お手元に残る金額＝査定価格−仲介手数料（3%＋6万円）
  const brokerageFee = brokerAssess > 0 ? calcBrokerage(brokerAssess) : 0;
  const brokerageNet = brokerAssess > 0 ? brokerAssess - brokerageFee : 0;

  const period = docs.brokerageMonths?.trim();

  const rows: CompareRow[] = [
    {
      item: "お手元に残る金額",
      brokerage:
        brokerAssess > 0
          ? `${fmtManAsYen(brokerageNet)}\n（査定価格 ${fmtManAsYen(brokerAssess)} − 仲介手数料 ${fmtManAsYen(brokerageFee)}）`
          : "査定価格から仲介手数料を差し引いた額",
      purchase: offer > 0 ? `${fmtManAsYen(offer)}\n仲介手数料の差引はありません` : "―",
    },
    {
      item: "売却までの期間の目安",
      brokerage: period ? period : "状況により異なります",
      purchase: "ご契約後、おおむね1か月以内に決済",
    },
    {
      item: "内覧への対応",
      brokerage: "購入希望者のご案内のたびに必要",
      purchase: "不要（弊社の確認のみ）",
    },
    {
      item: "契約不適合責任",
      brokerage: "売主様が負います",
      purchase: "免責（弊社は責任を追及しません）",
    },
    {
      item: "現金化の確実さ",
      brokerage: "買主が見つかるまで確定しません",
      purchase: "ご契約時点で金額・時期が確定します",
    },
    {
      item: "近隣に知られにくいか",
      brokerage: "広告・案内により知られる場合があります",
      purchase: "広告を行わないため知られにくい",
    },
  ];

  return (
    <Document title="仲介と買取の比較">
      <DocPage company={company}>
        <IssueDate date={docs.issueDate} />
        <Addressee name={docs.sellerName} />
        <Issuer company={company} staff={staffOf(project)} />

        <DocTitle>売却方法の比較</DocTitle>

        <P>
          下記不動産について、仲介によるご売却と、弊社による買取とを比較いたしました。
          ご検討の参考になれば幸いです。
        </P>

        <Text style={d.heading}>物件の表示</Text>
        <KeyValueTable rows={propertyRows(project)} />

        <Text style={d.heading}>比較</Text>
        <View style={d.table}>
          <View style={d.tr} wrap={false}>
            <Text style={[d.th, { width: "24%" }]}>項目</Text>
            <Text style={[d.th, { width: "38%" }]}>仲介でのご売却</Text>
            <Text style={[d.th, { width: "38%" }]}>弊社による買取</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} style={d.tr} wrap={false}>
              <Text style={[d.th, { width: "24%" }]}>{t(r.item)}</Text>
              <Text style={[d.td, { width: "38%" }]}>{t(r.brokerage)}</Text>
              <Text style={[d.td, { width: "38%" }]}>{t(r.purchase)}</Text>
            </View>
          ))}
        </View>

        <Note>
          仲介手数料は「売買価格×3%＋6万円」（別途消費税）として算出しています。
          記載の金額は現時点の査定に基づく概算であり、実際の成約価格・諸費用により変動します。
        </Note>
      </DocPage>
    </Document>
  );
}
