# 社内稟議の回付（クラウド）セットアップ手順

このアプリに「担当 → 上長 → 社長」へ稟議を**実際に回付**する機能を追加するための準備手順です。
全員が同じデータを見られるよう、無料のクラウド（**Supabase**）を使います。

所要時間：約10〜15分。難しいコマンドはなく、**コピペ中心**です。

---

## ステップ1：Supabaseプロジェクトを作る（無料）

1. https://supabase.com にアクセスし、**Start your project** → GitHubまたはメールで**サインアップ**（無料）。
2. **New project** をクリック。
   - **Name**：例 `kaitori-saihan`
   - **Database Password**：強いパスワードを入力（**メモして保管**。あとで使う場面があります）
   - **Region**：`Northeast Asia (Tokyo)` を選択（日本向けで高速）
3. 作成完了まで1〜2分待ちます。

## ステップ2：接続情報（2つ）を控える

左メニュー **Project Settings（歯車）→ API** を開き、次の2つをコピーしてください。

- **Project URL**：`https://xxxxxxxx.supabase.co`
- **anon public** キー：`eyJhbGciOi...`（長い文字列）

> この2つは私（開発側）に教えてください。アプリに設定します。
> ※ `anon` キーは公開しても安全な鍵です。**`service_role` キーは絶対に共有・貼り付けしないでください。**

## ステップ3：データベースの土台を作る（SQLをコピペ実行）

左メニュー **SQL Editor → New query** を開き、下の枠の中身を**まるごと貼り付けて Run**してください。
（テーブル・権限制御・自動処理を一括で作成します）

```sql
-- ============================================================
-- 不動産買取再販アプリ：クラウド回付用スキーマ
-- ============================================================

-- 1) 利用者プロフィール（ログインユーザーと1:1。役割を持つ）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('staff','manager','president','admin')),
  company_id text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- 新規登録時にプロフィールを自動作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- プロフィールの閲覧/更新ポリシー（回付先選択のため全員が同僚を閲覧可、更新は本人のみ）
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());

-- 2) 会社マスタ
create table if not exists public.companies (
  id text primary key,
  name text not null,
  address text, representative text, role text, logo_data_url text
);
alter table public.companies enable row level security;
drop policy if exists "companies_read" on public.companies;
create policy "companies_read" on public.companies for select to authenticated using (true);
drop policy if exists "companies_write" on public.companies;
create policy "companies_write" on public.companies for all to authenticated using (true) with check (true);

-- 3) 案件（計算書・稟議・事業計画などリッチな内容は data(jsonb) に格納）
create table if not exists public.projects (
  id text primary key,
  company_id text,
  owner_id uuid references auth.users(id),
  name text not null default '',
  is_sample boolean not null default false,
  property_type text,
  data jsonb not null default '{}'::jsonb,
  approval_status text not null default 'draft'
    check (approval_status in ('draft','pending_manager','pending_president','approved','rejected')),
  current_assignee uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- 閲覧：社内共有（認証済みは全件閲覧可）
drop policy if exists "projects_read" on public.projects;
create policy "projects_read" on public.projects for select to authenticated using (true);
-- 追加：自分が所有者として作成
drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects for insert to authenticated with check (owner_id = auth.uid());
-- 更新：所有者 / 現在の回付先（承認者）/ 管理者
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update to authenticated using (
  owner_id = auth.uid()
  or current_assignee = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- 削除：所有者 / 管理者
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete to authenticated using (
  owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- updated_at 自動更新
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- 4) 回付履歴（誰がいつ承認/差戻ししたか）
create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  step int not null,
  role text,
  assignee_id uuid references auth.users(id),
  assignee_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  comment text,
  created_at timestamptz not null default now(),
  acted_at timestamptz
);
alter table public.approval_steps enable row level security;
drop policy if exists "steps_read" on public.approval_steps;
create policy "steps_read" on public.approval_steps for select to authenticated using (true);
drop policy if exists "steps_write" on public.approval_steps;
create policy "steps_write" on public.approval_steps for all to authenticated using (true) with check (true);
```

実行して「Success. No rows returned」と出れば完了です。

## ステップ4：Googleログインを設定（@vivi-f.jp 限定）

「Google Cloud側」と「Supabase側」の2か所を設定します。

### 4-1. Google Cloud で OAuthクライアントを作成
1. https://console.cloud.google.com に **@vivi-f.jp の管理者アカウント**でログイン。
2. 上部のプロジェクト選択 → **新しいプロジェクト**（例 `kaitori-saihan`）を作成。
3. 左メニュー **APIとサービス → OAuth同意画面**：
   - User Type は **内部（Internal）** を選択 ← これで自動的に **@vivi-f.jp の社員だけ**が対象になります。
   - アプリ名（例：買取再販 稟議）・サポートメールを入力して保存。
4. **APIとサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID**：
   - 種類：**ウェブアプリケーション**
   - **承認済みのリダイレクト URI** に次を追加（ステップ2のProject URLを使用）：
     `https://xxxxxxxx.supabase.co/auth/v1/callback`
     （`xxxxxxxx` はあなたのProject URLのサブドメイン）
   - 作成後に表示される **クライアントID** と **クライアントシークレット** を控える。

### 4-2. Supabase にGoogleを登録
1. Supabase 左メニュー **Authentication → Providers → Google** を開く。
2. **Enable Sign in with Google** をオン。
3. **クライアントID** と **クライアントシークレット** を貼り付けて保存。
4. **Authentication → URL Configuration**：
   - **Site URL** に `https://tmy70.github.io/kaitori-saihan-app/`
   - **Redirect URLs** にも同じURLを追加。

> ドメイン限定：OAuth同意画面を「内部」にしているため @vivi-f.jp 以外はログインできません。
> アプリ側でも念のため @vivi-f.jp 以外を弾く処理を入れます。

## ステップ5：役割（上長・社長）の割り当て

アカウントは各自が初回「**Googleでログイン**」した時点で自動作成されます（事前登録は不要）。
誰が上長/社長かは、アプリ内の管理画面（実装予定）、または Supabase の **Table Editor → profiles** で
`role` を `manager`（上長）/ `president`（社長）/ `admin`（管理者）に変更して設定します。
（既定は `staff`＝担当）

## ステップ6：通知メール（Gmail送信）の準備 ※メール実装フェーズで使用

回付・承認・差戻しの通知メールは、**担当者個人のGmail（SMTP）**から送信します。事前に：
1. 送信に使うGoogleアカウントで **2段階認証をオン**。
2. Googleアカウント → **セキュリティ → アプリパスワード** で16桁のパスワードを1つ発行。
3. その「メールアドレス」と「アプリパスワード」を、後日Supabaseの設定欄（Edge Functionの秘密情報）に登録します。
   - ※ アプリパスワードは私には送らず、**Supabaseの管理画面に直接登録**いただきます（手順を案内します）。

---

## このあとの流れ（開発側で実装します）

1. **Googleログイン**（@vivi-f.jp 限定）＋ 未ログイン時のガード
2. **クラウド共有データ**へ移行（案件・会社）＋ 既存のローカル案件をクラウドへ**移行ボタン**
3. **回付ワークフロー**：申請 → 上長承認 → 社長承認、回付先の指名、承認/差戻し＋コメント、
   「自分宛の未処理一覧」
4. **メール通知**（回付・承認・差戻し時）を **Gmail送信**で実装

> **ステップ2の「Project URL」と「anon public キー」を教えていただければ、1（ログイン）から順に実装・公開します。**
> Google Cloud の OAuth 設定（ステップ4）でつまずいたら、その画面の状況を教えてください。個別にご案内します。
