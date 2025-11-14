import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { useTenant } from '../context/TenantContext'

export type UserRole = 'administrator' | 'engineer'

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  role?: UserRole
}

export const useUsers = () => {
  const { tenant } = useTenant()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tenant) {
      loadUsers()
    } else {
      setUsers([])
      setLoading(false)
    }
  }, [tenant])

  const loadUsers = async () => {
    if (!tenant) {
      setUsers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Use the tenant-specific function that respects RBAC
      const { data, error } = await supabase
        .rpc('get_tenant_users', { p_tenant_id: tenant.id })

      if (error) {
        console.warn('Could not load tenant users:', error)
        // Fallback to old method if new function doesn't exist yet
        const { data: viewData, error: viewError } = await supabase
          .from('user_profiles')
          .select('id, email, display_name, avatar_url')
          .order('email', { ascending: true })

        if (viewError) {
          console.warn('Fallback also failed:', viewError)
          setUsers([])
          return
        }

        const transformedUsers: User[] = (viewData || []).map((row: any) => ({
          id: row.id,
          email: row.email,
          displayName: row.display_name || undefined,
          avatarUrl: row.avatar_url || undefined
        }))
        setUsers(transformedUsers)
        return
      }

      const transformedUsers: User[] = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        role: row.role as UserRole
      }))

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  return {
    users,
    loading,
    refreshUsers: loadUsers
  }
}

