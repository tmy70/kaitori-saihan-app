# デプロイ手順（GitHub Pages・完全無料・商用OK）

このアプリは**サーバー不要の静的サイト**として動きます。**GitHub に push するだけで自動公開**されます（GitHub Actions が `out/` をビルドして Pages に配信）。

- 費用：**0円**（GitHub Pages 無料・商用利用可）
- AI事業計画書：**ブラウザ版 Claude（claude.ai）に手貼り**方式なので **API課金なし**
- データ：各自の端末のブラウザ内（IndexedDB）に保存（端末・人をまたいだ共有はなし）

> すべて **ローカル本体 `C:\Users\ViVi-n16\claude-work\不動産買取再販 計算・稟議・事業計画書アプリ`** で操作します（Google Drive 上では動きません）。

## 前提
- GitHub アカウント（無料）
- このフォルダは git 初期化＋初回コミット済み（`.github/workflows/deploy.yml` 同梱）

## 手順A：GitHub CLI を使う場合（簡単）
PowerShell で（このセッションで実行するなら先頭に `! ` を付けるとログインがこの画面に出ます）：
```powershell
cd "C:\Users\ViVi-n16\claude-work\不動産買取再販 計算・稟議・事業計画書アプリ"
gh auth login                         # ブラウザで認証（初回のみ）
gh repo create kaitori-saihan-app --private --source . --push
```
- `--private` で非公開リポジトリにできます（**ソースは非公開／公開サイトは見える**）。ただし**無料アカウントで非公開リポジトリから Pages 公開するには制限がある**ため、うまくいかない場合は `--public` にしてください（コードに秘密情報は入っていないので公開で問題ありません）。
- push 後、GitHub の **Settings → Pages → Build and deployment → Source = "GitHub Actions"** を選択。
- 数分で公開URL（例：`https://<ユーザー名>.github.io/kaitori-saihan-app/`）が有効になります。

## 手順B：GitHub の画面で作る場合
1. github.com で **New repository**（名前例：`kaitori-saihan-app`、Public 推奨）を作成。
2. PowerShell で push：
   ```powershell
   cd "C:\Users\ViVi-n16\claude-work\不動産買取再販 計算・稟議・事業計画書アプリ"
   git remote add origin https://github.com/<ユーザー名>/kaitori-saihan-app.git
   git branch -M main
   git push -u origin main
   ```
3. GitHub の **Settings → Pages → Source = "GitHub Actions"** を選択。
4. **Actions** タブでビルドの完了を確認 → 公開URLが表示されます。

> ※ リポジトリ名を `<ユーザー名>.github.io` にすると **ルート配信**（`https://<ユーザー名>.github.io/`）になります。それ以外の名前は自動で `/<リポジトリ名>/` のサブパス配信になります（ワークフローが自動調整）。

## 各自のスマホで使う
1. 公開URLを開く。
2. ブラウザメニューから **「ホーム画面に追加」**（iPhone：共有→ホーム画面に追加 / Android：インストール）。
3. 以後アイコンから起動。オフラインでも計算・入力・PDFは動作。
4. 「マイ案件」→「サンプル読み込み」で4タイプの実例が入ります。

## 更新のしかた（コードを直したとき）
```powershell
cd "C:\Users\ViVi-n16\claude-work\不動産買取再販 計算・稟議・事業計画書アプリ"
git add -A
git commit -m "更新内容"
git push          # push するだけで Actions が再ビルド→自動再公開
```

## 事業計画書のAI生成（無料・手動）
事業計画書タブで：
1. **「AI用プロンプトをコピー」**（計算結果入りの指示文がコピーされます）
2. **「Claudeを開く」** → claude.ai に貼り付け（Ctrl+V）→ 生成
3. 出てきた文章をコピーして、アプリの本文欄に貼り戻す
→ お手持ちの Claude（ブラウザ版）を使うので **API課金は発生しません**。

## 注意
- データは端末内（IndexedDB）保存。端末を変えると引き継がれません（共有が必要になったら別途バックエンド対応が必要）。
- 公開URLは誰でも開けますが、**サーバーに案件データは存在しない**（各自の端末内のみ）ため、URLを知られても他人の案件は見えません。気になる場合はURLを社内限定で共有してください。
