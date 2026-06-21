# 不動産買取再販アプリ UI — 利用規約（デザインエージェント向け）

不動産・金融向けの落ち着いた配色のモバイルファーストUIキット。Tailwind ユーティリティクラス＋CSS変数テーマで構成。全コンポーネントは `window.KaitoriUI.*`（このバンドル）からインポートして使う。

## セットアップ・テーマ
- **プロバイダ不要。** ラッパーは要らない。`styles.css`（＋その `@import` 先）を読み込めば配色・フォント・コンポーネントCSSが効く。
- **ダーク/ライト切替は `dark` クラス。** 祖先要素に `class="dark"` を付けると `.dark { --bg … }` のテーマ変数群に切り替わる（付けなければライト）。色は常にセマンティック・ユーティリティ（下記）で指定すること。生の `#fff` や `text-gray-500` を使うとテーマ追従しない。
- **フォント** は Noto Sans JP（`font-sans` 既定）。バンドルに同梱。

## スタイリングのイディオム（このDSの語彙で書くこと）
2系統：①レイアウト/配色は **Tailwind ユーティリティ**、②見た目の主要バリアントは **props**。

**セマンティック配色ユーティリティ（テーマ変数。これを最優先で使う）**

| 用途 | クラス |
|---|---|
| 背景（ページ） | `bg-bg` |
| 面（カード等） | `bg-surface` / `bg-surface-2` |
| 罫線 | `border-border` |
| 本文 | `text-fg` |
| 補助テキスト | `text-muted` |
| ブランド（藍） | `bg-brand-500` `hover:bg-brand-600` `text-brand-600` |
| アクセント（金） | `bg-accent-500` `text-brand-900` |
| 状態色 | `text-emerald-600`（良）`text-amber-600`（注意）`text-red-600`（危険） |
| 角丸 | `rounded-xl` / `rounded-2xl` ｜ 影 `shadow-card` |

対応するCSS変数：`--bg --surface --surface-2 --border --fg --muted`（`rgb(var(--…))`）。ブランド/アクセントは固定パレット `brand-{50,100,500,600,700,800,900}` `accent-{400,500,600}`。

**props で見た目が決まるもの（CSSクラスで上書きしない）**
- `Button` … `variant`: `primary` | `secondary` | `ghost` | `danger` | `accent`
- `Badge` … `tone`: `good` | `warn` | `bad` | `neutral` | `brand`
- 入力系は制御コンポーネント：`Select`/`Toggle` は `value`/`checked` ＋ `onChange`、`NumberInput` は `value` ＋ `onChangeNumber`（`suffix` で「万円」「%」「日」等）、`Tabs` は `tabs`/`active`/`onChange`、`Modal` は `open`/`onClose`/`title`/`footer`。
- レイアウト系（`Card` `TextInput` `TextArea` `Select`）は `className` を受け取り、上の表のユーティリティで余白・幅を足せる。

## 真実のありか（実装前に読む）
- 配色・トークン・コンポーネントCSS：`styles.css` とその `@import`（`tokens/…`、`_ds_bundle.css`）。
- 各コンポーネントのAPI：`components/general/<Name>/<Name>.d.ts`、用法：同 `.prompt.md`。

## 標準的な組み立て例
```tsx
import { Card, CardHeader, Field, NumberInput, Button, Badge } from 'kaitori-saihan-app';

<Card className="max-w-sm">
  <CardHeader title="計算書" desc="費目を入力すると自動計算"
    action={<Badge tone="good">基準クリア</Badge>} />
  <div className="space-y-3 p-4">
    <Field label="販売価格">
      <NumberInput value={1680} onChangeNumber={() => {}} />
    </Field>
    <Button variant="primary" className="w-full">保存する</Button>
  </div>
</Card>
```
