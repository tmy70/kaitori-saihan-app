// ============================================================
// お客様向け書類の共通スタイル・部品
//
// 体裁は一般的な不動産会社の書面に合わせる。
//  ・装飾的なアイコン・絵文字は使わない
//  ・色は黒と罫線のグレーのみ（カラーバー等は使わない）
//  ・文字サイズは本文12pt・表11pt・見出し14pt以上（詰め込まずページを分ける）
// ============================================================
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { Company } from "@/lib/types";
import { fmtDateJa, fmtYen, sanitizePdfText } from "@/lib/format";

/** 文字サイズ（pt）。仕様の下限を定数で持ち、各所で使い回す */
export const FS = {
  /** 文書タイトル */
  title: 18,
  /** 見出し */
  heading: 14,
  /** 本文 */
  body: 12,
  /** 表の中身 */
  table: 11,
} as const;

const INK = "#000000";
const RULE = "#555555";
const SOFT = "#888888";

export const d = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: FS.body,
    color: INK,
    // 余白は一般的なビジネス文書に合わせる（左右20mm・上下18mm相当）
    paddingTop: 50,
    paddingBottom: 64,
    paddingHorizontal: 56,
    lineHeight: 1.7,
  },
  // ---- 冒頭（発行日・宛名・発行者） ----
  issueDate: { fontSize: FS.body, textAlign: "right", marginBottom: 14 },
  addressee: { fontSize: FS.heading, marginBottom: 4 },
  addresseeRule: { borderBottomWidth: 1, borderBottomColor: INK, width: 220, marginBottom: 16 },
  issuerBlock: { alignSelf: "flex-end", alignItems: "flex-start", marginBottom: 20 },
  issuerLine: { fontSize: FS.body, lineHeight: 1.5 },

  title: {
    fontSize: FS.title,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 6,
    marginTop: 4,
    marginBottom: 20,
  },

  paragraph: { fontSize: FS.body, marginBottom: 12 },

  heading: {
    fontSize: FS.heading,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: INK,
    paddingLeft: 8,
  },

  // ---- 金額を目立たせる枠 ----
  amountBox: {
    borderWidth: 1.5,
    borderColor: INK,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: FS.heading, fontWeight: "bold" },
  amountValue: { fontSize: 20, fontWeight: "bold" },

  // ---- 表 ----
  table: { borderTopWidth: 1, borderTopColor: RULE, borderLeftWidth: 1, borderLeftColor: RULE },
  tr: { flexDirection: "row" },
  th: {
    fontSize: FS.table,
    fontWeight: "bold",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    backgroundColor: "#f2f2f2",
  },
  td: {
    fontSize: FS.table,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tdRight: { textAlign: "right" },

  // ---- 箇条書き ----
  listRow: { flexDirection: "row", marginBottom: 7 },
  listIndex: { fontSize: FS.body, width: 24 },
  listText: { fontSize: FS.body, flex: 1 },

  note: { fontSize: FS.table, color: SOFT, marginTop: 10, lineHeight: 1.6 },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: FS.table,
    color: SOFT,
  },
});

/** 文字化けする単位記号などを安全な表記へ直す */
export const t = (v: string | number | undefined | null) => sanitizePdfText(v);

/**
 * 日本語の文の途中に、ソースコードの改行由来の半角スペースが入るのを防ぐ。
 *
 * JSXは
 *   <Text>
 *     ……査定の結果、
 *     次のとおり……
 *   </Text>
 * を「……査定の結果、 次のとおり……」という1つの文字列（改行→半角スペース）にする。
 * そのままPDFにすると文中に不自然な空きができ、そこで改行もされてしまう。
 * 日本語の文字に挟まれた半角スペースだけを取り除く（数字や英字の前後は残す）。
 */
const JA = "\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef";
const JA_GAP = new RegExp(`([${JA}]) +(?=[${JA}])`, "g");

export function joinJa(s: string): string {
  return s.replace(JA_GAP, "$1");
}

/**
 * 本文の段落。複数行に分けて書いても、日本語として詰めて1つの文になる。
 * 単位記号の正規化（㎡→m² など）もここで行う。
 */
/** スタイル1件ぶんの型 */
type DocStyle = Style;

export function P({
  style,
  children,
}: {
  style?: DocStyle;
  children: React.ReactNode;
}) {
  const fixed = React.Children.toArray(children).map((c, i) =>
    typeof c === "string" || typeof c === "number" ? (
      <React.Fragment key={i}>{joinJa(t(c))}</React.Fragment>
    ) : (
      <React.Fragment key={i}>{c}</React.Fragment>
    )
  );
  return <Text style={style ? [d.paragraph, style] : d.paragraph}>{fixed}</Text>;
}

/** 注記（本文より小さめ・補足用）。P と同じく日本語の空きを詰める */
export function Note({ children }: { children: React.ReactNode }) {
  const fixed = React.Children.toArray(children).map((c, i) =>
    typeof c === "string" || typeof c === "number" ? (
      <React.Fragment key={i}>{joinJa(t(c))}</React.Fragment>
    ) : (
      <React.Fragment key={i}>{c}</React.Fragment>
    )
  );
  return <Text style={d.note}>{fixed}</Text>;
}

/** 発行日（右上） */
export function IssueDate({ date }: { date?: string }) {
  return <Text style={d.issueDate}>{fmtDateJa(date)}</Text>;
}

/** 宛名（売主様） */
export function Addressee({ name }: { name?: string }) {
  return (
    <View>
      <Text style={d.addressee}>{name ? `${t(name)} 様` : "　　　　　　　　 様"}</Text>
      <View style={d.addresseeRule} />
    </View>
  );
}

/** 発行会社（右寄せ・所在地・代表者・担当者） */
export function Issuer({ company, staff }: { company?: Company; staff?: string }) {
  return (
    <View style={d.issuerBlock}>
      <Text style={d.issuerLine}>{t(company?.name)}</Text>
      {company?.address ? <Text style={d.issuerLine}>{t(company.address)}</Text> : null}
      {company?.representative ? (
        <Text style={d.issuerLine}>代表者　{t(company.representative)}</Text>
      ) : null}
      {staff ? <Text style={d.issuerLine}>担当　{t(staff)}</Text> : null}
    </View>
  );
}

/** 文書タイトル（中央・字間を空ける） */
export function DocTitle({ children }: { children: string }) {
  return <Text style={d.title}>{children}</Text>;
}

/** 金額を囲った枠（買取価格・保証価格） */
export function AmountBox({ label, yen }: { label: string; yen: number }) {
  return (
    <View style={d.amountBox} wrap={false}>
      <Text style={d.amountLabel}>{label}</Text>
      <Text style={d.amountValue}>金 {fmtYen(yen)} 円</Text>
    </View>
  );
}

/** 2列の表（項目名・内容） */
export function KeyValueTable({
  rows,
  labelWidth = "30%",
}: {
  rows: { label: string; value: string }[];
  labelWidth?: string;
}) {
  const visible = rows.filter((r) => r.value && r.value.trim().length > 0);
  if (visible.length === 0) return null;
  return (
    <View style={d.table}>
      {visible.map((r, i) => (
        <View key={i} style={d.tr} wrap={false}>
          <Text style={[d.th, { width: labelWidth }]}>{t(r.label)}</Text>
          <Text style={[d.td, { flex: 1 }]}>{t(r.value)}</Text>
        </View>
      ))}
    </View>
  );
}

/** 番号付きの箇条書き（前提条件・保証の条件） */
export function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((s, i) => (
        <View key={i} style={d.listRow} wrap={false}>
          <Text style={d.listIndex}>{i + 1}.</Text>
          <Text style={d.listText}>{t(s)}</Text>
        </View>
      ))}
    </View>
  );
}

/** ページ下部（会社名とページ番号） */
export function DocFooter({ company }: { company?: Company }) {
  return (
    <View style={d.footer} fixed>
      <Text>{t(company?.name)}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** A4縦1枚ぶんの土台 */
export function DocPage({ company, children }: { company?: Company; children: React.ReactNode }) {
  return (
    <Page size="A4" style={d.page}>
      {children}
      <DocFooter company={company} />
    </Page>
  );
}

export { Document, Page, Text, View };
