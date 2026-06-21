// ============================================================
// IndexedDB 永続化（idb 使用）
// ストア: projects（案件）/ companies（会社マスタ）/ settings（アプリ設定）
// ※JSONダウンロード方式は使わず、ブラウザ内ストレージで完結させる。
// ============================================================
import { openDB, IDBPDatabase } from "idb";
import { AppSettings, Company, Project } from "./types";
import { INITIAL_COMPANIES, DEFAULT_COMPANY_ID } from "./companies";

const DB_NAME = "kaitori-saihan-db";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";
const STORE_COMPANIES = "companies";
const STORE_SETTINGS = "settings";
const SETTINGS_KEY = "app";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDBが利用できない環境です");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const s = db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
          s.createIndex("companyId", "companyId");
          s.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains(STORE_COMPANIES)) {
          db.createObjectStore(STORE_COMPANIES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      },
    });
  }
  return dbPromise;
}

/** 初回起動時: 会社マスタ・設定の初期投入 */
export async function ensureSeed(): Promise<void> {
  const db = await getDB();
  const companies = await db.getAll(STORE_COMPANIES);
  if (companies.length === 0) {
    const tx = db.transaction(STORE_COMPANIES, "readwrite");
    for (const c of INITIAL_COMPANIES) await tx.store.put(c);
    await tx.done;
  }
  const settings = await db.get(STORE_SETTINGS, SETTINGS_KEY);
  if (!settings) {
    await db.put(
      STORE_SETTINGS,
      { defaultCompanyId: DEFAULT_COMPANY_ID, theme: "light" } as AppSettings,
      SETTINGS_KEY
    );
  }
}

// ---------------- Projects ----------------
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_PROJECTS);
  return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get(STORE_PROJECTS, id);
}

export async function saveProject(p: Project): Promise<void> {
  const db = await getDB();
  await db.put(STORE_PROJECTS, p);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PROJECTS, id);
}

// ---------------- Companies ----------------
export async function getAllCompanies(): Promise<Company[]> {
  const db = await getDB();
  return db.getAll(STORE_COMPANIES);
}

export async function saveCompany(c: Company): Promise<void> {
  const db = await getDB();
  await db.put(STORE_COMPANIES, c);
}

export async function deleteCompany(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_COMPANIES, id);
}

// ---------------- Settings ----------------
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const s = await db.get(STORE_SETTINGS, SETTINGS_KEY);
  return s ?? { defaultCompanyId: DEFAULT_COMPANY_ID, theme: "light" };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put(STORE_SETTINGS, s, SETTINGS_KEY);
}

/** 任意バックアップ用エクスポート（主たる保存手段ではない） */
export async function exportAll() {
  const [projects, companies, settings] = await Promise.all([
    getAllProjects(),
    getAllCompanies(),
    getSettings(),
  ]);
  return { projects, companies, settings, exportedAt: new Date().toISOString() };
}
