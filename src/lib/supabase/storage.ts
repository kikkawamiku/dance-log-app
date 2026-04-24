import { SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "post-images"
const MAX_SIZE_MB = 10

export class StorageError extends Error {}

/**
 * Upload a single image to the `post-images` bucket.
 * Files are stored at: {userId}/{timestamp}.{ext}
 *
 * @returns Public URL of the uploaded image
 */
export async function uploadPostImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new StorageError(`画像サイズは${MAX_SIZE_MB}MB以下にしてください`)
  }

  if (!file.type.startsWith("image/")) {
    throw new StorageError("画像ファイルのみアップロードできます")
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false })

  if (error) throw new StorageError(`アップロードに失敗しました: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete an image from Storage by its public URL.
 * Silently ignores errors (best-effort cleanup).
 */
export async function deletePostImage(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  try {
    const url = new URL(publicUrl)
    // path after /storage/v1/object/public/{bucket}/
    const marker = `/object/public/${BUCKET}/`
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return
    const filePath = url.pathname.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([filePath])
  } catch {
    // best-effort; do not throw
  }
}
