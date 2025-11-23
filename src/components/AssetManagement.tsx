import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { useAssets } from '../hooks/useAssets'
import { Asset, AssetType, ASSET_TYPE_CONFIGS } from '../types/asset'
import { useTests } from '../hooks/useTests'
import { ROUTES } from '../constants'
import Banner from './Banner'
import Button from './ui/Button'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import Select from './ui/Select'
import { Test, TestResult } from '../types/test'
import { formatDate } from '../utils/date'

const AssetManagement: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { jobs, loading: jobsLoading } = useJobs()
  const { assets, loading: assetsLoading, addAsset, deleteAsset, refreshAssets } = useAssets(jobId)
  const {
    tests: jobTests,
    loading: testsLoading
  } = useTests({ jobId, includeResults: true, includeJobAssetTypes: true })
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    asset_type: '' as AssetType
  })
  const [properties, setProperties] = useState<Record<string, any>>({})
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const job = jobs.find(j => j.id === jobId)

  if (jobsLoading || assetsLoading || testsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading asset management...</p>
        </div>
      </div>
    )
  }

  if (!job) {
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

  const handleAssetTypeChange = (assetType: AssetType) => {
    setFormData(prev => ({ ...prev, asset_type: assetType }))
    setProperties({}) // Reset properties when type changes
  }

  const handlePropertyChange = (key: string, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobId) return

    try {
      await addAsset({
        job_id: jobId,
        asset_type: formData.asset_type,
        properties
      })

      setBanner({ message: 'Asset added successfully!', type: 'success' })

      // Fallback refresh in case real-time subscription doesn't work
      setTimeout(() => refreshAssets(), 500)

      // Reset form
      setFormData({
        asset_type: '' as AssetType
      })
      setProperties({})
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding asset:', error)
      setBanner({ message: 'Failed to add asset. Please try again.', type: 'error' })
    }
  }

  const selectedAssetType = formData.asset_type ? ASSET_TYPE_CONFIGS[formData.asset_type] : null

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset(id)
      setBanner({ message: 'Asset deleted successfully!', type: 'success' })

      // Fallback refresh in case real-time subscription doesn't work
      setTimeout(() => refreshAssets(), 500)
    } catch (error) {
      console.error('Error deleting asset:', error)
      setBanner({ message: 'Failed to delete asset. Please try again.', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* Banner */}
      {banner && (
        <Banner
          message={banner.message}
          type={banner.type}
          onClose={() => setBanner(null)}
        />
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate(ROUTES.JOB_DETAILS.replace(':jobId', job.id))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Back to job details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Asset Management</h1>
                <p className="text-sm text-gray-600 truncate max-w-xs sm:max-w-md">{job.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-4">
              <Button
                onClick={refreshAssets}
                variant="secondary"
                className="hidden sm:flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden lg:inline">Refresh</span>
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary" className="text-sm">
                <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add Asset'}</span>
                <span className="sm:hidden">{showAddForm ? 'Cancel' : 'Add'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Add Asset Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add New Asset</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Asset Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Asset Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(ASSET_TYPE_CONFIGS).map(([type, config]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAssetTypeChange(type as AssetType)}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        formData.asset_type === type
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{config.icon ? config.icon : null}</div>
                      <div className="text-sm font-medium">{config.label ? config.label : null}</div>
                    </button>
                  ))}
                </div>
              </div>
            

              {/* Type-specific Properties */}
              {selectedAssetType && selectedAssetType.properties.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {selectedAssetType.label} Properties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAssetType.properties.map((prop) => (
                      <div key={prop.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {prop.label}
                          {prop.unit && <span className="text-gray-500 ml-1">({prop.unit})</span>}
                        </label>
                        {prop.type === 'select' ? (
                          <Select
                            value={properties[prop.key] || ''}
                            options={[
                              { value: '', label: `Select ${prop.label}` },
                              ...(prop.options?.map((option) => ({
                                value: option,
                                label: option
                              })) || [])
                            ]}
                            onChange={(value) => handlePropertyChange(prop.key, value)}
                          />
                        ) : prop.type === 'textarea' ? (
                          <TextArea
                            label=""
                            value={properties[prop.key] || ''}
                            onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                            placeholder={prop.placeholder}
                            rows={3}
                            enablePlaceholderFill={true}
                            className="mt-0"
                          />
                        ) : (
                          <Input
                            label=""
                            type={prop.type}
                            value={properties[prop.key] || ''}
                            onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                            placeholder={prop.placeholder}
                            enablePlaceholderFill={true}
                            className="mt-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.asset_type}>
                  Add Asset
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Assets List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Assets ({assets.length})
            </h2>
          </div>

          {assets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assets Yet</h3>
              <p className="text-gray-600 mb-4">Add your first asset to get started with cataloging equipment.</p>
              <Button onClick={() => setShowAddForm(true)}>
                Add First Asset
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDeleteAsset}
                  tests={jobTests}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Asset Card Component
const AssetCard: React.FC<{
  asset: Asset
  onDelete: (id: string) => void
  tests: Test[]
}> = ({ asset, onDelete, tests }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const config = ASSET_TYPE_CONFIGS[asset.asset_type] || {
    label: 'Unknown Asset Type',
    icon: '❓',
    properties: []
  }

  // Find completed test results for this asset
  const completedResults = useMemo(() => {
    const results: Array<{ test: Test; result: TestResult }> = []
    
    tests.forEach(test => {
      if (!test.test_results) return
      
      test.test_results.forEach(result => {
        // Check if this result is for this asset (via asset_ids array or legacy asset_id)
        const isForThisAsset = 
          (result.asset_ids && result.asset_ids.includes(asset.id)) ||
          result.asset_id === asset.id
        
        // Only include submitted (completed) results
        if (isForThisAsset && result.status === 'submitted') {
          results.push({ test, result })
        }
      })
    })
    
    // Sort by submitted_at, most recent first
    return results.sort((a, b) => 
      new Date(b.result.submitted_at).getTime() - new Date(a.result.submitted_at).getTime()
    )
  }, [tests, asset.id])

  // Find tests for this asset type that haven't been completed for this asset
  const pendingTests = useMemo(() => {
    // Get all tests for this asset type
    const testsForAssetType = tests.filter(test => test.asset_type === asset.asset_type)
    
    // Get test IDs that have completed results for this asset
    const completedTestIds = new Set(completedResults.map(r => r.test.id))
    
    // Return tests that don't have completed results
    return testsForAssetType.filter(test => !completedTestIds.has(test.id))
  }, [tests, asset.asset_type, completedResults])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showDeleteConfirm) {
      onDelete(asset.id)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  return (
    <div className="p-6 transition-colors hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <span className="text-xl">{config.icon ? config.icon : null}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h3 className="truncate text-lg font-semibold text-gray-900">
                {asset.make && asset.model ? `${asset.make} ${asset.model}` : config.label}
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                {config.label}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-4 text-sm text-gray-600 md:grid-cols-4">
              {asset.serial_number && (
                <div>
                  <span className="font-medium">Serial:</span> {asset.serial_number}
                </div>
              )}
              {asset.year && (
                <div>
                  <span className="font-medium">Year:</span> {asset.year}
                </div>
              )}
              {asset.location && (
                <div className="md:col-span-2">
                  <span className="font-medium">Location:</span> {asset.location}
                </div>
              )}
            </div>

            {/* Type-specific properties */}
            {Object.keys(asset.properties).length > 0 && (
              <div className="space-y-1">
                {Object.entries(asset.properties).map(([key, value]) => {
                  const propConfig = config.properties.find(p => p.key === key)
                  if (!propConfig || !value) return null
                  return (
                    <div key={key} className="text-sm text-gray-600">
                      <span className="font-medium">{propConfig.label}:</span> {value}
                      {propConfig.unit && <span className="ml-1 text-gray-500">({propConfig.unit})</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className={`rounded-lg p-2 transition-colors ${
            showDeleteConfirm
              ? 'bg-red-100 text-red-600'
              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
          }`}
          aria-label={showDeleteConfirm ? 'Confirm delete' : 'Delete asset'}
        >
          {showDeleteConfirm ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-gray-100 p-4">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900">Tests</h4>
          <p className="text-xs text-gray-500">
            {completedResults.length} completed, {pendingTests.length} pending
          </p>
        </div>

        {/* Completed Tests Section */}
        {completedResults.length > 0 && (
          <div className="mb-4">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Completed Tests</h5>
            <div className="space-y-2">
              {completedResults.map(({ test, result }) => (
                <div key={result.id} className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{test.name}</p>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Completed
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Completed on {formatDate(result.submitted_at)}
                      </p>
                      {test.description && (
                        <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tests Section */}
        {pendingTests.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">
              Pending Tests ({pendingTests.length})
            </h5>
            <div className="space-y-2">
              {pendingTests.map(test => (
                <div key={test.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{test.name}</p>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Not Completed
                        </span>
                      </div>
                      {test.description && (
                        <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                      )}
                      {test.test_inputs && test.test_inputs.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {test.test_inputs.length} input{test.test_inputs.length !== 1 ? 's' : ''} required
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {completedResults.length === 0 && pendingTests.length === 0 && (
          <p className="text-sm text-gray-500">No tests available for this asset type.</p>
        )}
      </div>
    </div>
  )
}


export default AssetManagement
