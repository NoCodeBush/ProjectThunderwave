import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/config'
import { getDomainWithoutPort, normalizeDomain } from '../utils/domain'

export interface Tenant {
  id: string
  domain: string
  primary_color: string
  logo_url: string | null
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
  updateTenant: (updates: Partial<Pick<Tenant, 'primary_color' | 'logo_url'>>) => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTenant = async () => {
      try {
        setLoading(true)
        setError(null)

        const domain = normalizeDomain(getDomainWithoutPort())
        
        // Query tenant by domain
        const { data, error: queryError } = await supabase
          .from('tenants')
          .select('*')
          .eq('domain', domain)
          .single()

        if (queryError) {
          // If tenant doesn't exist (PGRST116 = no rows returned)
          if (queryError.code === 'PGRST116') {
            // Create tenant using the normalized domain
            try {
              const { data: newTenant, error: insertError } = await supabase
                .from('tenants')
                .insert({
                  domain: domain,
                  primary_color: '#3b82f6',
                  logo_url: null
                })
                .select()
                .single()

              if (insertError) {
                // If insert fails (e.g., no permission), use fallback tenant
                console.warn('Could not create tenant, using fallback:', insertError.message)
                setTenant({
                  id: '',
                  domain: domain,
                  primary_color: '#3b82f6',
                  logo_url: null
                })
              } else {
                setTenant(newTenant as Tenant)
              }
            } catch (insertErr: any) {
              // Use fallback tenant if creation fails
              console.warn('Could not create tenant, using fallback:', insertErr.message)
              setTenant({
                id: '',
                domain: domain,
                primary_color: '#3b82f6',
                logo_url: null
              })
            }
          } else {
            throw queryError
          }
        } else {
          setTenant(data as Tenant)
        }
      } catch (err: any) {
        console.error('Error loading tenant:', err)
        setError(err.message || 'Failed to load tenant')
        // Set a default tenant for fallback
        setTenant({
          id: '',
          domain: normalizeDomain(getDomainWithoutPort()),
          primary_color: '#3b82f6',
          logo_url: null
        })
      } finally {
        setLoading(false)
      }
    }

    loadTenant()
  }, [])

  const updateTenant = async (updates: Partial<Pick<Tenant, 'primary_color' | 'logo_url'>>) => {
    if (!tenant) throw new Error('No tenant loaded')

    try {
      const { data, error: updateError } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant.id)
        .select()
        .single()

      if (updateError) throw updateError

      setTenant(data as Tenant)
    } catch (err: any) {
      console.error('Error updating tenant:', err)
      throw err
    }
  }

  const value: TenantContextType = {
    tenant,
    loading,
    error,
    updateTenant
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

