import { describe, it, expect } from "vitest";
import {
  stageOf,
  hasActual,
  actualCalc,
  profitOf,
  variance,
  periodRange,
  basisDateOf,
  inPeriod,
  aggregate,
  holdingDays,
} from "./summary";
import { calculate } from "./calc";
import { SAMPLE_CALC } from "./sampleData";
import { CalcInput, Project } from "./types";

/** テスト用の案件を最小構成で作る */
function makeProject(over: Partial<Project> = {}): Project {
  return {
    id: over.id ?? "p1",
    companyId: "vivi",
    name: "テスト案件",
    propertyType: "building",
    calc: structuredClone(SAMPLE_CALC.building) as CalcInput,
    ringi: {} as Project["ringi"],
    scenarios: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
    ...over,
  };
}

describe("ステージ判定", () => {
  it("stage 未設定は査定中", () => {
    expect(stageOf(makeProject())).toBe("assessing");
  });
  it("旧データの acquired フラグは在庫（買取済）に読み替える", () => {
    expect(stageOf(makeProject({ acquired: true }))).toBe("acquired");
  });
  it("stage が入っていればそれを優先（旧フラグより後勝ちしない）", () => {
    expect(stageOf(makeProject({ stage: "settled", acquired: true }))).toBe("settled");
  });
});

describe("実績の有無と切替", () => {
  it("実績未入力なら hasActual=false・actualCalc は計画を返す", () => {
    const p = makeProject();
    expect(hasActual(p)).toBe(false);
    expect(actualCalc(p).sellPrice).toBe(SAMPLE_CALC.building.sellPrice);
  });
  it("決済完了＋実績入力済みなら実績で計算する", () => {
    const actual = { ...structuredClone(SAMPLE_CALC.building), sellPrice: 1750 } as CalcInput;
    const p = makeProject({ stage: "settled", actual: { calc: actual } });
    const { basis, result } = profitOf(p);
    expect(basis).toBe("actual");
    // 販売価格 1750 で計算されている（計画1680より+70）
    expect(result.grossProfit).toBe(calculate(actual).grossProfit);
  });
  it("実績があってもステージが決済完了でなければ計画で集計する（在庫の見込み）", () => {
    const actual = { ...structuredClone(SAMPLE_CALC.building), sellPrice: 1750 } as CalcInput;
    const p = makeProject({ stage: "acquired", actual: { calc: actual } });
    expect(profitOf(p).basis).toBe("plan");
    expect(profitOf(p).result.grossProfit).toBe(calculate(SAMPLE_CALC.building).grossProfit);
  });
});

describe("計画と実績の差異", () => {
  it("売価+70・リフォーム+50 のとき粗利は+20、営業利益も+20", () => {
    const actual = structuredClone(SAMPLE_CALC.building) as CalcInput;
    actual.sellPrice = 1750; // +70
    actual.acquisition.reform = (actual.acquisition.reform ?? 0) + 50; // +50
    const p = makeProject({ stage: "settled", actual: { calc: actual } });
    const v = variance(p);
    expect(v.sellPrice).toBe(70);
    expect(v.acquisition).toBe(50);
    expect(v.expenses).toBe(0);
    expect(v.grossProfit).toBe(20); // 70 - 50
    expect(v.operatingProfit).toBe(20); // 販売経費に変化なし
  });
  it("実績未入力なら差異はすべて0", () => {
    const v = variance(makeProject());
    expect(v.sellPrice).toBe(0);
    expect(v.grossProfit).toBe(0);
    expect(v.operatingProfit).toBe(0);
  });
});

describe("期間プリセット", () => {
  it("今月（末日が31日の月）", () => {
    expect(periodRange("thisMonth", "2026-07-27")).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });
  it("今月（末日が30日の月・2月・うるう年2月）", () => {
    expect(periodRange("thisMonth", "2026-04-10").to).toBe("2026-04-30");
    expect(periodRange("thisMonth", "2026-02-10").to).toBe("2026-02-28");
    expect(periodRange("thisMonth", "2028-02-10").to).toBe("2028-02-29"); // うるう年
  });
  it("今年（暦年）", () => {
    expect(periodRange("thisYear", "2026-07-27")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("今年度は4月始まり：7月なら2026-04-01〜2027-03-31", () => {
    expect(periodRange("thisFiscalYear", "2026-07-27")).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  });
  it("今年度は4月始まり：3月なら前年4月〜当年3月", () => {
    expect(periodRange("thisFiscalYear", "2026-03-31")).toEqual({ from: "2025-04-01", to: "2026-03-31" });
  });
  it("全期間は範囲なし", () => {
    expect(periodRange("all", "2026-07-27")).toEqual({});
  });
  it("期間指定はそのまま（空文字は未指定扱い）", () => {
    expect(periodRange("custom", "2026-07-27", "2026-01-01", "2026-03-31")).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
    });
    expect(periodRange("custom", "2026-07-27", "", "")).toEqual({ from: undefined, to: undefined });
  });
});

describe("期間の基準日", () => {
  it("決済完了は決済日、買取済は買取日、検討中は更新日", () => {
    const settled = makeProject({
      stage: "settled",
      actual: { purchaseDate: "2026-02-01", settleDate: "2026-05-20" },
    });
    const acquired = makeProject({ stage: "acquired", actual: { purchaseDate: "2026-02-01" } });
    const reviewing = makeProject();
    expect(basisDateOf(settled)).toBe("2026-05-20");
    expect(basisDateOf(acquired)).toBe("2026-02-01");
    expect(basisDateOf(reviewing)).toBe("2026-06-15"); // updatedAt の日付部分
  });
  it("該当日付が未入力なら更新日で代替する", () => {
    const p = makeProject({ stage: "settled" });
    expect(basisDateOf(p)).toBe("2026-06-15");
  });
  it("種類を明示指定できる（未入力なら undefined）", () => {
    const p = makeProject({ stage: "settled", actual: { settleDate: "2026-05-20" } });
    expect(basisDateOf(p, "settle")).toBe("2026-05-20");
    expect(basisDateOf(p, "purchase")).toBeUndefined();
    expect(basisDateOf(p, "updated")).toBe("2026-06-15");
  });
});

describe("保有日数", () => {
  it("買取日〜決済日の日数（両端の差）", () => {
    expect(holdingDays("2026-06-01", "2026-07-28")).toBe(57);
    expect(holdingDays("2026-03-01", "2026-07-28")).toBe(149);
  });
  it("決済日が無ければ「今日」までの滞留日数", () => {
    expect(holdingDays("2026-06-01", undefined, "2026-07-28")).toBe(57);
  });
  it("うるう年をまたいでも正しい", () => {
    expect(holdingDays("2028-02-28", "2028-03-01")).toBe(2); // 2/29 があるので2日
  });
  it("買取日が無ければ undefined", () => {
    expect(holdingDays(undefined, "2026-07-28")).toBeUndefined();
  });
});

describe("期間内判定", () => {
  it("範囲未指定なら常に真", () => {
    expect(inPeriod(undefined)).toBe(true);
    expect(inPeriod("2020-01-01")).toBe(true);
  });
  it("両端を含む", () => {
    expect(inPeriod("2026-04-01", "2026-04-01", "2026-06-30")).toBe(true);
    expect(inPeriod("2026-06-30", "2026-04-01", "2026-06-30")).toBe(true);
  });
  it("範囲外は偽", () => {
    expect(inPeriod("2026-03-31", "2026-04-01", "2026-06-30")).toBe(false);
    expect(inPeriod("2026-07-01", "2026-04-01", "2026-06-30")).toBe(false);
  });
  it("期間を絞っているのに基準日が無いものは対象外", () => {
    expect(inPeriod(undefined, "2026-04-01")).toBe(false);
  });
});

describe("粗利集計", () => {
  it("0件は全項目0", () => {
    const a = aggregate([]);
    expect(a.count).toBe(0);
    expect(a.grossTotal).toBe(0);
    expect(a.operatingMargin).toBe(0);
  });

  it("計画ベース2件の合計（サンプル戸建＋サンプル土地）", () => {
    const p1 = makeProject({ id: "a", calc: structuredClone(SAMPLE_CALC.building) as CalcInput });
    const p2 = makeProject({
      id: "b",
      propertyType: "land",
      calc: structuredClone(SAMPLE_CALC.land) as CalcInput,
    });
    const a = aggregate([p1, p2]);
    // 別ルートで検算：サンプルの期待値（戸建 粗利328/営業212、土地 粗利245/営業204）
    expect(a.count).toBe(2);
    expect(a.actualCount).toBe(0);
    expect(a.sellTotal).toBe(1680 + 750);
    expect(a.grossTotal).toBe(328 + 245);
    expect(a.operatingTotal).toBe(212 + 204);
    // 利益率は加重平均（合計÷合計）
    expect(a.operatingMargin).toBeCloseTo((212 + 204) / (1680 + 750), 6);
    expect(a.grossMargin).toBeCloseTo((328 + 245) / (1680 + 750), 6);
    expect(a.avgOperatingProfit).toBe((212 + 204) / 2);
  });

  it("決済完了案件は実績で集計され、actualCount に数えられる", () => {
    const actual = structuredClone(SAMPLE_CALC.building) as CalcInput;
    actual.sellPrice = 1600; // 値下げして着地（-80）
    const settled = makeProject({ id: "s", stage: "settled", actual: { calc: actual } });
    const plan = makeProject({ id: "p" });
    const a = aggregate([settled, plan]);
    expect(a.actualCount).toBe(1);
    // 売上は 1600（実績）+ 1680（計画）
    expect(a.sellTotal).toBe(1600 + 1680);
    // 粗利は 実績(1600-1352=248) + 計画328
    expect(a.grossTotal).toBe(248 + 328);
  });

  it("売上0のときは利益率を0にする（ゼロ除算しない）", () => {
    const empty = makeProject({
      id: "z",
      calc: { propertyType: "building", sellPrice: 0, acquisition: {}, expenses: {}, selling: {} },
    });
    const a = aggregate([empty]);
    expect(a.sellTotal).toBe(0);
    expect(a.grossMargin).toBe(0);
    expect(a.operatingMargin).toBe(0);
  });
});
