/**
 * Utility functions for domain-based tenant detection
 */

/**
 * Get the current domain from window.location
 * Returns the hostname (e.g., "example.com" or "localhost")
 */
export const getCurrentDomain = (): string => {
  if (typeof window === 'undefined') {
    return 'localhost'
  }
  return window.location.hostname
}

/**
 * Get the domain without port number
 * Useful for matching tenant domains
 */
export const getDomainWithoutPort = (): string => {
  const hostname = getCurrentDomain()
  // Remove port if present (e.g., "localhost:3000" -> "localhost")
  return hostname.split(':')[0]
}

/**
 * Normalize domain for tenant lookup
 * Handles localhost, subdomains, etc.
 */
export const normalizeDomain = (domain: string): string => {
  // For localhost, return as-is
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return 'localhost'
  }
  
  // Remove www. prefix if present
  const withoutWww = domain.replace(/^www\./, '')
  
  // Return the base domain (you might want to extract just the root domain)
  // For now, we'll use the full domain as-is
  return withoutWww.toLowerCase()
}


