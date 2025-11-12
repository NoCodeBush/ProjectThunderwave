export interface TestEquipment {
  id: string
  name: string
  serialNumber: string
  dateTest: string // ISO date string
  expiry: string // ISO date string (dateTest + 1 year)
}

