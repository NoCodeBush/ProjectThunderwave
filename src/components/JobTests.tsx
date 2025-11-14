import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useJobs } from '../hooks/useJobs'
import { useTests } from '../hooks/useTests'
import { formatDate } from '../utils/date'
import Button from './ui/Button'
import Input from './ui/Input'
import TestBuilderDrawer from './TestBuilderDrawer'

const JobTests: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { jobs, loading: jobsLoading } = useJobs()
  const { tests, loading: testsLoading, createTest } = useTests({ jobId })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [onlyUnlinked, setOnlyUnlinked] = useState(false)

  const job = jobs.find(j => j.id === jobId)

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tests.filter(test => {
      if (onlyUnlinked && test.asset_id) return false
      if (!query) return true
      return (
        test.name.toLowerCase().includes(query) ||
        (test.description || '').toLowerCase().includes(query) ||
        (test.instructions || '').toLowerCase().includes(query)
      )
    })
  }, [tests, search, onlyUnlinked])

  if (jobsLoading || testsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading tests...</p>
        </div>
      </div>
    )
  }

  if (!job || !jobId) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-6">The requested job could not be found.</p>
          <Button onClick={() => navigate(ROUTES.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(ROUTES.JOB_DETAILS.replace(':jobId', job.id))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to job details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">Commissioning Tests</p>
                <h1 className="text-xl font-bold text-gray-900">{job.name}</h1>
                <p className="text-sm text-gray-600">{job.client}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.ASSET_MANAGEMENT.replace(':jobId', job.id))}
              >
                Manage Assets
              </Button>
              <Button onClick={() => setIsDrawerOpen(true)}>
                New Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tests.length} {tests.length === 1 ? 'Test' : 'Tests'}</h2>
              <p className="text-sm text-gray-600">Search, filter, and create commissioning test forms for this job.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="md:w-64"
              />
              <label className="inline-flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={onlyUnlinked}
                  onChange={(e) => setOnlyUnlinked(e.target.checked)}
                />
                Show only unlinked tests
              </label>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-600">
                {tests.length === 0
                  ? 'No tests have been created for this job yet.'
                  : 'No tests match your current filters.'}
              </p>
              <Button className="mt-4" onClick={() => setIsDrawerOpen(true)}>
                Create Test
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{test.name}</p>
                      <p className="text-sm text-gray-600">
                        {test.asset_id ? `Linked to asset` : 'Unlinked test'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {test.test_inputs ? `${test.test_inputs.length} inputs` : 'Inputs pending'}
                    </div>
                  </div>
                  {test.description && (
                    <p className="mt-2 text-sm text-gray-600">{test.description}</p>
                  )}
                  {test.instructions && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{test.instructions}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>Created {formatDate(test.created_at)}</span>
                    <span>Updated {formatDate(test.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <TestBuilderDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        jobs={[job]}
        defaultJobId={job.id}
        lockJob
        onCreate={async (payload) => {
          await createTest(payload)
          setIsDrawerOpen(false)
        }}
      />
    </div>
  )
}

export default JobTests

