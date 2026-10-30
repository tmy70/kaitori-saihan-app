// 買取査定書（買取価格のご提示）
// 記載するのは提示する1本の価格のみ。粗利や計算の内訳は載せない。
import React from "react";
import { Company, Project, SELLER_FEE_LABELS } from "@/lib/types";
import { fmtDateJa } from "@/lib/format";
import { conditionsOf, offerYen, propertyRows, staffOf } from "@/lib/docData";
import {
  Addressee,
  AmountBox,
  Document,
  DocPage,
  DocTitle,
  IssueDate,
  Issuer,
  KeyValueTable,
  NumberedList,
  Text,
  View,
  d,
} from "./docCommon";

export function SateiPdf({ project, company }: { project: Project; company?: Company }) {
  const docs = project.docs ?? {};
  const fee = docs.sellerFee === "none" || docs.sellerFee === "charged" ? docs.sellerFee : undefined;

  return (
    <Document title="買取査定書">
      <DocPage company={company}>
        <IssueDate date={docs.issueDate} />
        <Addressee name={docs.sellerName} />
        <Issuer company={company} staff={staffOf(project)} />

        <DocTitle>買取査定書</DocTitle>

        <Text style={d.paragraph}>
          拝啓　平素は格別のご高配を賜り、厚く御礼申し上げます。
        </Text>
        <Text style={d.paragraph}>
          このたびご相談いただきました下記不動産につきまして、査定の結果、
          次のとおり買取価格をご提示申し上げます。ご検討のほどよろしくお願い申し上げます。
        </Text>

        <Text style={d.heading}>買取価格</Text>
        <AmountBox label="買取価格" yen={offerYen(project)} />
        <Text style={d.paragraph}>
          有効期限　{fmtDateJa(docs.validUntil) || "別途ご相談"}
        </Text>

        <Text style={d.heading}>物件の表示</Text>
        <KeyValueTable rows={propertyRows(project)} />

        <Text style={d.heading}>前提条件</Text>
        <NumberedList items={conditionsOf(project)} />

        {fee ? (
          <View>
            <Text style={d.heading}>売主様の仲介手数料</Text>
            <Text style={d.paragraph}>{SELLER_FEE_LABELS[fee]}</Text>
          </View>
        ) : null}

        <Text style={d.note}>
          本書は現時点の査定に基づくご提示であり、売買契約の締結を約するものではありません。
          記載の前提条件に変更が生じた場合は、買取価格を見直させていただくことがあります。
        </Text>

        <Text style={[d.paragraph, { marginTop: 14, textAlign: "right" }]}>敬具</Text>
      </DocPage>
    </Document>
  );
}
