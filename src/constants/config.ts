// Application configuration constants
export const CONFIG = {
  // Banner/Notification settings
  BANNER_DURATION: 5000, // milliseconds
  DELETE_CONFIRM_TIMEOUT: 3000, // milliseconds
  
  // Equipment expiry settings
  EQUIPMENT_EXPIRY_YEARS: 1,
  EQUIPMENT_EXPIRY_WARNING_DAYS: 30,
  
  // Date formatting
  DATE_LOCALE: 'en-US',
  DATE_FORMAT_OPTIONS: {
    month: 'short' as const,
    day: 'numeric' as const,
    year: 'numeric' as const,
  },
  
  // Pagination/Display limits
  MAX_VISIBLE_USERS: 50,
  SEARCH_DEBOUNCE_MS: 300,
  
  // Storage keys (for localStorage if needed)
  STORAGE_KEYS: {
    TEST_EQUIPMENT: 'thunderbolt-test-equipment',
    JOBS: 'thunderbolt-jobs',
  },
  
  // OAuth redirect URLs
  OAUTH_REDIRECT_BASE: typeof window !== 'undefined' ? window.location.origin : '',
} as const

