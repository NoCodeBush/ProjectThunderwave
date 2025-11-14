import { useState } from 'react'
import { supabase } from '../supabase/config'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'
import { UserRole } from './useUsers'

export const useUserManagement = () => {
  const { tenant } = useTenant()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!tenant || !currentUser) {
      throw new Error('Tenant or user not available')
    }

    if (userId === currentUser.id) {
      throw new Error('Cannot modify your own role')
    }

    try {
      setLoading(true)
      setError(null)

      // Check if user_tenant relationship exists
      const { data: existing, error: checkError } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenant.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        // Update existing relationship
        const { error: updateError } = await supabase
          .from('user_tenants')
          .update({ role: newRole })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Create new relationship
        const { error: insertError } = await supabase
          .from('user_tenants')
          .insert({
            user_id: userId,
            tenant_id: tenant.id,
            role: newRole
          })

        if (insertError) throw insertError
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update user role'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeUserFromTenant = async (userId: string) => {
    if (!tenant || !currentUser) {
      throw new Error('Tenant or user not available')
    }

    if (userId === currentUser.id) {
      throw new Error('Cannot remove yourself from the tenant')
    }

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('user_tenants')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenant.id)

      if (deleteError) throw deleteError
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove user'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    updateUserRole,
    removeUserFromTenant,
    loading,
    error
  }
}

