import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'

export type UserRole = 'administrator' | 'engineer' | null

export const useUserRole = () => {
  const { currentUser } = useAuth()
  const { tenant } = useTenant()
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser || !tenant) {
      setRole(null)
      setLoading(false)
      return
    }

    loadUserRole()
  }, [currentUser, tenant])

  const loadUserRole = async () => {
    if (!currentUser || !tenant) {
      setRole(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('tenant_id', tenant.id)
        .maybeSingle()

      if (error) {
        // If user doesn't have a role yet, default to engineer
        console.warn('User role not found, defaulting to engineer:', error)
        setRole('engineer')
      } else {
        setRole(data?.role || 'engineer')
      }
    } catch (error) {
      console.error('Error loading user role:', error)
      setRole('engineer') // Default to engineer on error
    } finally {
      setLoading(false)
    }
  }

  const isAdministrator = role === 'administrator'
  const isEngineer = role === 'engineer'

  return {
    role,
    isAdministrator,
    isEngineer,
    loading,
    refreshRole: loadUserRole
  }
}

