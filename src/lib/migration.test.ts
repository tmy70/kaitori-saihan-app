// ============================================================
// 旧データ移行のテスト
//
// いちばん大事な確認は「既存の案件がすべて開け、数字が変わっていない」こと。
// 旧形式の案件を移行にかけ、計算結果（売上原価・粗利益・営業利益）が
// 移行前とまったく同じであることを確かめる。
// ============================================================
import { describe, expect, it } from "vitest";
import { normalizeProject } from "./migrate";
import { calculate } from "./calc";
import { stageOf, normalizeStage } from "./summary";
import { createSampleProject } from "./sampleData";
import { Project, PropertyType } from "./types";

const TYPES: PropertyType[] = ["building", "land", "kenuri", "mansion", "subdivision"];

/**
 * 旧形式（今回の改修より前）の案件を作る。
 *  ・stage は旧名称 "reviewing" か未設定
 *  ・assessment / docs は存在しない
 *  ・取得原価に旧費目（boundary / waterSupply / exterior）が入っている場合がある
 */
function legacyProject(type: PropertyType, extra: Partial<Project> = {}): Project {
  const p = createSampleProject(type);
  const legacy = {
    ...p,
    stage: "reviewing",
    ...extra,
  } as unknown as Project;
  delete (legacy as Partial<Project>).assessment;
  delete (legacy as Partial<Project>).docs;
  return legacy;
}

describe("normalizeProject（旧データ移行）", () => {
  it("旧ステージ reviewing は査定中に読み替える", () => {
    expect(normalizeProject(legacyProject("building")).stage).toBe("assessing");
  });

  it("ステージ未設定で旧「買取完了」タグが立っていれば在庫になる", () => {
    const p = legacyProject("building");
    delete (p as Partial<Project>).stage;
    (p as Project).acquired = true;
    expect(normalizeProject(p).stage).toBe("acquired");
  });

  it("ステージ未設定・タグ無しは査定中になる", () => {
    const p = legacyProject("land");
    delete (p as Partial<Project>).stage;
    expect(normalizeProject(p).stage).toBe("assessing");
  });

  it("現行ステージはそのまま保たれる", () => {
    for (const s of ["assessing", "offered", "decided", "acquired", "settled"] as const) {
      expect(normalizeProject({ ...legacyProject("building"), stage: s }).stage).toBe(s);
    }
  });

  it("想定外のステージ名でも落ちず、査定中として扱う", () => {
    const p = { ...legacyProject("building"), stage: "unknown-stage" } as unknown as Project;
    expect(normalizeProject(p).stage).toBe("assessing");
    expect(normalizeStage(undefined)).toBe("assessing");
    expect(normalizeStage(123)).toBe("assessing");
  });

  it("移行しても計算結果（売上原価・粗利益・営業利益）が変わらない", () => {
    for (const type of TYPES) {
      const before = legacyProject(type);
      const beforeResult = calculate(before.calc);
      const after = normalizeProject(before);
      const afterResult = calculate(after.calc);

      expect(afterResult.costOfSales, `${type} 売上原価`).toBe(beforeResult.costOfSales);
      expect(afterResult.grossProfit, `${type} 粗利益`).toBe(beforeResult.grossProfit);
      expect(afterResult.operatingProfit, `${type} 営業利益`).toBe(beforeResult.operatingProfit);
      expect(after.calc.sellPrice, `${type} 販売価格`).toBe(before.calc.sellPrice);
    }
  });

  it("旧費目（境界確定・上下水道・外構）を経費へ移しても売上原価は変わらない", () => {
    const p = legacyProject("building");
    p.calc = {
      ...p.calc,
      acquisition: { ...p.calc.acquisition, boundary: 35, waterSupply: 20, exterior: 15 },
      expenses: { fireInsurance: 2 },
    };
    const beforeCost = calculate(p.calc).costOfSales;
    const after = normalizeProject(p);

    expect(after.calc.acquisition.boundary).toBeUndefined();
    expect(after.calc.expenses.expBoundary).toBe(35);
    expect(after.calc.expenses.expWaterSupply).toBe(20);
    expect(after.calc.expenses.expExterior).toBe(15);
    expect(calculate(after.calc).costOfSales).toBe(beforeCost);
  });

  it("査定入力が無い案件には計算書と同じ数字の査定入力が入る", () => {
    const p = legacyProject("mansion");
    const after = normalizeProject(p);
    expect(after.assessment).toBeDefined();
    expect(after.assessment?.resalePrice).toBe(p.calc.sellPrice);
    expect(after.assessment?.offerPrice).toBe(p.calc.acquisition.purchase);
  });

  it("すでに査定入力がある案件は上書きしない", () => {
    const p = { ...legacyProject("building"), assessment: { resalePrice: 9999, workCost: 1 } };
    expect(normalizeProject(p).assessment?.resalePrice).toBe(9999);
  });

  it("書類設定に既定の前提条件が入り、仲介手数料の有無は未選択で始まる", () => {
    const after = normalizeProject(legacyProject("building"));
    expect(after.docs?.conditions?.length).toBeGreaterThan(0);
    expect(after.docs?.guaranteeConditions?.length).toBeGreaterThan(0);
    expect(after.docs?.sellerFee).toBe("");
    expect(after.docs?.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(after.docs?.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("すでに書類設定がある案件は上書きしない", () => {
    const p = { ...legacyProject("building"), docs: { sellerName: "富山 太郎", sellerFee: "none" as const } };
    const after = normalizeProject(p);
    expect(after.docs?.sellerName).toBe("富山 太郎");
    expect(after.docs?.sellerFee).toBe("none");
  });

  it("何度移行しても結果が変わらない（冪等）", () => {
    for (const type of TYPES) {
      const once = normalizeProject(legacyProject(type));
      const twice = normalizeProject(once);
      expect(calculate(twice.calc)).toEqual(calculate(once.calc));
      expect(twice.assessment).toEqual(once.assessment);
      expect(twice.stage).toBe(once.stage);
    }
  });

  it("チェックリスト・スケジュールが欠けていても開ける", () => {
    const p = legacyProject("building");
    (p.ringi as { checklist?: unknown }).checklist = undefined;
    (p.ringi as { schedule?: unknown }).schedule = undefined;
    const after = normalizeProject(p);
    expect(after.ringi.checklist.length).toBeGreaterThan(0);
    expect(after.ringi.schedule.length).toBeGreaterThan(0);
  });
});

describe("stageOf", () => {
  it("旧ステージ reviewing を査定中として返す", () => {
    const p = { ...createSampleProject("building"), stage: "reviewing" } as unknown as Project;
    expect(stageOf(p)).toBe("assessing");
  });
});
