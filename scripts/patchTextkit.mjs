// ============================================================
// @react-pdf/textkit の行分割パッチ（postinstall で自動実行）
//
// 【何が問題か】
// @react-pdf は英語を前提に行分割するため、単語の途中で改行するときに
// 行末へハイフン「-」を補う。日本語は単語の区切りが無く1文字ずつが改行位置になるので、
// 「次のとおり買取-／価格をご提示…」のように、文中に不要なハイフンが入ってしまう。
// お客様にお渡しする買取査定書・買取保証書に出てしまうため、そのままにはできない。
//
// 【どう直すか】
// 改行位置の前後が日本語（CJK）の文字なら、改行位置としては残したまま
// ハイフンだけを出さないようにする。英数字の単語は従来どおりハイフンが入る。
// 変更は2か所だけ：
//   1. 改行候補（penalty）に「ハイフン不要」の印を付ける
//   2. 行を切り出すとき、その印が付いていればハイフンを足さない
//
// 【なぜ node_modules を書き換えるのか】
// この分岐はライブラリの内部にあり、アプリ側の設定（registerHyphenationCallback 等）
// では変えられない。最新版（textkit 7系）でも同じ実装のため、更新でも解決しない。
// 対象の記述が見つからない場合は、黙って素通りせずエラーで止める（気づけるようにする）。
// ============================================================
import fs from "node:fs";
import path from "node:path";

const TARGETS = [
  "node_modules/@react-pdf/textkit/lib/textkit.cjs",
  "node_modules/@react-pdf/textkit/lib/textkit.js",
];

/** 日本語（CJK）判定。ひらがな・カタカナ・漢字・全角記号 */
const CJK_HELPER = `var __isCjkBreak = function (a, b) {
  var re = /[\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef]/;
  if (!a || !b) return false;
  return re.test(a[a.length - 1]) || re.test(b[0]);
};
`;

/** 1. 改行候補に「ハイフン不要」の印を付ける */
const PENALTY_FROM = `      acc.push(linebreak.box(width, _value, hyphenated));
      if (syllables[index + 1] && hyphenated) {
        acc.push(linebreak.penalty(hyphenWidth, hyphenPenalty, 1));
      }`;
const PENALTY_TO = `      acc.push(linebreak.box(width, _value, hyphenated));
      if (syllables[index + 1] && hyphenated) {
        var __noHyphen = __isCjkBreak(s, syllables[index + 1]);
        var __pen = linebreak.penalty(__noHyphen ? 0 : hyphenWidth, hyphenPenalty, 1);
        __pen.noHyphen = __noHyphen;
        acc.push(__pen);
      }`;

/** 2. 行を切り出すときにハイフンを足さない */
const INSERT_FROM = `      line = slice(start, end, string);
      line = insertGlyph(line.length, HYPHEN, line);`;
const INSERT_TO = `      line = slice(start, end, string);
      if (!node.noHyphen) line = insertGlyph(line.length, HYPHEN, line);`;

/** 既にパッチ済みかどうかの目印 */
const MARK = "__isCjkBreak";

function patch(file) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    // 依存の構成が変わった場合。インストール直後でなければ無視してよい
    return `見つかりません（スキップ）: ${file}`;
  }
  let src = fs.readFileSync(full, "utf8");
  if (src.includes(MARK)) return `適用済み: ${file}`;

  if (!src.includes(PENALTY_FROM) || !src.includes(INSERT_FROM)) {
    throw new Error(
      `${file} の中身が想定と違うため、日本語の行末ハイフンを消すパッチを当てられませんでした。\n` +
        `@react-pdf/renderer を更新した場合は scripts/patchTextkit.mjs を見直してください。`
    );
  }

  src = src.replace(PENALTY_FROM, PENALTY_TO).replace(INSERT_FROM, INSERT_TO);
  // ヘルパーをファイル先頭（"use strict" の直後）に差し込む
  const useStrict = src.indexOf("'use strict';");
  src =
    useStrict >= 0
      ? src.slice(0, useStrict + 13) + "\n" + CJK_HELPER + src.slice(useStrict + 13)
      : CJK_HELPER + src;

  fs.writeFileSync(full, src, "utf8");
  return `適用しました: ${file}`;
}

let applied = 0;
for (const f of TARGETS) {
  const msg = patch(f);
  if (msg.startsWith("適用しました")) applied++;
  console.log(`[patchTextkit] ${msg}`);
}
if (applied === 0) console.log("[patchTextkit] 変更はありません");
