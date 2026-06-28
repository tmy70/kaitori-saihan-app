// 稟議書PDF
import React from "react";
import { Document, View, Text, BasePage, styles, COLORS, ApprovalRow } from "./common";
import { Company, Project, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { calculate, tsuboUnitPrice, usesTsuboPrice, consolidatedProfit, receivedBrokerage } from "@/lib/calc";
import { countCleared, countStatus, defaultPassLine, ngLabels, fixableLabels } from "@/lib/checklist";
import { fmtMan, fmtPct, areaLabel, sanitizePdfText } from "@/lib/format";

// 物件情報の1行（ラベル左・値右）。ラベルは固定幅、値は flex:1 で残り全幅を使い、
// 長い文字（面積・路線価・査定方法等）も折り返して見切れないようにする。
function KV({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <Text style={{ width: 92, color: COLORS.muted, paddingRight: 6 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: "left", lineHeight: 1.4 }}>
        {value === undefined || value === "" ? "—" : sanitizePdfText(value)}
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

  // 判定状態ごとの表記・色（OK=適合 / 是正=是正可能 / NG=不適合）
  const mark = (s: string) => (s === "ok" ? "OK" : s === "fixable" ? "是正" : "NG");
  const markColor = (s: string) => (s === "ok" ? COLORS.brand : s === "fixable" ? "#d97706" : "#dc2626");
  // 坪単価（土地・マンションのみ）
  const showTsubo = usesTsuboPrice(project.propertyType);
  const unitPrice = tsuboUnitPrice(project.calc.sellPrice, project.calc.tsubo);
  // 要確認事項（不適合・是正可能）
  const ngs = ngLabels(r.checklist);
  const fixables = fixableLabels(r.checklist);
  // 面積は計算書から自動転記（無ければ稟議書の旧テキストを使用）
  const c = project.calc;
  const hasBuilding = project.propertyType === "building" || project.propertyType === "kenuri";
  const landAreaDisplay = areaLabel(c.areaSqm, c.tsubo) || r.landArea;
  const buildingAreaDisplay = areaLabel(c.buildingAreaSqm) || r.buildingArea;
  const exclusiveAreaDisplay = areaLabel(c.areaSqm, c.tsubo) || r.exclusiveArea;

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
        {!isMansion && <KV label="土地面積" value={landAreaDisplay} />}
        {hasBuilding && <KV label="建物面積" value={buildingAreaDisplay} />}
        <KV label="築年数" value={r.buildingAge} />
        <KV label="構造" value={r.structure} />
        <KV label="駐車場" value={r.parking} />
        {isMansion && (
          <>
            <Text style={styles.sectionTitle}>マンション情報</Text>
            <KV label="階数" value={r.floor} />
            <KV label="専有面積" value={exclusiveAreaDisplay} />
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

        {/* 要確認事項（決裁前に確認すべき不適合・是正可能項目を集約） */}
        {(ngs.length > 0 || fixables.length > 0) && (
          <View
            style={{
              borderWidth: 0.8,
              borderColor: "#f0b4b4",
              backgroundColor: "#fdf2f2",
              borderRadius: 2,
              padding: 6,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "bold", color: "#dc2626", marginBottom: 2 }}>
              要確認事項（決裁前にご確認ください）
            </Text>
            {ngs.length > 0 && (
              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#dc2626", marginBottom: 1 }}>
                ■不適合（{ngs.length}件）：{ngs.join("／")}
              </Text>
            )}
            {fixables.length > 0 && (
              <Text style={{ fontSize: 8, color: "#b45309" }}>
                ■是正可能（{fixables.length}件）：{fixables.join("／")}
              </Text>
            )}
          </View>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {r.checklist
            // 未入力の予備項目は出力しない
            .filter((item) => !(item.custom && (item.label ?? "").trim() === ""))
            .map((item) => {
              const isNg = item.status === "ng";
              return (
                <View key={item.id} style={{ width: "50%", flexDirection: "row", paddingVertical: 2.5, paddingRight: 8 }}>
                  <Text
                    style={{
                      width: 24,
                      fontSize: 8.5,
                      color: markColor(item.status),
                      fontWeight: "bold",
                    }}
                  >
                    {mark(item.status)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    {/* 不適合（NG）は太字＋赤で強調 */}
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: isNg ? "bold" : "normal",
                        color: isNg ? "#dc2626" : COLORS.text,
                      }}
                    >
                      {item.id}.{item.label}
                    </Text>
                    {item.criteria ? (
                      <Text style={{ fontSize: 7, color: COLORS.muted }}>基準: {sanitizePdfText(item.criteria)}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
        </View>

        <Text style={styles.sectionTitle}>買取からの再販スケジュール</Text>
        {/* 2列レイアウト。工程名と日付の間に余白を確保し、日付は固定幅・右揃えで揃える */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {r.schedule.map((s) => (
            <View
              key={s.key}
              style={{ width: "50%", flexDirection: "row", alignItems: "flex-start", paddingVertical: 2, paddingRight: 14 }}
            >
              <Text style={{ fontSize: 8.5, flex: 1, paddingRight: 6 }}>{sanitizePdfText(s.label)}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", width: 58, textAlign: "right" }}>{s.date || "—"}</Text>
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
        {showTsubo && unitPrice > 0 && (
          <View style={styles.row}>
            <Text style={styles.cellLabel}>坪単価</Text>
            <Text style={styles.cellValue}>
              {fmtMan(unitPrice)} 万円/坪{project.calc.tsubo ? `（${fmtMan(project.calc.tsubo)} 坪）` : ""}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.cellLabel}>粗利益（粗利率）</Text>
          <Text style={styles.cellValue}>
            {fmtMan(res.grossProfit)} 万円（{fmtPct(res.grossMargin)}）
          </Text>
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
        {project.calc.groupBrokerage && (
          <>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>受取仲介手数料（税抜）</Text>
              <Text style={styles.cellValue}>{fmtMan(receivedBrokerage(project.calc))} 万円</Text>
            </View>
            <View style={[styles.row, { backgroundColor: COLORS.light }]}>
              <Text style={[styles.cellLabel, { fontWeight: "bold", color: COLORS.text }]}>連結粗利（自社グループ仲介）</Text>
              <Text style={[styles.cellValue, { color: COLORS.brand, fontSize: 11 }]}>
                {fmtMan(consolidatedProfit(res, project.calc))} 万円
              </Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>承認欄</Text>
        <ApprovalRow staff={r.approverStaff} manager={r.approverManager} president={r.approverPresident} />
      </BasePage>
    </Document>
  );
}
