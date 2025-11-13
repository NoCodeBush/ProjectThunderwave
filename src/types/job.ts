export interface Job {
  id: string
  name: string
  client: string
  date: string // ISO date string
  location: string
  tags: string[]
  details: string
  site_contact?: string
  site_phone_number?: string
  assignedUsers?: Array<{
    id: string
    email: string
    displayName?: string
  }>
}

