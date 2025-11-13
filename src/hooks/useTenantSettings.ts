import { useEffect } from 'react'
import { useTenant } from '../context/TenantContext'

/**
 * Hook to apply tenant-specific styling (colors, logo) to the app
 * This injects CSS variables based on the tenant's primary color
 */
export const useTenantSettings = () => {
  const { tenant, loading } = useTenant()

  useEffect(() => {
    if (!tenant || loading) return

    // Generate color shades from primary color
    const primaryColor = tenant.primary_color
    
    // Convert hex to RGB for CSS variables
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : null
    }

    const rgb = hexToRgb(primaryColor)
    if (!rgb) return

    // Calculate lighter and darker shades
    const lighten = (r: number, g: number, b: number, amount: number) => {
      return {
        r: Math.min(255, r + (255 - r) * amount),
        g: Math.min(255, g + (255 - g) * amount),
        b: Math.min(255, b + (255 - b) * amount)
      }
    }

    const darken = (r: number, g: number, b: number, amount: number) => {
      return {
        r: Math.max(0, r * (1 - amount)),
        g: Math.max(0, g * (1 - amount)),
        b: Math.max(0, b * (1 - amount))
      }
    }

    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
    }

    // Generate color palette
    const light50 = lighten(rgb.r, rgb.g, rgb.b, 0.95)
    const light100 = lighten(rgb.r, rgb.g, rgb.b, 0.9)
    const light200 = lighten(rgb.r, rgb.g, rgb.b, 0.75)
    const light300 = lighten(rgb.r, rgb.g, rgb.b, 0.5)
    const light400 = lighten(rgb.r, rgb.g, rgb.b, 0.25)
    const dark600 = darken(rgb.r, rgb.g, rgb.b, 0.2)
    const dark700 = darken(rgb.r, rgb.g, rgb.b, 0.4)
    const dark800 = darken(rgb.r, rgb.g, rgb.b, 0.6)
    const dark900 = darken(rgb.r, rgb.g, rgb.b, 0.8)
    
    const primary50 = rgbToHex(light50.r, light50.g, light50.b)
    const primary100 = rgbToHex(light100.r, light100.g, light100.b)
    const primary200 = rgbToHex(light200.r, light200.g, light200.b)
    const primary300 = rgbToHex(light300.r, light300.g, light300.b)
    const primary400 = rgbToHex(light400.r, light400.g, light400.b)
    const primary500 = primaryColor
    const primary600 = rgbToHex(dark600.r, dark600.g, dark600.b)
    const primary700 = rgbToHex(dark700.r, dark700.g, dark700.b)
    const primary800 = rgbToHex(dark800.r, dark800.g, dark800.b)
    const primary900 = rgbToHex(dark900.r, dark900.g, dark900.b)

    // Apply CSS variables to root
    const root = document.documentElement
    root.style.setProperty('--color-primary-50', primary50)
    root.style.setProperty('--color-primary-100', primary100)
    root.style.setProperty('--color-primary-200', primary200)
    root.style.setProperty('--color-primary-300', primary300)
    root.style.setProperty('--color-primary-400', primary400)
    root.style.setProperty('--color-primary-500', primary500)
    root.style.setProperty('--color-primary-600', primary600)
    root.style.setProperty('--color-primary-700', primary700)
    root.style.setProperty('--color-primary-800', primary800)
    root.style.setProperty('--color-primary-900', primary900)

    // Update logo if available
    if (tenant.logo_url) {
      // Store logo URL for use in components
      root.style.setProperty('--tenant-logo-url', `url(${tenant.logo_url})`)
    } else {
      root.style.removeProperty('--tenant-logo-url')
    }

    // Cleanup function
    return () => {
      // Optionally reset to defaults on unmount
      // For now, we'll leave the styles as they are
    }
  }, [tenant, loading])
}

