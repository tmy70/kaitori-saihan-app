// 稟議書PDF
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS, ApprovalRow } from "./common";
import { Company, Project, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { countCleared, countStatus, defaultPassLine } from "@/lib/checklist";
import { fmtMan, fmtPct } from "@/lib/format";

function KV({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, { fontWeight: "normal", textAlign: "left", width: "55%" }]}>
        {value === undefined || value === "" ? "—" : String(value)}
      </Text>
    </View>
  );
}

export function RingiPdf({ project, company }: { project: Project; company?: Company }) {
  const r = project.ringi;
  const res = calculate(project.calc);
  const okCount = countStatus(r.checklist, "ok");
  const fixableCount = countStatus(r.checklist, "fixable");
  const ngCount = countStatus(r.checklist, "ng");
  const cleared = countCleared(r.checklist); // 適合＋是正可能（合格に算入）
  const passLine = r.checklistPassLine ?? defaultPassLine(project.propertyType);
  const isPass = cleared >= passLine;
  const isMansion = project.propertyType === "mansion";

  // 判定状態ごとの記号・色（✓適合 / △是正可能 / ×不適合）
  const mark = (s: string) => (s === "ok" ? "✓" : s === "fixable" ? "△" : "×");
  const markColor = (s: string) => (s === "ok" ? COLORS.brand : s === "fixable" ? "#d97706" : "#dc2626");

  return (
    <Document>
      <BasePage company={company}>
        <Text style={styles.docTitle}>{company?.name ?? ""} 再販計画稟議書</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text>提出日：{r.submitDate || "—"}</Text>
          <Text>担当者：{r.staff || "—"}</Text>
        </View>

        <Text style={styles.sectionTitle}>物件情報</Text>
        <KV label="買取希望物件名" value={r.propertyName} />
        <KV label="物件所在地" value={r.address} />
        <KV label="物件種別" value={r.propertyKind || PROPERTY_TYPE_LABELS[project.propertyType]} />
        <KV label="売主氏名・連絡先" value={r.sellerName} />
        <KV label="反響入口" value={r.inquirySource} />
        <KV label="売却希望理由・注意点" value={r.sellReason} />

        <Text style={styles.sectionTitle}>物件スペック</Text>
        <KV label="土地面積" value={r.landArea} />
        <KV label="建物面積" value={r.buildingArea} />
        <KV label="築年数" value={r.buildingAge} />
        <KV label="構造" value={r.structure} />
        <KV label="駐車場" value={r.parking} />
        {isMansion && (
          <>
            <Text style={styles.sectionTitle}>マンション情報</Text>
            <KV label="階数" value={r.floor} />
            <KV label="専有面積" value={r.exclusiveArea} />
            <KV label="エレベーター" value={r.hasElevator ? "有" : "無"} />
            <KV label="角部屋" value={r.cornerRoom ? "有" : "無"} />
            <KV label="駐車場" value={r.mansionParking} />
          </>
        )}

        <Text style={styles.sectionTitle}>査定情報</Text>
        <KV label="売主希望買取価格" value={r.sellerHopePrice} />
        <KV label="査定方法1" value={r.assessMethod1} />
        <KV label="査定方法2" value={r.assessMethod2} />
        <KV label="路線価" value={r.rosenka} />
        <KV label="アピールポイント" value={r.appealPoint} />

        <Text style={styles.sectionTitle}>購入チェックリスト</Text>
        {/* 合否判定（合格ライン以上のOKで合格） */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: COLORS.light,
            paddingVertical: 3,
            paddingHorizontal: 6,
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 9 }}>
            クリア {cleared} / 合格ライン {passLine}　（適合{okCount}・是正可能{fixableCount}・不適合{ngCount}）
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: isPass ? COLORS.brand : "#dc2626" }}>
            判定：{isPass ? "合格" : "不合格"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {r.checklist
            // 未入力の予備項目は出力しない
            .filter((item) => !(item.custom && (item.label ?? "").trim() === ""))
            .map((item) => (
              <View key={item.id} style={{ width: "50%", flexDirection: "row", paddingVertical: 1.5 }}>
                <Text style={{ width: 12, color: markColor(item.status), fontWeight: "bold" }}>
                  {mark(item.status)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 7 }}>
                    {item.id}.{item.label}
                    {item.status === "fixable" ? "（是正可能）" : ""}
                  </Text>
                  {item.criteria ? (
                    <Text style={{ fontSize: 6, color: COLORS.muted }}>基準: {item.criteria}</Text>
                  ) : null}
                </View>
              </View>
            ))}
        </View>

        <Text style={styles.sectionTitle} break>
          買取からの再販スケジュール
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {r.schedule.map((s) => (
            <View key={s.key} style={{ width: "33.3%", flexDirection: "row", paddingVertical: 2 }}>
              <Text style={{ fontSize: 7.5, flex: 1 }}>{s.label}</Text>
              <Text style={{ fontSize: 7.5, fontWeight: "bold" }}>{s.date || "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>再販試算サマリー</Text>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>買取原価（取得原価）</Text>
          <Text style={styles.cellValue}>{fmtMan(res.acquisitionCost)} 万円</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>その他経費</Text>
          <Text style={styles.cellValue}>{fmtMan(res.expensesTotal)} 万円</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>仕入費用総額（売上原価）</Text>
          <Text style={styles.cellValue}>{fmtMan(res.costOfSales)} 万円</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>販売価格（税抜）</Text>
          <Text style={styles.cellValue}>{fmtMan(project.calc.sellPrice)} 万円</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>販売時費用</Text>
          <Text style={styles.cellValue}>{fmtMan(res.sellingExpenses)} 万円</Text>
        </View>
        <View style={[styles.row, { backgroundColor: COLORS.light }]}>
          <Text style={[styles.cellLabel, { fontWeight: "bold", color: COLORS.text }]}>営業利益（最終粗利）</Text>
          <Text style={[styles.cellValue, { color: COLORS.brand, fontSize: 11 }]}>
            {fmtMan(res.operatingProfit)} 万円（{fmtPct(res.operatingMargin)}）
          </Text>
        </View>

        <Text style={styles.sectionTitle}>承認欄</Text>
        <ApprovalRow staff={r.approverStaff} manager={r.approverManager} president={r.approverPresident} />
      </BasePage>
    </Document>
  );
}
