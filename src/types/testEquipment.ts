export interface TestEquipment {
  id: string
  name: string
  serialNumber: string
  dateTest: string // ISO date string
  expiry: string // ISO date string (dateTest + 1 year)
  userId: string | null // The user this equipment is assigned to (optional)
  assignedUserName?: string // Display name or email of assigned user
}

