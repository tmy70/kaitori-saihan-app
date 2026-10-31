// 買取保証書
// 媒介契約による販売で期限までに売買契約に至らなかった場合に、記載の価格で買い取ることを約する書面。
import React from "react";
import { Company, Project } from "@/lib/types";
import { fmtDateJa } from "@/lib/format";
import {
  guaranteeConditionsOf,
  guaranteeYen,
  mediationCompanyOf,
  propertyRows,
  staffOf,
} from "@/lib/docData";
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
  Heading,
  Note,
  P,
  Text,
  d,
} from "./docCommon";

export function HoshoPdf({ project, company }: { project: Project; company?: Company }) {
  const docs = project.docs ?? {};
  const until = fmtDateJa(docs.guaranteeUntil);

  return (
    <Document title="買取保証書">
      <DocPage company={company}>
        <IssueDate date={docs.issueDate} />
        <Addressee name={docs.sellerName} />
        <Issuer company={company} staff={staffOf(project)} />

        <DocTitle>買取保証書</DocTitle>

        {/*
          媒介をするのは ViVi不動産、買取をするのは発行会社（ゆかり）というように、
          役割が分かれることがある。主語がずれないよう、販売は「売主様が媒介契約により」、
          買取は「弊社が」と書き分ける。
        */}
        <P>
          売主様が媒介契約により下記不動産を販売され、
          {until ? until : "下記の保証期限"}までに売買契約の締結に至らなかった場合、
          弊社が下記の価格をもって買い取ることを保証いたします。
        </P>

        <Heading>保証価格</Heading>
        <AmountBox label="買取保証価格" yen={guaranteeYen(project)} />

        <Heading>保証の内容</Heading>
        <KeyValueTable
          rows={[
            { label: "媒介業者", value: mediationCompanyOf(project) },
            { label: "媒介契約日", value: fmtDateJa(docs.mediationDate) },
            { label: "保証期限", value: until },
            {
              label: "保証の対象",
              value: "上記保証期限までに売買契約の締結に至らなかった場合の、弊社による買取",
            },
          ]}
        />

        <Heading>物件の表示</Heading>
        <KeyValueTable rows={propertyRows(project)} />

        <Heading>保証の条件</Heading>
        <NumberedList items={guaranteeConditionsOf(project)} />

        <Note>
          本書に定める保証は、上記の条件を満たす場合に効力を有します。
          保証期限までに売買契約が成立した場合、本書による保証は終了いたします。
        </Note>
      </DocPage>
    </Document>
  );
}
