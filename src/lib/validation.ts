// Usernames that already exist in the system (mock registry)
const TAKEN_USERNAMES = new Set([
  "sakura_moves",
  "ren_freestyle",
  "hina_hiphop",
  "sora_ballet",
])

export function validateUsername(username: string, currentUsername: string): string | null {
  if (!username.trim()) return "アカウント名を入力してください"
  if (username.length < 3) return "3文字以上で入力してください"
  if (username.length > 20) return "20文字以内で入力してください"
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "英数字とアンダースコア(_)のみ使用できます"
  if (username !== currentUsername && TAKEN_USERNAMES.has(username)) {
    return "このアカウント名はすでに使用されています"
  }
  return null
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "名前を入力してください"
  if (name.length > 30) return "30文字以内で入力してください"
  return null
}

export function validateAvatarUrl(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return "httpまたはhttpsのURLを入力してください"
    return null
  } catch {
    return "有効なURLを入力してください"
  }
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3
  label: "未入力" | "弱い" | "普通" | "強い"
  color: string
  missing: string[]
}

export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "未入力", color: "bg-gray-200", missing: [] }

  const rules = [
    { test: password.length >= 8, hint: "8文字以上" },
    { test: /[A-Z]/.test(password), hint: "大文字(A-Z)を含む" },
    { test: /[a-z]/.test(password), hint: "小文字(a-z)を含む" },
    { test: /[0-9]/.test(password), hint: "数字(0-9)を含む" },
    { test: /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(password), hint: "記号(!@#$等)を含む" },
  ]

  const missing = rules.filter((r) => !r.test).map((r) => r.hint)
  const passed = rules.length - missing.length

  let score: 0 | 1 | 2 | 3
  let label: PasswordStrength["label"]
  let color: string

  if (passed <= 2) {
    score = 1; label = "弱い"; color = "bg-red-400"
  } else if (passed <= 4) {
    score = 2; label = "普通"; color = "bg-amber-400"
  } else {
    score = 3; label = "強い"; color = "bg-emerald-500"
  }

  return { score, label, color, missing }
}
