import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { Job } from '../types/job'
import { MESSAGES, CONFIG, ROUTES } from '../constants'
import { formatDate } from '../utils/date'

const JobCard: React.FC<{ job: Job; onDelete: (id: string) => void }> = ({ job, onDelete }) => {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)


  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (showDeleteConfirm) {
      onDelete(job.id)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(
        () => setShowDeleteConfirm(false),
        CONFIG.DELETE_CONFIRM_TIMEOUT
      )
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
      <div
        className="p-4 cursor-pointer"
        onClick={(e) => {
          // Only navigate if not clicking on delete button
          if (!e.defaultPrevented) {
            navigate(ROUTES.JOB_DETAILS.replace(':jobId', job.id))
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
              {job.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{job.client}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(job.date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate max-w-[120px]">{job.location}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              showDeleteConfirm
                ? 'bg-red-100 text-red-600'
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }`}
            aria-label={showDeleteConfirm ? 'Confirm delete' : 'Delete job'}
          >
            {showDeleteConfirm ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {job.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Assigned Users */}
        {job.assignedUsers && job.assignedUsers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-xs font-medium text-gray-500">
                {MESSAGES.ASSIGNED_TO}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.assignedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {user.displayName || user.email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse indicator */}
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500 flex items-center gap-1">
            {expanded ? MESSAGES.TAP_TO_COLLAPSE : MESSAGES.CLICK_FOR_FULL_DETAILS}
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Details</h4>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {job.details}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const JobList: React.FC = () => {
  const { jobs, deleteJob, loading } = useJobs()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase()
    return (
      job.name.toLowerCase().includes(query) ||
      job.client.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.tags.some(tag => tag.toLowerCase().includes(query)) ||
      job.details.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-gray-600">{MESSAGES.LOADING_JOBS}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {MESSAGES.NO_JOBS}
        </h3>
        <p className="text-sm text-gray-600 text-center max-w-sm">
          {MESSAGES.NO_JOBS_DESCRIPTION}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search jobs, clients, locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Job Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{MESSAGES.NO_JOBS_SEARCH}</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onDelete={deleteJob} />
          ))
        )}
      </div>
    </div>
  )
}

export default JobList

