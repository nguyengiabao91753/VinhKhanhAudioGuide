export type Tour = {
  id: string
  name: string
  poiIds: string[]
  description?: string
  durationMinutes?: number
  createdAt?: string
  coverImage?: string | null
}
