import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { useAuth } from '../context/AuthContext'
import { useCurrentTenantId } from './useCurrentTenantId'
import { Job } from '../types/job'

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser } = useAuth()
  const tenantId = useCurrentTenantId()

  useEffect(() => {
    if (!currentUser || !tenantId) {
      console.log('🔍 useJobs: Missing user or tenant, skipping load')
      setJobs([])
      setLoading(false)
      return
    }

    loadJobs()

    // Subscribe to real-time changes
    const jobsChannel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${currentUser.id}&tenant_id=eq.${tenantId}`
        },
        () => {
          console.log('🔍 useJobs: Jobs changed, reloading')
          loadJobs()
        }
      )
      .subscribe()

    // Also subscribe to job assignment changes for jobs the user is assigned to
    const assignmentsChannel = supabase
      .channel('job-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
          filter: `user_id=eq.${currentUser.id}`
        },
        () => {
          console.log('🔍 useJobs: Assignments changed, reloading')
          loadJobs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(jobsChannel)
      supabase.removeChannel(assignmentsChannel)
    }
  }, [currentUser, tenantId])

  const loadJobs = async () => {
    try {
      setLoading(true)
      console.log('🔍 useJobs: Starting to load jobs for user:', currentUser?.id, 'tenant:', tenantId)

      // Get all jobs with assignments in one query
      // RLS policies will return all jobs in the tenant
      // We filter to show only jobs the user owns or is assigned to
      const { data: jobsWithAssignments, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_assignments (
            user_id
          )
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })

      if (error) {
        console.error('🔍 useJobs: Error loading jobs:', error)
        throw error
      }

      console.log('🔍 useJobs: Raw data received:', jobsWithAssignments?.length || 0, 'jobs')

      if (!jobsWithAssignments || jobsWithAssignments.length === 0) {
        console.log('🔍 useJobs: No jobs found')
        setJobs([])
        return
      }

      // Filter to only include jobs where:
      // 1. The user is the owner (user_id matches), OR
      // 2. The user is assigned to the job (exists in job_assignments)
      const userJobs = jobsWithAssignments.filter((row: any) => {
        const isOwner = row.user_id === currentUser?.id
        const isAssigned = (row.job_assignments || []).some((assignment: any) => 
          assignment.user_id === currentUser?.id
        )
        return isOwner || isAssigned
      })

      console.log('🔍 useJobs: After filtering:', userJobs.length, 'jobs (out of', jobsWithAssignments.length, 'total)')

      // Transform to Job format with assignedUsers
      const transformedJobs: Job[] = userJobs.map((row: any) => {
        const assignments = (row.job_assignments || []).map((assignment: any) => ({
          id: assignment.user_id,
          email: '', // Will be populated below
          displayName: undefined
        }))

        return {
          id: row.id,
          name: row.name,
          client: row.client,
          date: row.date,
          location: row.location,
          tags: row.tags || [],
          details: row.details,
          site_contact: row.site_contact,
          site_phone_number: row.site_phone_number,
          assignedUsers: assignments.length > 0 ? assignments : undefined
        }
      })

      console.log('🔍 useJobs: After transformation:', transformedJobs.length, 'jobs')

      // Load user profiles for assigned users
      const userIds: string[] = []
      transformedJobs.forEach(job => {
        job.assignedUsers?.forEach(user => {
          if (!userIds.includes(user.id)) {
            userIds.push(user.id)
          }
        })
      })

      console.log('🔍 useJobs: Loading profiles for users:', userIds)

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email, display_name')
          .in('id', userIds)

        if (profileError) {
          console.warn('🔍 useJobs: Error loading profiles:', profileError)
        } else if (profiles) {
          console.log('🔍 useJobs: Loaded', profiles.length, 'profiles')
          const profileMap = new Map(profiles.map(p => [p.id, p]))

          transformedJobs.forEach(job => {
            job.assignedUsers?.forEach(user => {
              const profile = profileMap.get(user.id)
              if (profile) {
                user.email = profile.email
                user.displayName = profile.display_name
              }
            })
          })
        }
      }

      // Sort by date (newest first)
      const sortedJobs = transformedJobs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      console.log('🔍 useJobs: Final result:', sortedJobs.length, 'jobs')
      sortedJobs.forEach(job => {
        console.log(`🔍 useJobs: Job "${job.name}" has ${job.assignedUsers?.length || 0} assignments`)
      })

      setJobs(sortedJobs)
    } catch (error) {
      console.error('🔍 useJobs: Error in loadJobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const addJob = async (job: Omit<Job, 'id'>, assignedUserIds: string[] = []) => {
    if (!currentUser) throw new Error('User not authenticated')
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      // Insert the job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          name: job.name,
          client: job.client,
          date: job.date,
          location: job.location,
          tags: job.tags,
          details: job.details,
          site_contact: job.site_contact,
          site_phone_number: job.site_phone_number,
          user_id: currentUser.id,
          tenant_id: tenantId
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Insert job assignments if any users are assigned
      if (assignedUserIds.length > 0) {
        const assignments = assignedUserIds.map(userId => ({
          job_id: jobData.id,
          user_id: userId
        }))

        const { error: assignmentError } = await supabase
          .from('job_assignments')
          .insert(assignments)

        if (assignmentError) {
          console.error('Error assigning users to job:', assignmentError)
          // Don't throw - job was created successfully
        }
      }

      // Reload jobs to show the new job with assignments
      await loadJobs()
    } catch (error) {
      console.error('Error adding job:', error)
      throw error
    }
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!currentUser) throw new Error('User not authenticated')
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.client !== undefined) updateData.client = updates.client
      if (updates.date !== undefined) updateData.date = updates.date
      if (updates.location !== undefined) updateData.location = updates.location
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.details !== undefined) updateData.details = updates.details
      if (updates.site_contact !== undefined) updateData.site_contact = updates.site_contact
      if (updates.site_phone_number !== undefined) updateData.site_phone_number = updates.site_phone_number

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      // Update local state
      setJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, ...updates } : job))
      )
    } catch (error) {
      console.error('Error updating job:', error)
      throw error
    }
  }

  const deleteJob = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated')
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      // Update local state
      setJobs(prev => prev.filter(job => job.id !== id))
    } catch (error) {
      console.error('Error deleting job:', error)
      throw error
    }
  }

  const assignUserToJob = async (jobId: string, userId: string) => {
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const { error } = await supabase
        .from('job_assignments')
        .insert({
          job_id: jobId,
          user_id: userId
        })

      if (error) throw error

      // Reload jobs to get updated assignments
      await loadJobs()
    } catch (error) {
      console.error('Error assigning user to job:', error)
      throw error
    }
  }

  const unassignUserFromJob = async (jobId: string, userId: string) => {
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const { error } = await supabase
        .from('job_assignments')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', userId)

      if (error) throw error

      // Reload jobs to get updated assignments
      await loadJobs()
    } catch (error) {
      console.error('Error unassigning user from job:', error)
      throw error
    }
  }

  return {
    jobs,
    loading,
    addJob,
    updateJob,
    deleteJob,
    assignUserToJob,
    unassignUserFromJob
  }
}

export const useAllTenantJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const tenantId = useCurrentTenantId()

  useEffect(() => {
    if (!tenantId) {
      setJobs([])
      setLoading(false)
      return
    }

    loadAllTenantJobs()
  }, [tenantId])

  const loadAllTenantJobs = async () => {
    try {
      setLoading(true)

      // Get all jobs with assignments
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_assignments (
            user_id
          )
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })

      if (error) throw error

      // Transform jobs with assignment data
      const transformedJobs: Job[] = (jobsData || []).map((row: any) => {
        const assignments = (row.job_assignments || []).map((assignment: any) => ({
          id: assignment.user_id,
          email: '',
          displayName: undefined
        }))

        return {
          id: row.id,
          name: row.name,
          client: row.client,
          date: row.date,
          location: row.location,
          tags: row.tags || [],
          details: row.details,
          site_contact: row.site_contact,
          site_phone_number: row.site_phone_number,
          assignedUsers: assignments.length > 0 ? assignments : undefined
        }
      })

      // Load user profiles for assigned users
      const userIds: string[] = []
      transformedJobs.forEach(job => {
        job.assignedUsers?.forEach(user => {
          if (!userIds.includes(user.id)) {
            userIds.push(user.id)
          }
        })
      })

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email, display_name')
          .in('id', userIds)

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]))
          transformedJobs.forEach(job => {
            job.assignedUsers?.forEach(user => {
              const profile = profileMap.get(user.id)
              if (profile) {
                user.email = profile.email
                user.displayName = profile.display_name
              }
            })
          })
        }
      }

      setJobs(transformedJobs)
    } catch (error) {
      console.error('Error loading all tenant jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  return {
    jobs,
    loading
  }
}