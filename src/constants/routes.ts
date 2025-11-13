// Application routes
export const ROUTES = {
  SIGN_IN: '/signin',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  JOB_DETAILS: '/job/:jobId',
  ASSET_MANAGEMENT: '/job/:jobId/assets',
  IMAGE_SCAN: '/job/:jobId/images',
  ROOT: '/',
} as const

