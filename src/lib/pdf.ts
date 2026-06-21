"use client";
// PDFをブラウザでBlob生成してダウンロードするヘルパー
import { pdf } from "@react-pdf/renderer";
import { ReactElement } from "react";
import { ensureFont } from "@/components/pdf/registerFont";

export async function downloadPdf(doc: ReactElement, filename: string) {
  ensureFont();
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 後始末
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
