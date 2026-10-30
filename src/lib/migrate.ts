// ============================================================
// 旧データの移行（案件を読み込むたびに現行のデータ構造へそろえる）
//
// 移行の原則：**計算書（calc）の金額には手を触れない**。
// 査定入力は計算書から導出して補うだけなので、既存案件の金額・利益は移行前後で変わらない。
// この不変性は migration.test.ts で検証している。
//
// 移行の内容：
//   1. 取得原価にあった境界確定・上下水道・外構費用を経費へ移す（費目の統一。合計は不変）
//   2. 旧「買取完了」タグ（acquired）と旧ステージ "reviewing" を現行ステージへ読み替える
//   3. チェックリスト・スケジュールを物件種別に合わせて再構成する
//   4. 査定入力（assessment）を計算書から復元する
//   5. お客様向け書類の設定（docs）に既定文を入れる
// ============================================================
import { Project } from "./types";
import { reconcileChecklist, reconcileSchedule, defaultPassLine } from "./checklist";
import { deriveAssessment } from "./assessment";
import { defaultDocSettings } from "./docDefaults";
import { stageOf } from "./summary";

/**
 * 旧データ移行：取得原価にあった「境界確定/上下水道/外構」費用を経費へ移す。
 * （費目を取得原価→経費へ統一したため。合計額は変わらないが、表示場所を正す）
 */
function migrateSiteworkToExpenses(calc: Project["calc"]): Project["calc"] {
  const moves: [string, string][] = [
    ["boundary", "expBoundary"],
    ["waterSupply", "expWaterSupply"],
    ["exterior", "expExterior"],
  ];
  const acquisition = { ...calc.acquisition };
  const expenses = { ...calc.expenses };
  let changed = false;
  for (const [from, to] of moves) {
    if (acquisition[from] != null) {
      expenses[to] = (expenses[to] ?? 0) + acquisition[from];
      delete acquisition[from];
      changed = true;
    }
  }
  return changed ? { ...calc, acquisition, expenses } : calc;
}

/** 読み込んだ案件を現行のデータ構造へそろえる */
export function normalizeProject(p: Project): Project {
  const migratedCalc = migrateSiteworkToExpenses(p.calc);
  const withCalc: Project = {
    ...p,
    stage: stageOf(p),
    archived: p.archived ?? false,
    calc: {
      ...migratedCalc,
      acquisitionExtra: migratedCalc.acquisitionExtra ?? [],
      expensesExtra: migratedCalc.expensesExtra ?? [],
      sellingExtra: migratedCalc.sellingExtra ?? [],
      lots: migratedCalc.lots ?? [],
    },
    ringi: {
      ...p.ringi,
      checklist: reconcileChecklist(p.ringi.checklist, p.propertyType),
      checklistPassLine: p.ringi.checklistPassLine ?? defaultPassLine(p.propertyType),
      schedule: reconcileSchedule(p.ringi.schedule, p.propertyType),
    },
    docs: p.docs ?? defaultDocSettings(),
  };
  // 査定入力が無い旧データは、計算書の中身から同じ数字になるよう復元する
  return { ...withCalc, assessment: p.assessment ?? deriveAssessment(withCalc) };
}
