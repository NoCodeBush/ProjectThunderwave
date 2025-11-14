import { useEffect } from 'react'
import { supabase } from '../supabase/config'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'

/**
 * Hook to ensure the current user is assigned to the current tenant
 * This runs automatically when the user is authenticated and tenant is loaded
 */
export const useEnsureTenantMembership = () => {
  const { currentUser } = useAuth()
  const { tenant } = useTenant()

  useEffect(() => {
    const ensureMembership = async () => {
      if (!currentUser || !tenant || !tenant.id) {
        return
      }

      try {
        // Check if user is already assigned to this tenant
        const { data: existing, error: checkError } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('tenant_id', tenant.id)
          .single()

        // If relationship doesn't exist, create it with default 'engineer' role
        if (checkError && checkError.code === 'PGRST116') {
          const { error: assignError } = await supabase
            .rpc('assign_user_to_tenant', {
              p_user_id: currentUser.id,
              p_tenant_id: tenant.id,
              p_role: 'engineer'
            })

          if (assignError) {
            // If RPC doesn't exist yet, use direct insert
            const { error: insertError } = await supabase
              .from('user_tenants')
              .insert({
                user_id: currentUser.id,
                tenant_id: tenant.id,
                role: 'engineer'
              })

            if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
              console.warn('Could not assign user to tenant:', insertError)
            }
          }
        }
      } catch (error) {
        // Silently fail - this is a best-effort operation
        console.warn('Error ensuring tenant membership:', error)
      }
    }

    ensureMembership()
  }, [currentUser, tenant])
}

