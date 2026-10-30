// ============================================================
// 買取価格の逆算テスト
//
// 中心となる確認は「往復」：
//   逆算で求めた買取価格を計算書に入れ直して順計算すると、指定した利益に戻る。
// 逆算と順計算が食い違っていれば、ここで必ず落ちる。
// ============================================================
import { describe, expect, it } from "vitest";
import { calculate, reverseBuyPrice } from "./calc";
import {
  assessmentToCalcInput,
  deriveAssessment,
  priceLines,
  resolveAssessment,
  reverseInputOf,
} from "./assessment";
import { PROFIT_LINES, TYPE_PRESETS } from "./presets";
import { AssessmentInput, Project, PropertyType } from "./types";
import { createEmptyProject, createSampleProject } from "./sampleData";

const TYPES: PropertyType[] = ["building", "land", "kenuri", "mansion", "subdivision"];

/** 種別ごとの査定入力サンプル（再販想定価格は既存サンプル案件の販売価格に合わせる） */
const RESALE: Record<PropertyType, number> = {
  building: 1680,
  land: 750,
  kenuri: 2480,
  mansion: 3400,
  subdivision: 3300,
};

function sampleAssessment(type: PropertyType): AssessmentInput {
  return {
    resalePrice: RESALE[type],
    workCost: TYPE_PRESETS[type].workCost,
    includeBuyFee: true,
  };
}

/** 丸め誤差の許容幅（万円）。0.02万円＝200円 */
const TOL = 0.02;

describe("reverseBuyPrice（逆算）", () => {
  it("すべての種別・利益ラインで収束する", () => {
    for (const type of TYPES) {
      const r = resolveAssessment(type, sampleAssessment(type));
      for (const profit of PROFIT_LINES) {
        const res = reverseBuyPrice(reverseInputOf(r, profit));
        expect(res.converged, `${type} / 利益${profit}万円`).toBe(true);
        // 連動分の係数は3%程度なので、十数回あれば十分に収束する
        expect(res.iterations).toBeLessThan(20);
      }
    }
  });

  it("逆算した買取価格で順計算すると、指定した利益に戻る（往復）", () => {
    for (const type of TYPES) {
      const a = sampleAssessment(type);
      const r = resolveAssessment(type, a);
      for (const profit of PROFIT_LINES) {
        const res = reverseBuyPrice(reverseInputOf(r, profit));
        expect(res.feasible, `${type} / 利益${profit}万円 が成立しない`).toBe(true);

        // 逆算した買取価格を計算書に入れ直して順計算する
        const calc = assessmentToCalcInput(type, a, res.buyPrice);
        const forward = calculate(calc);

        expect(
          Math.abs(forward.operatingProfit - profit),
          `${type} / 利益${profit}万円: 順計算=${forward.operatingProfit}`
        ).toBeLessThan(TOL);
      }
    }
  });

  it("逆算結果の resultProfit が順計算の営業利益と一致する", () => {
    for (const type of TYPES) {
      const a = sampleAssessment(type);
      const r = resolveAssessment(type, a);
      for (const profit of PROFIT_LINES) {
        const res = reverseBuyPrice(reverseInputOf(r, profit));
        const forward = calculate(assessmentToCalcInput(type, a, res.buyPrice));
        expect(Math.abs(res.resultProfit - forward.operatingProfit), `${type}/${profit}`).toBeLessThan(
          TOL
        );
      }
    }
  });

  it("利益ラインが高いほど買取価格は下がり、その差は利益の差と等しい", () => {
    for (const type of TYPES) {
      const lines = priceLines(type, sampleAssessment(type));
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].result.buyPrice, type).toBeLessThan(lines[i - 1].result.buyPrice);
      }
      // 利益を50万円増やすと、買取価格は 50 ÷ (1 + 手数料率3%) ≒ 48.5万円 下がる
      const diff = lines[0].result.buyPrice - lines[1].result.buyPrice;
      expect(diff).toBeGreaterThan(48);
      expect(diff).toBeLessThan(50);
    }
  });

  it("購入時手数料を見込まない場合は、その分だけ買取価格が上がる", () => {
    const type: PropertyType = "building";
    const withFee = reverseBuyPrice(
      reverseInputOf(resolveAssessment(type, sampleAssessment(type)), 200)
    );
    const withoutFee = reverseBuyPrice(
      reverseInputOf(
        resolveAssessment(type, { ...sampleAssessment(type), includeBuyFee: false }),
        200
      )
    );
    expect(withoutFee.buyFee).toBe(0);
    expect(withoutFee.buyPrice).toBeGreaterThan(withFee.buyPrice);
    // 手数料を見込まない側でも往復が成り立つ
    const forward = calculate(
      assessmentToCalcInput(type, { ...sampleAssessment(type), includeBuyFee: false }, withoutFee.buyPrice)
    );
    expect(Math.abs(forward.operatingProfit - 200)).toBeLessThan(TOL);
  });

  it("取得税を買取価格連動（率）で見積もっても収束し、往復が成り立つ", () => {
    const base = reverseInputOf(resolveAssessment("building", sampleAssessment("building")), 200);
    const res = reverseBuyPrice({ ...base, acquisitionTaxRate: 0.025 });
    expect(res.converged).toBe(true);
    // 取得税＝買取価格×2.5%
    expect(Math.abs(res.acquisitionTax - res.buyPrice * 0.025)).toBeLessThan(0.01);
    // 順計算に入れ直しても指定利益に戻る
    const calc = assessmentToCalcInput(
      "building",
      { ...sampleAssessment("building"), acquisitionTax: res.acquisitionTax },
      res.buyPrice
    );
    expect(Math.abs(calculate(calc).operatingProfit - 200)).toBeLessThan(TOL);
  });

  it("販売時仲介手数料を見込まない場合、その分だけ買取価格が上がる", () => {
    const a = sampleAssessment("building");
    const withB = reverseBuyPrice(reverseInputOf(resolveAssessment("building", a), 200));
    const withoutB = reverseBuyPrice(
      reverseInputOf(resolveAssessment("building", { ...a, noSellBrokerage: true }), 200)
    );
    expect(withoutB.sellBrokerage).toBe(0);
    // 1680万円の仲介手数料 56.4万円ぶん、買取価格の余力が増える（手数料率3%で割り戻す）
    expect(withoutB.buyPrice - withB.buyPrice).toBeGreaterThan(54);
  });

  it("再販想定価格が低すぎる場合は成立しない（feasible=false）", () => {
    const res = reverseBuyPrice(
      reverseInputOf(resolveAssessment("building", { resalePrice: 500, workCost: 600 }), 250)
    );
    expect(res.feasible).toBe(false);
    expect(res.buyPrice).toBeLessThan(0);
  });

  it("再販想定価格が未入力でも落ちない", () => {
    const lines = priceLines("building", { resalePrice: 0, workCost: 0 });
    expect(lines).toHaveLength(4);
    for (const l of lines) expect(Number.isFinite(l.result.buyPrice)).toBe(true);
  });
});

describe("assessmentToCalcInput（査定→計算書）", () => {
  it("工事費が種別ごとの費目に入る", () => {
    expect(assessmentToCalcInput("building", sampleAssessment("building"), 500).acquisition.reform).toBe(600);
    expect(assessmentToCalcInput("land", sampleAssessment("land"), 100).acquisition.demolition).toBe(320);
    expect(assessmentToCalcInput("kenuri", sampleAssessment("kenuri"), 300).acquisition.construction).toBe(1650);
    expect(assessmentToCalcInput("mansion", sampleAssessment("mansion"), 2700).acquisition.reform).toBe(100);
    // 分譲地の造成費は経費側に入る
    const sub = assessmentToCalcInput("subdivision", sampleAssessment("subdivision"), 1500);
    expect(sub.expenses.devEarthwork).toBe(1230);
    expect(sub.acquisition.devEarthwork).toBeUndefined();
  });

  it("買取価格と購入時手数料が取得原価に入る", () => {
    const calc = assessmentToCalcInput("building", sampleAssessment("building"), 500);
    expect(calc.acquisition.purchase).toBe(500);
    expect(calc.acquisition.buyFee).toBe(21); // 500×3%＋6万円
  });
});

describe("新規案件（サンプルを複製しなくても使えること）", () => {
  it("作った直後から種別ごとの概算が入っている", () => {
    for (const type of TYPES) {
      const p = createEmptyProject(type, "yukari");
      const preset = TYPE_PRESETS[type];
      expect(p.assessment, type).toBeDefined();
      expect(p.assessment?.workCost, `${type} 工事費`).toBe(preset.workCost);
      expect(p.assessment?.registration, `${type} 登記費用`).toBe(preset.registration);
      expect(p.assessment?.acquisitionTax, `${type} 取得税`).toBe(preset.acquisitionTax);
      expect(p.assessment?.expenses, `${type} 経費`).toBe(preset.expenses);
      expect(p.assessment?.sellingOther, `${type} 販売経費`).toBe(preset.sellingOther);
      expect(p.stage).toBe("assessing");
    }
  });

  it("再販想定価格を入れるだけで4本の買取価格が出る", () => {
    for (const type of TYPES) {
      const p = createEmptyProject(type, "yukari");
      // 価格未入力のうちは成立しない
      expect(priceLines(type, p.assessment).every((l) => !l.result.feasible)).toBe(true);

      // 再販想定価格だけを入れる（査定画面で最初に打つ値）
      const withPrice = { ...p.assessment!, resalePrice: RESALE[type] };
      const lines = priceLines(type, withPrice);
      expect(lines).toHaveLength(4);
      for (const l of lines) {
        expect(l.result.feasible, `${type} / 利益${l.profit}万円`).toBe(true);
        expect(l.displayPrice).toBeGreaterThan(0);
        // 逆算した価格で順計算すると、指定した利益に戻る
        const forward = calculate(assessmentToCalcInput(type, withPrice, l.result.buyPrice));
        expect(Math.abs(forward.operatingProfit - l.profit), `${type}/${l.profit}`).toBeLessThan(TOL);
      }
    }
  });

  it("書類の既定値（前提条件・保証の条件）が入っている", () => {
    const p = createEmptyProject("building", "yukari");
    expect(p.docs?.conditions?.length).toBeGreaterThan(0);
    expect(p.docs?.guaranteeConditions?.length).toBeGreaterThan(0);
    // 売主様側の仲介手数料は未選択で始まる（選ぶまで買取査定書を出さない）
    expect(p.docs?.sellerFee).toBe("");
  });
});

describe("deriveAssessment（既存案件からの復元）", () => {
  it("復元した査定入力から組み直しても、計算書の合計が変わらない", () => {
    for (const type of TYPES) {
      const p: Project = createSampleProject(type);
      const before = calculate(p.calc);
      const a = deriveAssessment(p);
      const rebuilt = assessmentToCalcInput(type, a, a.offerPrice ?? 0);
      const after = calculate(rebuilt);

      expect(after.costOfSales, `${type} 売上原価`).toBeCloseTo(before.costOfSales, 2);
      expect(after.sellingExpenses, `${type} 販売経費`).toBeCloseTo(before.sellingExpenses, 2);
      expect(after.grossProfit, `${type} 粗利益`).toBeCloseTo(before.grossProfit, 2);
      expect(after.operatingProfit, `${type} 営業利益`).toBeCloseTo(before.operatingProfit, 2);
    }
  });

  it("再販想定価格・提示価格が計算書の数字を引き継ぐ", () => {
    const p = createSampleProject("mansion");
    const a = deriveAssessment(p);
    expect(a.resalePrice).toBe(3400);
    expect(a.offerPrice).toBe(2700);
    expect(a.includeBuyFee).toBe(true); // サンプルは購入時手数料96万円が入っている
    // 96万円は計算式（2700×3%＋6万＝87万）と違うので、固定額として保持される
    expect(a.buyFee).toBe(96);
  });

  it("費目が空の案件でも落ちない", () => {
    const p: Project = {
      ...createSampleProject("building"),
      calc: { propertyType: "building", sellPrice: 0, acquisition: {}, expenses: {}, selling: {} },
    };
    const a = deriveAssessment(p);
    expect(a.resalePrice).toBe(0);
    expect(a.workCost).toBe(0);
    expect(a.offerPrice).toBeUndefined();
  });
});
