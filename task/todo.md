# TODO — dance-log-app

## 🔴 必須（動作に影響）

### 1. Supabase `likes` テーブルの作成
いいね機能のコードは完成しているが、テーブルが存在しない場合はサイレントに失敗する。
Supabase ダッシュボードの SQL Editor で以下を実行すること：

```sql
create table if not exists public.likes (
  post_id uuid  not null references public.posts(id) on delete cascade,
  user_id uuid  not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "Anyone can read likes"
  on public.likes for select using (true);

create policy "Users can like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete
  using (auth.uid() = user_id);
```

確認方法：投稿のハートボタンを押してページリロード後もいいね数が残るか。

---

### 2. 投稿作成後の SWR キャッシュ無効化
新しい投稿を作成した後、`newPosts`（セッション）には即時反映されるが、
SWR キャッシュは stale のまま。タブを切り替えて戻ると重複または順序がずれる可能性がある。

**対処案：** `createPost` 成功後に `mutate(["feed", userId, followVersion])` を呼ぶ。
対象ファイル：`src/components/PostComposer.tsx`（または投稿作成を呼んでいる箇所）

---

### 3. `follows` テーブルの存在確認
このセッションで作成されたと仮定しているが、明示的に確認していない。
Supabase ダッシュボードで `follows` テーブルと RLS ポリシーが存在するか確認。

---

## 🟡 品質改善

### 4. 投稿数の不正確表示
`ProfilePage` と `/profile/[id]` の「投稿」数は、SWR でロード済みのページ分しか反映されない。
ページネーション前の全件数ではないため、実際より少なく表示される。

**対処案：** `profiles` テーブルに `post_count` カラムを追加して DB トリガーで更新する、
または別途 `count()` クエリを発行する。

---

### 5. `mockData.ts` の削除
`src/lib/mockData.ts` はどこからも import されていないが残っている。
安全に削除できる。

```bash
rm src/lib/mockData.ts
```

---

### 6. `validation.ts` のモックユーザー名削除
`src/lib/validation.ts` の `TAKEN_USERNAMES` Set にハードコードされたモック名が残っている。
プロフィール編集時のユーザー名バリデーションを、DB の一意制約エラー（code `23505`）で判定する方式に変更する。

---

## 🟢 確認・計測

### 7. SWR によるタブ切り替え速度の確認
本番環境（Vercel）で以下を手動確認：
- フィードタブ → プロフィールタブ → フィードタブ の切り替えが即時（ネットワークなし）か
- 開発者ツールの Network タブで二重フェッチが起きていないか

### 8. 初期ロード時間の計測
Vercel 本番でのページ初回ロードと、Supabase クエリの所要時間を確認。
（UserContext の `console.info("[UserContext] profiles query Xms")` ログを活用）

---

## 📋 完了済み（参考）

- [x] プロフィールページの動的化（`/profile/[id]`）
- [x] 投稿の編集・削除メニュー
- [x] いいね UI のコード実装（永続化コードは完成、テーブル作成待ち）
- [x] レポートの DB 永続化（`useAllUserPosts` SWR）
- [x] フォロー状態の DB 永続化（`useFollows` フック）
- [x] スケルトンローディング（`Skeleton.tsx`）
- [x] SELECT 最適化（`PROFILE_SELECT`、`POST_SELECT`）
- [x] SWR キャッシュ + ページネーション（`useFeed`、`useUserPostsInfinite`）
- [x] モックデータの削除
