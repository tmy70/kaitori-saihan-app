"use client";
// ============================================================
// Zustand ストア（案件編集の状態 + 自動保存）
// ============================================================
import { create } from "zustand";
import { AppSettings, Company, Project } from "./types";
import { reconcileChecklist, reconcileSchedule, defaultPassLine } from "./checklist";
import * as db from "./db";

/**
 * 読み込んだ案件を現行のデータ構造に正規化する。
 *  ・チェックリストを物件種別に合わせて再構成（旧データの移行を含む）
 *  ・追加費目の配列が無い場合は空配列で補う
 */
function normalizeProject(p: Project): Project {
  return {
    ...p,
    calc: {
      ...p.calc,
      acquisitionExtra: p.calc.acquisitionExtra ?? [],
      expensesExtra: p.calc.expensesExtra ?? [],
      sellingExtra: p.calc.sellingExtra ?? [],
    },
    ringi: {
      ...p.ringi,
      checklist: reconcileChecklist(p.ringi.checklist, p.propertyType),
      checklistPassLine: p.ringi.checklistPassLine ?? defaultPassLine(p.propertyType),
      schedule: reconcileSchedule(p.ringi.schedule),
    },
  };
}

interface AppState {
  companies: Company[];
  settings: AppSettings | null;
  current: Project | null; // 編集中の案件
  saving: boolean;
  lastSavedAt: string | null;
  initialized: boolean;

  init: () => Promise<void>;
  reloadCompanies: () => Promise<void>;
  setCurrent: (p: Project | null) => void;
  /** 編集中案件を部分更新し、自動保存をスケジュール */
  update: (patch: Partial<Project>) => void;
  /** 即時保存 */
  saveNow: () => Promise<void>;
  setSettings: (s: AppSettings) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<AppState>((set, get) => ({
  companies: [],
  settings: null,
  current: null,
  saving: false,
  lastSavedAt: null,
  initialized: false,

  init: async () => {
    await db.ensureSeed();
    const [companies, settings] = await Promise.all([db.getAllCompanies(), db.getSettings()]);
    set({ companies, settings, initialized: true });
  },

  reloadCompanies: async () => {
    const companies = await db.getAllCompanies();
    set({ companies });
  },

  setCurrent: (p) =>
    set({ current: p ? normalizeProject(p) : null, lastSavedAt: p?.updatedAt ?? null }),

  update: (patch) => {
    const cur = get().current;
    if (!cur) return;
    const next: Project = { ...cur, ...patch, updatedAt: new Date().toISOString() };
    set({ current: next });
    // 自動保存（デバウンス 600ms）
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().saveNow();
    }, 600);
  },

  saveNow: async () => {
    const cur = get().current;
    if (!cur) return;
    set({ saving: true });
    try {
      await db.saveProject(cur);
      set({ saving: false, lastSavedAt: cur.updatedAt });
    } catch (e) {
      console.error("保存に失敗しました", e);
      set({ saving: false });
    }
  },

  setSettings: async (s) => {
    await db.saveSettings(s);
    set({ settings: s });
  },
}));
