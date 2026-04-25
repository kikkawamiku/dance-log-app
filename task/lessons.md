# Lessons Learned — dance-log-app

## アーキテクチャ

### Supabase クライアントは `useRef` で安定させる
コンポーネントやカスタムフック内で `createClient()` を直接呼ぶと、レンダリングごとに新しいインスタンスが生成される。
`const supabase = useRef(createClient()).current` にすることで、再レンダリング時の再生成を防ぎ、
SWR のキャッシュキーとの整合性も保てる。

### SWR キャッシュキーにはバージョン番号を含める
フォローの変更後にフィードを自動再取得させるために `["feed", userId, followVersion]` の形式を使用。
`followVersion` をインクリメントするだけで全ページのキャッシュが無効化される。
特定の副作用（フォロー/アンフォロー）とデータ再取得を明示的に結びつけられるのが利点。

### `useSWRInfinite` のキー設計
`getKey(pageIndex, previousPageData)` 関数で：
- `previousPageData` が空配列なら `null` を返してフェッチを止める
- カーソル（`created_at`）を前ページの最後の要素から取る
- ページ 0 はカーソルなしで最新から取得

カーソルベースのページネーションと `useSWRInfinite` の相性は良い。
オフセットベース（`.range()`）は削除後のズレが起きるため不採用。

---

## Next.js 16 の注意点

### App Router の動的ルートで `params` は Promise
`/app/profile/[id]/page.tsx` のようなクライアントコンポーネントでは、
`params` が `Promise<{ id: string }>` 型になっている（Next.js 16 の破壊的変更）。
`const { id } = use(params)` で解決する。`params.id` への直接アクセスは型エラーになる。

### `loading.tsx` はルートレベルの Suspense フォールバック
`/app/profile/[id]/loading.tsx` を置くだけでそのルートへの遷移中にスケルトンが表示される。
コンポーネント内の `useState(true)` とは独立して機能するため、
「ページ自体の読み込み中」と「データの読み込み中」を分離して扱える。

---

## パフォーマンス

### Phase 1 / Phase 2 の分割ロード（UserContext）
1. JWT のローカルデコード（ネットワーク不要）でユーザー情報を即時セットし `loading = false`
2. バックグラウンドで DB からプロフィールを取得して上書き

これにより認証済みユーザーはローディング画面をほぼ見ない。
Phase 2 でタイムアウト（8秒）した場合は Phase 1 の情報で動作継続。

### `SELECT *` を使わない
`select("*")` は不要なカラムを全て転送する。
`PROFILE_SELECT` / `POST_SELECT` のように定数で明示することで転送量を削減し、
型安全性も高まる（余分なカラムが型に混入しない）。

### スケルトンで体感速度を上げる
スピナー（円形ローディング）は「待っている感」を与えるが、
スケルトン（コンテンツの形に合わせた灰色ブロック）はレイアウトシフトを抑え「すぐ見える感」を与える。
特に `ProfileHeaderSkeleton` のように実際のレイアウトと寸法を合わせることが重要。

---

## Supabase 固有

### RLS でテーブルが存在しても操作が失敗する
テーブルがあっても RLS ポリシーが設定されていないと、認証済みユーザーでも操作が通らない。
`likes` テーブルのように後から追加するテーブルは、CREATE TABLE と同時に RLS ポリシーも設定する。

### `PGRST116` はプロフィール未作成の正常ケース
OAuth や初回ログイン時、`profiles` テーブルにレコードがない状態で `.single()` を呼ぶと
`PGRST116`（zero rows）エラーが返る。これはエラーではなくプロフィール自動作成のトリガーとして扱う。

### JOIN の書き方
```ts
// posts に紐づく likes を取得
supabase.from("posts").select("*, likes!post_id(user_id)")
```
外部キー名（`!post_id`）を明示しないと、テーブルに外部キーが複数ある場合にあいまいさエラーになる。

---

## React パターン

### 楽観的 UI の実装パターン
```ts
const prev = isLiked        // 現在の状態を退避
setIsLiked(!prev)           // 即時反映
try {
  await persistLike(...)    // DB 書き込み
} catch {
  setIsLiked(prev)          // 失敗時にロールバック
}
```
ネットワークエラー時のロールバックを必ず実装する。
エラー通知（トースト等）は UX 向上のため将来追加したい。

### セッション投稿と DB 投稿の重複排除
新規投稿直後は `newPosts`（セッション内配列）に即時追加し表示する。
SWR キャッシュが更新されると同じ投稿が重複して表示されるため：

```ts
const sessionIds = new Set(newPosts.map(p => p.id))
const allPosts = [...newPosts, ...dbPosts.filter(p => !sessionIds.has(p.id))]
```

このパターンを Feed / Profile / Report の3箇所で統一して使用。

### ハイドレーションミスマッチを防ぐ
`Math.random()` をレンダリング時に呼ぶとサーバーとクライアントで値が異なりハイドレーションエラーになる。
スケルトンのランダムな高さは事前に配列として定義する：

```ts
const BAR_HEIGHTS = [60, 40, 80, 30, 70, 50, 90, 45, 65, 35, 75, 55, 85, 25]
```

---

## 型安全性

### Supabase の型推論の限界
`supabase.from("posts").select("*, likes!post_id(user_id)")` の戻り値型は
自動生成型では正確に推論されない場合がある。
`as PostRow[]` のキャストが必要な箇所はコメントで理由を残しておく。

### イベント型の明示（Supabase Auth）
`onAuthStateChange` のコールバックは `_event` の型を明示しないと `implicit any` エラーになる：

```ts
import { AuthChangeEvent, Session } from "@supabase/supabase-js"

supabase.auth.onAuthStateChange(
  (_event: AuthChangeEvent, newSession: Session | null) => { ... }
)
```

Vercel のビルドは `tsc --noEmit` を実行するため、ローカルで型エラーを確認してからプッシュする。
