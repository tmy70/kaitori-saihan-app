"use client";
// PDFをブラウザで生成し、別タブで開く（または保存する）ヘルパー
import { pdf } from "@react-pdf/renderer";
import { ReactElement } from "react";
import { ensureFont } from "@/components/pdf/registerFont";

/** PDFを生成してBlob URLを返す（呼び出し側で開く/保存する） */
export async function renderPdfUrl(doc: ReactElement): Promise<string> {
  ensureFont();
  const blob = await pdf(doc).toBlob();
  return URL.createObjectURL(blob);
}

/** ダウンロード保存（フォールバック用） */
export function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 後方互換: 直接ダウンロード */
export async function downloadPdf(doc: ReactElement, filename: string) {
  const url = await renderPdfUrl(doc);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
