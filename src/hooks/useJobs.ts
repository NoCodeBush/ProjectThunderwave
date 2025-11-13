import { useState, useEffect } from 'react'
import { Job } from '../types/job'
import { supabase } from '../supabase/config'
import { useAuth } from '../context/AuthContext'
import { useCurrentTenantId } from './useCurrentTenantId'

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser } = useAuth()
  const tenantId = useCurrentTenantId()

  useEffect(() => {
    if (!currentUser || !tenantId) {
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

        // Get jobs owned by the user
        const { data: ownedJobs, error: ownedJobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', currentUser?.id)
          .eq('tenant_id', tenantId)

        if (ownedJobsError) throw ownedJobsError

        // Get jobs assigned to the user (but not owned by them)
        const { data: assignedJobsData, error: assignedJobsError } = await supabase
          .from('job_assignments')
          .select(`
            job_id,
            jobs!inner (
              id,
              name,
              client,
              date,
              location,
              tags,
              details,
              site_contact,
              site_phone_number,
              user_id,
              tenant_id,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', currentUser?.id)
          .eq('jobs.tenant_id', tenantId)

        if (assignedJobsError) throw assignedJobsError

        // Extract assigned jobs (avoiding duplicates with owned jobs)
        const assignedJobs = (assignedJobsData || [])
          .map((item: any) => item.jobs)
          .filter((job: any) => !ownedJobs?.some((owned: any) => owned.id === job.id))

        // Combine owned and assigned jobs
        const allJobs = [...(ownedJobs || []), ...(assignedJobs || [])]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Load assignments for all jobs
        const jobIds = allJobs.map((job: any) => job.id)
        let assignments: any[] = []
        let userProfiles: Map<string, any> = new Map()

        if (jobIds.length > 0) {
          // Get all assignments
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('job_assignments')
            .select('job_id, user_id')
            .in('job_id', jobIds)

          if (!assignmentsError && assignmentsData) {
            assignments = assignmentsData

            // Get unique user IDs
            const userIds = [...new Set(assignments.map((a: any) => a.user_id))]

            // Fetch user profiles
            if (userIds.length > 0) {
              const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, email, display_name')
                .in('id', userIds)

              if (!profilesError && profilesData) {
                profilesData.forEach((profile: any) => {
                  userProfiles.set(profile.id, profile)
                })
              }
            }
          }
        }

        console.log('🔍 Jobs loaded:', {
          ownedJobs: (ownedJobs || []).length,
          assignedJobs: (assignedJobs || []).length,
          totalJobs: allJobs.length,
          jobs: allJobs.map(j => ({ id: j.id, name: j.name, assignments: assignments.filter(a => a.job_id === j.id).length }))
        })

        // Transform database format to Job format
        const transformedJobs: Job[] = allJobs.map((row: any) => {
          const jobAssignments = assignments
            .filter((a: any) => a.job_id === row.id)
            .map((a: any) => {
              const profile = userProfiles.get(a.user_id)
              return {
                id: a.user_id,
                email: profile?.email || '',
                displayName: profile?.display_name || undefined
              }
            })

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
            assignedUsers: jobAssignments.length > 0 ? jobAssignments : undefined
          }
        })

        setJobs(transformedJobs)
      } catch (error) {
        console.error('Error loading jobs:', error)
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

      // Load the job with assignments
      
      
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

