// @react-pdf 共通スタイル・部品（A4・会社ヘッダ・承認欄・ページ番号）
import React from "react";
import { StyleSheet, View, Text, Page, Document } from "@react-pdf/renderer";
import { Company } from "@/lib/types";

export const COLORS = {
  brand: "#1e4d8c",
  brandDark: "#0e2643",
  accent: "#a8843b",
  border: "#cbd5e1",
  light: "#f1f5f9",
  muted: "#64748b",
  text: "#111827",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 28,
    lineHeight: 1.4,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand,
    paddingBottom: 4,
    marginBottom: 8,
  },
  companyName: { fontSize: 11, fontWeight: "bold", color: COLORS.brand },
  companyMeta: { fontSize: 7.5, color: COLORS.muted },
  docTitle: { fontSize: 15, fontWeight: "bold", textAlign: "center", marginVertical: 5, color: COLORS.brandDark },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: COLORS.brand,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    marginTop: 7,
    marginBottom: 3,
  },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingVertical: 2 },
  cellLabel: { width: "45%", color: COLORS.muted },
  cellValue: { width: "55%", textAlign: "right", fontWeight: "bold" },
  table: { borderWidth: 0.5, borderColor: COLORS.border },
  th: { backgroundColor: COLORS.light, fontWeight: "bold", padding: 3 },
  td: { padding: 3, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 4,
    fontSize: 7,
    color: COLORS.muted,
  },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  approvalWrap: { flexDirection: "row", gap: 8, marginTop: 14 },
  approvalBox: { flex: 1, borderWidth: 0.8, borderColor: COLORS.border, height: 64 },
  approvalHead: { backgroundColor: COLORS.light, textAlign: "center", paddingVertical: 2, fontSize: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  approvalName: { textAlign: "center", fontSize: 8, marginTop: 4, color: COLORS.muted },
});

export function PdfHeader({ company }: { company?: Company }) {
  return (
    <View style={styles.headerBar} fixed>
      <View>
        <Text style={styles.companyName}>{company?.name ?? ""}</Text>
        {company?.address ? <Text style={styles.companyMeta}>{company.address}</Text> : null}
      </View>
      <View>
        {company?.representative ? (
          <Text style={styles.companyMeta}>代表者：{company.representative}</Text>
        ) : null}
        {company?.role ? <Text style={styles.companyMeta}>{company.role}</Text> : null}
      </View>
    </View>
  );
}

export function PdfFooter({ company }: { company?: Company }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{company?.name ?? ""}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** 承認欄（担当・上長・社長の押印枠） */
export function ApprovalRow({
  staff,
  manager,
  president,
}: {
  staff?: string;
  manager?: string;
  president?: string;
}) {
  const boxes = [
    { head: "担当", name: staff },
    { head: "上長", name: manager },
    { head: "社長", name: president },
  ];
  return (
    <View style={styles.approvalWrap}>
      {boxes.map((b, i) => (
        <View key={i} style={styles.approvalBox}>
          <Text style={styles.approvalHead}>{b.head}</Text>
          {b.name ? <Text style={styles.approvalName}>{b.name}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function BasePage({ company, children }: { company?: Company; children: React.ReactNode }) {
  return (
    <Page size="A4" style={styles.page}>
      <PdfHeader company={company} />
      {children}
      <PdfFooter company={company} />
    </Page>
  );
}

export { Document, View, Text };
