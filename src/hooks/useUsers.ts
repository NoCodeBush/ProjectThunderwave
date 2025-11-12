import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // Try calling the function directly via RPC first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_user_profiles')

      if (!functionError && functionData) {
        const transformedUsers: User[] = functionData.map((row: any) => ({
          id: row.id,
          email: row.email,
          displayName: row.display_name || undefined,
          avatarUrl: row.avatar_url || undefined
        }))
        setUsers(transformedUsers)
        return
      }

      // Fallback: Try querying the view
      const { data: viewData, error: viewError } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, avatar_url')
        .order('email', { ascending: true })

      if (viewError) {
        console.warn('Could not load users:', viewError)
        console.warn('Function error:', functionError)
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

