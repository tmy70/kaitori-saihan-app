import { describe, it, expect } from "vitest";
import {
  calculate,
  calcBrokerage,
  calcAcquisitionTax,
  calcTaxProration,
  breakEvenPrice,
  sqmToTsubo,
  tsuboUnitPrice,
  receivedBrokerage,
  consolidatedProfit,
  sumLotsPrice,
  sumLotsTsubo,
  avgLotUnitPrice,
} from "./calc";
import { SAMPLE_CALC, SAMPLE_EXPECTED } from "./sampleData";
import { PropertyType } from "./types";

const TYPES: PropertyType[] = ["building", "land", "kenuri", "mansion", "subdivision"];

describe("calculate: サンプルの期待値と一致する", () => {
  for (const t of TYPES) {
    it(`${t}`, () => {
      const r = calculate(SAMPLE_CALC[t]);
      const exp = SAMPLE_EXPECTED[t];
      // 粗利益・営業利益は完全一致（万円）
      expect(r.grossProfit).toBe(exp.grossProfit);
      expect(r.operatingProfit).toBe(exp.operatingProfit);
      // 利益率は四捨五入で％一致
      expect(Math.round(r.grossMargin * 100)).toBe(exp.grossMarginPct);
      expect(Math.round(r.operatingMargin * 100)).toBe(exp.operatingMarginPct);
    });
  }
});

describe("計算の整合性（売上原価=取得原価+経費、粗利=販売-売上原価）", () => {
  it("building", () => {
    const r = calculate(SAMPLE_CALC.building);
    expect(r.costOfSales).toBe(r.acquisitionCost + r.expensesTotal);
    expect(r.grossProfit).toBe(SAMPLE_CALC.building.sellPrice - r.costOfSales);
    expect(r.operatingProfit).toBe(r.grossProfit - r.sellingExpenses);
  });
});

describe("補助計算", () => {
  it("仲介手数料 = 価格×3% + 6万円", () => {
    expect(calcBrokerage(1680)).toBe(56.4); // 1680*0.03=50.4 +6 = 56.4
    expect(calcBrokerage(0)).toBe(0);
  });
  it("不動産取得税 = 土地×1.5% + 建物×3%", () => {
    // 土地1000万→15、建物500万→15 = 30
    expect(calcAcquisitionTax(1000, 500)).toBe(30);
  });
  it("固都税精算金 = 年額×日数/365", () => {
    expect(calcTaxProration(36.5, 100)).toBeCloseTo(10, 5);
  });
});

describe("坪単価", () => {
  it("㎡→坪（×0.3025）", () => {
    expect(sqmToTsubo(100)).toBe(30.25);
    expect(sqmToTsubo(0)).toBe(0);
    expect(sqmToTsubo(undefined)).toBe(0);
  });
  it("坪単価 = 販売価格 ÷ 坪数", () => {
    expect(tsuboUnitPrice(750, 50)).toBe(15); // 750万 ÷ 50坪 = 15万/坪
    expect(tsuboUnitPrice(750, 0)).toBe(0); // 坪数0は0
    expect(tsuboUnitPrice(750, undefined)).toBe(0);
  });
});

describe("分譲地の区画集計", () => {
  const lots = [
    { id: "1", name: "A", tsubo: 50, unitPrice: 22 },
    { id: "2", name: "B", tsubo: 40, unitPrice: 25 },
  ];
  it("総販売価格 = Σ(坪数×坪単価)", () => {
    expect(sumLotsPrice(lots)).toBe(50 * 22 + 40 * 25); // 1100 + 1000 = 2100
  });
  it("合計坪数", () => {
    expect(sumLotsTsubo(lots)).toBe(90);
  });
  it("平均坪単価 = 総販売価格 ÷ 合計坪数", () => {
    expect(avgLotUnitPrice(lots)).toBeCloseTo(2100 / 90, 2);
  });
  it("区画なしは0", () => {
    expect(sumLotsPrice([])).toBe(0);
    expect(avgLotUnitPrice(undefined)).toBe(0);
  });
});

describe("連結粗利（自社グループ仲介）", () => {
  it("groupBrokerage が無ければ受取手数料0・連結粗利=営業利益", () => {
    const input = SAMPLE_CALC.building;
    const r = calculate(input);
    expect(receivedBrokerage(input)).toBe(0);
    expect(consolidatedProfit(r, input)).toBe(r.operatingProfit);
  });
  it("groupBrokerage 有効なら営業利益＋(価格×3%+6万)", () => {
    const input = { ...SAMPLE_CALC.building, groupBrokerage: true };
    const r = calculate(input);
    const fee = calcBrokerage(input.sellPrice); // 1680→56.4
    expect(receivedBrokerage(input)).toBe(fee);
    expect(consolidatedProfit(r, input)).toBeCloseTo(r.operatingProfit + fee, 5);
  });
});

describe("損益分岐価格", () => {
  it("固定販売経費0なら P = 売上原価+6 を 0.97 で割った値", () => {
    // costOfSales=1352, 他販売経費0 → (1352+6)/0.97
    const p = breakEvenPrice(1352, 0, 0, 0);
    expect(p).toBeCloseTo((1352 + 6) / 0.97, 1);
  });
  it("営業利益0価格で計算すると営業利益はほぼ0になる", () => {
    const cost = 1352;
    const p = breakEvenPrice(cost, 0, 0, 0);
    // 検算: 営業利益 = P - cost - (0.03P+6)
    const op = p - cost - (0.03 * p + 6);
    expect(op).toBeCloseTo(0, 1);
  });
});
