// @react-pdf 用の日本語フォント登録（Noto Sans JP 埋め込み）
import { Font } from "@react-pdf/renderer";
import { asset } from "@/lib/basePath";

let registered = false;

export function ensureFont() {
  if (registered) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: asset("/fonts/NotoSansJP-Regular.ttf"), fontWeight: "normal" },
      { src: asset("/fonts/NotoSansJP-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // 日本語の自動改行を有効化（1文字単位で折返し可能にする）
  Font.registerHyphenationCallback((word) =>
    word.length > 1 ? Array.from(word) : [word]
  );
  registered = true;
}
