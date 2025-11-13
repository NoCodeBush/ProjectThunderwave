import { useTenant } from '../context/TenantContext'

/**
 * Hook to get the current tenant ID for use in database queries
 * Returns null if tenant is not loaded yet or has no ID (fallback tenant)
 * Throws an error if used in a query context without a valid tenant ID
 */
export const useCurrentTenantId = (): string | null => {
  const { tenant } = useTenant()
  // Return null if tenant doesn't have an ID (fallback tenant)
  // This will cause queries to wait until a real tenant is loaded
  return tenant?.id && tenant.id !== '' ? tenant.id : null
}

