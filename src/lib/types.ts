export interface User {
  id: string
  name: string
  username: string
  bio?: string
  avatarUrl?: string
  isPrivate?: boolean
}

export interface Post {
  id: string
  user: User
  text: string
  videoUrl?: string
  mediaUrls?: string[]
  practiceMinutes?: number
  genre?: string
  createdAt: string // ISO datetime
  likes: number
  isLiked: boolean
}
