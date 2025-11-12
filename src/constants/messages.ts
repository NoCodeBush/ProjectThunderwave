// User-facing messages
export const MESSAGES = {
  // Success messages
  JOB_ADDED: 'Job added successfully!',
  JOB_UPDATE_FAILED: 'Failed to update job. Please try again.',
  JOB_DELETE_FAILED: 'Failed to delete job. Please try again.',
  EQUIPMENT_ADDED: 'Test equipment added successfully!',
  EQUIPMENT_ADD_FAILED: 'Failed to add test equipment. Please try again.',
  EQUIPMENT_DELETE_FAILED: 'Failed to delete test equipment. Please try again.',
  
  // Error messages
  AUTH_REQUIRED: 'User not authenticated',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  SIGN_IN_GOOGLE_FAILED: 'Failed to sign in with Google',
  SIGN_IN_APPLE_FAILED: 'Failed to sign in with Apple',
  
  // Loading states
  LOADING_JOBS: 'Loading jobs...',
  LOADING_USERS: 'Loading users...',
  SIGNING_OUT: 'Signing out...',
  
  // Empty states
  NO_JOBS: 'No jobs yet',
  NO_JOBS_DESCRIPTION: 'Your job list is empty. Jobs will appear here once you add them.',
  NO_JOBS_SEARCH: 'No jobs found matching your search.',
  NO_EQUIPMENT: 'No test equipment added yet.',
  NO_USERS: 'No other users found',
  NO_USERS_ONLY_YOU: 'No other users found (only you are registered).',
  NO_USERS_MIGRATION: 'No users found. Make sure the user_profiles migration has been run.',
  
  // Form labels and hints
  TAGS_HINT: 'Separate multiple tags with commas',
  ASSIGN_USERS_HINT: 'Select one or more users to assign this job to',
  EXPIRY_HINT: 'Expiry will be automatically set to 1 year from test date',
  
  // Actions
  SIGN_OUT: 'Sign Out',
  ADD_JOB: 'Add Job',
  ADD_EQUIPMENT: 'Add Equipment',
  CONTINUE_GOOGLE: 'Continue with Google',
  CONTINUE_APPLE: 'Continue with Apple',
  SIGN_IN_TO_CONTINUE: 'Sign in to continue',
  
  // Job card
  TAP_FOR_DETAILS: 'Tap for details',
  TAP_TO_COLLAPSE: 'Tap to collapse',
  ASSIGNED_TO: 'Assigned to:',
} as const

