import { CONFIG } from '../constants/config'

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(
    CONFIG.DATE_LOCALE,
    CONFIG.DATE_FORMAT_OPTIONS
  )
}

/**
 * Checks if a date is expired
 * @param expiryDate - ISO date string
 * @returns true if the date is in the past
 */
export const isExpired = (expiryDate: string): boolean => {
  return new Date(expiryDate) < new Date()
}

/**
 * Checks if a date is expiring soon (within the warning threshold)
 * @param expiryDate - ISO date string
 * @returns true if expiring within the warning period
 */
export const isExpiringSoon = (expiryDate: string): boolean => {
  const expiry = new Date(expiryDate)
  const today = new Date()
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  return (
    daysUntilExpiry <= CONFIG.EQUIPMENT_EXPIRY_WARNING_DAYS &&
    daysUntilExpiry > 0
  )
}

/**
 * Calculates expiry date from test date
 * @param dateTest - ISO date string
 * @returns Expiry date as ISO string (test date + configured years)
 */
export const calculateExpiryDate = (dateTest: string): string => {
  const testDate = new Date(dateTest)
  const expiryDate = new Date(testDate)
  expiryDate.setFullYear(
    expiryDate.getFullYear() + CONFIG.EQUIPMENT_EXPIRY_YEARS
  )
  return expiryDate.toISOString().split('T')[0]
}

