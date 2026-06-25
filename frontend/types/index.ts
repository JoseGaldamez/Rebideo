export interface Video {
  id: string
  title: string
  description?: string
  status: 'pending' | 'processing' | 'active' | 'failed' | 'expired'
  created_at: any // Can be Firestore Timestamp (e.g. { toDate: () => Date }) or ISO string
  visibility: 'public' | 'private'
  video_url?: string
  playlist_url?: string
  duration?: number
  views?: number
  user_id?: string
}
