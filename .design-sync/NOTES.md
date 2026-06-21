# design-sync NOTES — 不動産買取再販アプリ UI

## このリポジトリの性質（重要）
- これは**ライブラリではなく Next.js アプリ**。デザインシステムは `src/components/ui.tsx` の自作UIプリミティブ（12個）を切り出して取り込んでいる。
- **dist/ 公開エントリは無い**ため `--entry ./src/components/ui.tsx` を明示し、各コンポーネントは `componentSrcMap` で `ui.tsx` にピン留めしている（synthエントリは使わない＝アプリのページ/PDF/recharts等を巻き込まないため）。
- **実行はローカルディスク必須**：`C:\dev\kaitori-saihan-app`。プロジェクト本体は Google Drive（`G:\マイドライブ\...`）にあるが、Driveの仮想FSは `node_modules` を壊すため `npm install`／ビルド／同期はローカルで行う。

## ビルド構成
- **CSS**：Tailwind を `dist/ds.css` にコンパイルして `cssEntry` に供給。`buildCmd` に登録済み（`globals.css` を入力に、`ui.tsx` ＋ `.design-sync/previews/**` を content にスキャン）。**プレビューで新しいユーティリティクラスを使う場合は必ず content に含める**（含めないと未コンパイルで無スタイルになる）。
- **フォント**：Noto Sans JP を `public/fonts/*.ttf` から `.design-sync/fonts.css`（`extraFonts`）経由で同梱。
- **テーマ**：`dark` クラスで切替（`globals.css` の `:root` / `.dark` 変数）。プロバイダ不要。

## Known render warns
- なし（12/12 クリーン）。`tokens: 1 missing (below threshold)` は良性（トークンは `dist/ds.css`／`_ds_bundle.css` 側に定義）。

## 既知の対応
- **Modal**：実体は `position: fixed` のオーバーレイ。静的キャプチャでは fixed が縦に潰れるため、プレビュー（`previews/Modal.tsx`）で **transform を持つ相対配置ラッパー**に実Modalを入れて描画している（コンポーネント無改変＝合成）。さらに `overrides.Modal.cardMode = "single"` で GRID_OVERFLOW チェックを免除。
- バンドルは `cn`（ユーティリティ関数）も `window.KaitoriUI` に含むが、コンポーネントカードにはならない（無害）。

## 再同期コマンド（ローカル C:\dev\kaitori-saihan-app で）
```sh
# 1) スクリプト再ステージ（指示の cp -r 行）＋ 依存（初回クローン時のみ）
#    (cd .ds-sync && npm i esbuild ts-morph @types/react playwright && npx playwright install chromium)
# 2) CSS再生成（buildCmd）
npx tailwindcss -c tailwind.config.ts -i src/app/globals.css -o dist/ds.css \
  --content "./src/components/ui.tsx,./.design-sync/previews/**/*.tsx" --minify
# 3) プロジェクトの _ds_sync.json を取得
#    DesignSync(get_file path:_ds_sync.json) → .design-sync/.cache/remote-sync.json
# 4) ドライバ（--entry を必ず渡す）
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./src/components/ui.tsx --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```
- `finalize_plan` / `write_files` の `localDir`・`localPath` は **ds-bundle の絶対パス**（`C:\dev\kaitori-saihan-app\ds-bundle`）で渡す（ツールの cwd は Drive 側のため相対パスは ENOENT になる）。

## Re-sync risks（次回の注意）
- `dist/ds.css` は buildCmd で生成される派生物。Tailwind 設定やクラスが変わったら再生成必須。プレビュー専用クラスは content グロブに必ず入れる。
- Modal プレビューの transform ラッパーは現行の fixed オーバーレイ実装に依存。Modal の実装が変わったら見直す。
- 同期対象は `ui.tsx` の12プリミティブのみ（アプリのページ/タブ/PDFは対象外）。ui.tsx に新しいエクスポートを足したら `componentSrcMap` に追加する。
- `conventions.md` で挙げたクラス・トークン名は今回ビルドと一致を確認済み。`ui.tsx` の配色トークンを変えたら再検証する。
