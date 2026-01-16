import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllTenantJobs } from '../hooks/useJobs'
import { useUsers } from '../hooks/useUsers'
import { useUserRole } from '../hooks/useUserRole'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/date'
import { Job } from '../types/job'
import { ROUTES } from '../constants/routes'

// Predefined color palette for users
const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6b7280', // gray
]

const getUserColor = (userId: string): string => {
  // Create a simple hash of the user ID to consistently assign colors
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % USER_COLORS.length
  return USER_COLORS[index]
}

const getJobColors = (job: Job): string[] => {
  if (!job.assignedUsers || job.assignedUsers.length === 0) {
    return ['#6b7280'] // default gray
  }

  return job.assignedUsers.map(user => getUserColor(user.id))
}

const getJobBackgroundStyle = (job: Job): React.CSSProperties => {
  const colors = getJobColors(job)

  if (colors.length === 1) {
    return {
      backgroundColor: colors[0],
    }
  } else {
    // Create a striped pattern for multiple users
    const gradientStops = colors.map((color, index) => {
      const percentage = (index / colors.length) * 100
      const nextPercentage = ((index + 1) / colors.length) * 100
      return `${color} ${percentage}% ${nextPercentage}%`
    }).join(', ')

    return {
      background: `linear-gradient(45deg, ${gradientStops})`,
    }
  }
}

const Schedule: React.FC = () => {
  const navigate = useNavigate()
  const { jobs, loading } = useAllTenantJobs()
  const { users } = useUsers()
  const { role } = useUserRole()
  const { currentUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get the first day of the month and last day of the month
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  // Get the start of the calendar (first day of week containing month start)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay())

  // Get the end of the calendar (last day of week containing month end)
  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()))

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const grouped: Record<string, Job[]> = {}

    jobs.forEach(job => {
      const dateKey = new Date(job.date).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(job)
    })

    return grouped
  }, [jobs])

  // Create user color mapping for legend
  const userColorMap = useMemo(() => {
    const map = new Map<string, { color: string; name: string }>()
    users.forEach(user => {
      map.set(user.id, {
        color: getUserColor(user.id),
        name: user.displayName || user.email
      })
    })
    return map
  }, [users])

  // Generate calendar days
  const calendarDays = []
  const current = new Date(calendarStart)

  while (current <= calendarEnd) {
    const dateKey = current.toDateString()
    const dayJobs = jobsByDate[dateKey] || []
    const isCurrentMonth = current.getMonth() === currentDate.getMonth()
    const isToday = current.toDateString() === new Date().toDateString()

    calendarDays.push({
      date: new Date(current),
      dateKey,
      jobs: dayJobs,
      isCurrentMonth,
      isToday
    })

    current.setDate(current.getDate() + 1)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Check if user can view a job (assigned to it or is administrator)
  const canViewJob = (job: Job): boolean => {
    if (!currentUser) return false
    
    // Administrators can view all jobs
    if (role === 'administrator') return true
    
    // Check if user is assigned to the job
    const isAssigned = job.assignedUsers?.some(user => user.id === currentUser.id)
    return isAssigned || false
  }

  // Handle job click
  const handleJobClick = (job: Job) => {
    if (canViewJob(job)) {
      navigate(ROUTES.JOB_DETAILS.replace(':jobId', job.id))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* User Color Legend */}
      {Array.from(userColorMap.entries()).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Assigned Users</h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(userColorMap.entries()).map(([userId, { color, name }]) => (
              <div key={userId} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-700">{name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></div>
              <span className="text-xs text-gray-700">Unassigned</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Jobs show solid colors for single users, or striped patterns for multiple users
          </p>
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[80px] p-2 border border-gray-200 rounded-lg
              ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${day.isToday ? 'ring-2 ring-primary-500 ring-inset' : ''}
            `}
          >
            <div className={`
              text-sm font-medium mb-1
              ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${day.isToday ? 'text-primary-600' : ''}
            `}>
              {day.date.getDate()}
            </div>

            {/* Jobs for this day */}
            <div className="space-y-1">
              {day.jobs.slice(0, 2).map(job => {
                const assignedUserNames = job.assignedUsers?.map(u => u.displayName || u.email).join(', ') || 'Unassigned'
                const hasAccess = canViewJob(job)
                return (
                  <div
                    key={job.id}
                    className={`text-xs text-white px-1 py-0.5 rounded truncate font-medium shadow-sm ${
                      hasAccess ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default opacity-75'
                    }`}
                    style={getJobBackgroundStyle(job)}
                    title={`${job.name} - ${job.client} (${assignedUserNames})${hasAccess ? ' - Click to view' : ''}`}
                    onClick={() => hasAccess && handleJobClick(job)}
                  >
                    {job.name}
                  </div>
                )
              })}

              {day.jobs.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{day.jobs.length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Job Details */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Jobs</h3>
        {jobsByDate[new Date().toDateString()]?.length > 0 ? (
          <div className="space-y-3">
            {jobsByDate[new Date().toDateString()].map(job => {
              const hasAccess = canViewJob(job)
              return (
                <div 
                  key={job.id} 
                  className={`bg-white rounded-lg border border-gray-200 p-4 ${
                    hasAccess ? 'cursor-pointer hover:shadow-md hover:border-primary-300 transition-all' : 'cursor-default'
                  }`}
                  onClick={() => hasAccess && handleJobClick(job)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={getJobBackgroundStyle(job)}
                        />
                        <h4 className="font-semibold text-gray-900">{job.name}</h4>
                        {hasAccess && (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    <p className="text-sm text-gray-600">{job.client}</p>
                    <p className="text-sm text-gray-500">{job.location}</p>
                    {job.site_contact && (
                      <p className="text-sm text-gray-500">Contact: {job.site_contact}</p>
                    )}
                    {job.assignedUsers && job.assignedUsers.length > 0 && (
                      <p className="text-sm text-gray-500">
                        Assigned: {job.assignedUsers.map(u => u.displayName || u.email).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {formatDate(job.date)}
                  </div>
                </div>
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {job.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No jobs scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Schedule