import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useJobs } from '../hooks/useJobs'
import { useTests } from '../hooks/useTests'
import { useAssets } from '../hooks/useAssets'
import { formatDate } from '../utils/date'
import { Test, TestResultResponse, TestResultStatus } from '../types/test'
import { Asset, ASSET_TYPE_CONFIGS } from '../types/asset'
import Button from './ui/Button'
import Input from './ui/Input'
import TestResultDrawer from './TestResultDrawer'
import TestBuilderDrawer from './TestBuilderDrawer'

interface TestInstance {
  test: Test
  asset: Asset
  resultId?: string // Latest result ID for this test-asset combination
}

const JobTests: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { jobs, loading: jobsLoading } = useJobs()
  const { tests, loading: testsLoading, saveTestResult, assignTestsToJob, createTest: createNewTest } = useTests({ jobId, includeJobAssetTypes: true, includeResults: true })
  const { assets, loading: assetsLoading } = useAssets(jobId)
  const [search, setSearch] = useState('')
  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)
  const [isTestBuilderOpen, setIsTestBuilderOpen] = useState(false)

  const job = jobs.find(j => j.id === jobId)

  // Auto-assign tests to job based on asset types if no job-specific tests exist
  useEffect(() => {
    const autoAssignTests = async () => {
      if (!job || !assets || !tests || jobsLoading || testsLoading || assetsLoading || !jobId) return

      const jobSpecificTests = tests.filter(test => test.job_id === jobId)
      const hasJobSpecificTests = jobSpecificTests.length > 0

      // If job has no specific tests but has assets, auto-assign matching tests
      if (!hasJobSpecificTests && assets.length > 0) {
        const assetTypes = [...new Set(assets.map(asset => asset.asset_type))]
        const matchingTests = tests.filter(test =>
          test.asset_type && assetTypes.includes(test.asset_type) && !test.job_id
        )

        // Auto-link matching tests to this job
        if (matchingTests.length > 0) {
          try {
            const testIds = matchingTests.map(test => test.id)
            await assignTestsToJob(testIds, jobId)
            console.log(`Auto-assigned ${matchingTests.length} tests to job ${jobId}`)
          } catch (error) {
            console.error('Failed to auto-assign tests:', error)
          }
        }
      }
    }

    autoAssignTests()
  }, [job, assets, tests, jobId, jobsLoading, testsLoading, assetsLoading, assignTestsToJob])

  // Expand tests to show one per asset of that type
  const testInstances = useMemo(() => {
    if (!tests || !assets) return []
    
    const instances: TestInstance[] = []
    
    tests.forEach(test => {
      if (!test.asset_type) return
      
      // Find all assets of this test's asset type
      const matchingAssets = assets.filter(asset => asset.asset_type === test.asset_type)
      
      matchingAssets.forEach(asset => {
        // Find the latest result for this test-asset combination
        // Results are linked via test_result_assets junction table (asset_ids) or legacy asset_id field
        const result = test.test_results?.find(r => 
          (r.asset_ids && r.asset_ids.length > 0 && r.asset_ids.includes(asset.id)) ||
          r.asset_id === asset.id
        )
        
        instances.push({
          test,
          asset,
          resultId: result?.id
        })
      })
    })
    
    return instances
  }, [tests, assets])

  const filteredTestInstances = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return testInstances
    
    return testInstances.filter(instance => {
      const test = instance.test
      return (
        test.name.toLowerCase().includes(query) ||
        (test.description || '').toLowerCase().includes(query) ||
        (test.instructions || '').toLowerCase().includes(query) ||
        instance.asset.make?.toLowerCase().includes(query) ||
        instance.asset.model?.toLowerCase().includes(query) ||
        instance.asset.serial_number?.toLowerCase().includes(query)
      )
    })
  }, [testInstances, search])

  const activeTestInstance = useMemo(() => {
    if (!activeTestId || !activeAssetId) return null
    return testInstances.find(
      instance => instance.test.id === activeTestId && instance.asset.id === activeAssetId
    ) || null
  }, [activeTestId, activeAssetId, testInstances])

  const handleSaveResults = async (
    responses: TestResultResponse[],
    existingResultId?: string,
    status: TestResultStatus = 'submitted',
    selectedAssetIds?: string[]
  ) => {
    if (!activeTestInstance) {
      throw new Error('Cannot save results without an active test instance.')
    }

    // Always save with the specific asset_id for this instance
    await saveTestResult({
      testId: activeTestInstance.test.id,
      jobId: jobId || undefined,
      assetIds: [activeTestInstance.asset.id], // Only the asset for this instance
      responses,
      resultId: existingResultId,
      status
    })
  }

  const handleTestClick = (testId: string, assetId: string) => {
    setActiveTestId(testId)
    setActiveAssetId(assetId)
  }

  const handleCloseDrawer = () => {
    setActiveTestId(null)
    setActiveAssetId(null)
  }

  const handleCreateTest = async (payload: any) => {
    try {
      await createNewTest({
        ...payload,
        jobId: jobId
      })
      setIsTestBuilderOpen(false)
    } catch (error) {
      console.error('Failed to create test:', error)
      // Could add error handling UI here
    }
  }

  if (jobsLoading || testsLoading || assetsLoading) {
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
                onClick={() => setIsTestBuilderOpen(true)}
              >
                Create Test
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.ASSET_MANAGEMENT.replace(':jobId', job.id))}
              >
                Manage Assets
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{testInstances.length} {testInstances.length === 1 ? 'Test Instance' : 'Test Instances'}</h2>
              <p className="text-sm text-gray-600">Tests are automatically assigned based on asset types. You can also create custom tests for this job.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="md:w-64"
              />
            </div>
          </div>

          {filteredTestInstances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-600">
                {testInstances.length === 0
                  ? 'No test instances available. Tests are automatically assigned based on your asset types. Add assets first, or create custom tests.'
                  : 'No test instances match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTestInstances.map((instance) => {
                const { test, asset, resultId } = instance
                const latestResult = resultId ? test.test_results?.find(r => r.id === resultId) : undefined
                const assetLabel = asset.make || asset.model ? `${asset.make || ''} ${asset.model || ''}`.trim() : ASSET_TYPE_CONFIGS[asset.asset_type]?.label || asset.asset_type
                const assetDetails = asset.serial_number ? `Serial: ${asset.serial_number}` : asset.asset_type
                const isAutoAssigned = test.job_id === jobId // Tests assigned to this specific job

                return (
                  <div
                    key={`${test.id}-${asset.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold text-gray-900">{test.name}</p>
                          {isAutoAssigned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Auto-assigned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          Asset: {assetLabel}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assetDetails}
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
                      {latestResult ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-green-700">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Completed {formatDate(latestResult.submitted_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.75a.75.75 0 00-1.5 0v4.5c0 .414.336.75.75.75h3a.75.75 0 000-1.5h-2.25V5.25z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Awaiting submission
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleTestClick(test.id, asset.id)}
                      >
                        {latestResult ? 'View / Edit Results' : 'Complete Test'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {activeTestInstance && (
        <TestResultDrawer
          isOpen={Boolean(activeTestInstance)}
          test={activeTestInstance.test}
          jobId={jobId}
          defaultAssetId={activeTestInstance.asset.id}
          defaultResultId={activeTestInstance.resultId}
          onClose={handleCloseDrawer}
          onSave={handleSaveResults}
        />
      )}

      <TestBuilderDrawer
        isOpen={isTestBuilderOpen}
        onClose={() => setIsTestBuilderOpen(false)}
        onCreate={handleCreateTest}
        defaultJobId={jobId}
        lockJob={true}
      />
    </div>
  )
}

export default JobTests

