import React, { useEffect, useMemo, useState } from 'react'
import { Job } from '../types/job'
import { Asset, ASSET_TYPE_CONFIGS } from '../types/asset'
import { CreateTestPayload, TestExpectedType, TestInputDraft, TestInputType } from '../types/test'
import { useAssets } from '../hooks/useAssets'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import Button from './ui/Button'

interface TestBuilderDrawerProps {
  isOpen: boolean
  onClose: () => void
  jobs: Job[]
  defaultJobId?: string
  defaultAssetId?: string
  defaultAssetLabel?: string
  lockJob?: boolean
  lockAsset?: boolean
  onCreate: (payload: CreateTestPayload) => Promise<void>
}

const createEmptyInput = (): TestInputDraft => ({
  label: '',
  inputType: 'number',
  unit: '',
  expectedType: 'range',
  expectedMin: null,
  expectedMax: null,
  expectedValue: null,
  notes: ''
})

const expectedTypeOptions: { label: string; value: TestExpectedType; description: string }[] = [
  { label: 'Range', value: 'range', description: 'Value must be between min and max (inclusive)' },
  { label: 'Minimum', value: 'minimum', description: 'Value must be greater than or equal to minimum' },
  { label: 'Maximum', value: 'maximum', description: 'Value must be less than or equal to maximum' },
  { label: 'Exact Value', value: 'exact', description: 'Value must match expected value exactly' }
]

const inputTypeOptions: { label: string; value: TestInputType }[] = [
  { label: 'Number', value: 'number' },
  { label: 'Text', value: 'text' },
  { label: 'Yes / No', value: 'boolean' }
]

const TestBuilderDrawer: React.FC<TestBuilderDrawerProps> = ({
  isOpen,
  onClose,
  jobs,
  defaultJobId,
  defaultAssetId,
  defaultAssetLabel,
  lockJob = false,
  lockAsset = false,
  onCreate
}) => {
  const [testName, setTestName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>(defaultJobId || '')
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || '')
  const [inputs, setInputs] = useState<TestInputDraft[]>([createEmptyInput()])
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const effectiveJobId = lockJob ? (defaultJobId || '') : selectedJobId
  const effectiveAssetId = lockAsset ? (defaultAssetId || '') : selectedAssetId

  const { assets: availableAssets, loading: assetsLoading } = useAssets(isOpen ? effectiveJobId : undefined)

  useEffect(() => {
    if (isOpen) {
      setTestName('')
      setDescription('')
      setInstructions('')
      setInputs([createEmptyInput()])
      setSelectedJobId(defaultJobId || '')
      setSelectedAssetId(defaultAssetId || '')
      setStatusMessage(null)
    }
  }, [isOpen, defaultJobId, defaultAssetId])

  const jobOptions = useMemo(() => {
    return jobs.map((job) => ({
      value: job.id,
      label: job.name
    }))
  }, [jobs])

  const assetOptions = useMemo(() => {
    if (!availableAssets || availableAssets.length === 0) return []
    return availableAssets.map(asset => ({
      value: asset.id,
      label: getAssetLabel(asset)
    }))
  }, [availableAssets])

  const validateInputs = () => {
    if (!testName.trim()) {
      setStatusMessage({ type: 'error', message: 'A test name is required.' })
      return false
    }

    if (!effectiveJobId) {
      setStatusMessage({ type: 'error', message: 'Select a job before creating a test.' })
      return false
    }

    for (const input of inputs) {
      if (!input.label.trim()) {
        setStatusMessage({ type: 'error', message: 'Each input must have a label.' })
        return false
      }

      // Skip expected value validation for boolean (yes/no) inputs
      if (input.inputType === 'boolean') {
        continue
      }

      if (input.expectedType === 'range') {
        if (input.expectedMin === null || input.expectedMax === null) {
          setStatusMessage({ type: 'error', message: 'Range expectations require both minimum and maximum values.' })
          return false
        }
      }

      if (input.expectedType === 'minimum' && input.expectedMin === null) {
        setStatusMessage({ type: 'error', message: 'Minimum expectations require a minimum value.' })
        return false
      }

      if (input.expectedType === 'maximum' && input.expectedMax === null) {
        setStatusMessage({ type: 'error', message: 'Maximum expectations require a maximum value.' })
        return false
      }

      if (input.expectedType === 'exact' && input.expectedValue === null && input.inputType !== 'text') {
        setStatusMessage({ type: 'error', message: 'Exact expectations require a value.' })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatusMessage(null)

    if (!validateInputs()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onCreate({
        name: testName.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        jobId: effectiveJobId,
        assetId: effectiveAssetId || undefined,
        inputs
      })
      setStatusMessage({ type: 'success', message: 'Test created successfully.' })
    } catch (error) {
      console.error('Failed to create test:', error)
      setStatusMessage({ type: 'error', message: 'Failed to create the test. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateInput = (index: number, updates: Partial<TestInputDraft>) => {
    setInputs(prev => prev.map((input, idx) => (idx === index ? { ...input, ...updates } : input)))
  }

  const handleNumericChange = (index: number, field: 'expectedMin' | 'expectedMax' | 'expectedValue', value: string) => {
    if (value === '') {
      updateInput(index, { [field]: null } as Partial<TestInputDraft>)
      return
    }

    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      updateInput(index, { [field]: parsed } as Partial<TestInputDraft>)
    }
  }

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, idx) => idx !== index))
  }

  const canSubmit = Boolean(testName.trim() && effectiveJobId && inputs.length > 0)

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm font-medium text-primary-600">Test Builder</p>
            <h2 className="text-2xl font-semibold text-gray-900">Create a Commissioning Test</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close test builder"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6">
          {statusMessage && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {statusMessage.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Test Name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., VT winding resistance test"
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Job
              </label>
              {lockJob && defaultJobId ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {jobOptions.find(job => job.value === defaultJobId)?.label || 'Selected job'}
                </div>
              ) : (
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="">Select a job</option>
                  {jobOptions.map(job => (
                    <option key={job.value} value={job.value}>
                      {job.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Asset (optional)
              </label>
              {lockAsset && defaultAssetId ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {defaultAssetLabel || 'Selected asset'}
                </div>
              ) : (
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  disabled={!effectiveJobId || assetsLoading}
                >
                  <option value="">No asset selected</option>
                  {assetOptions.map(asset => (
                    <option key={asset.value} value={asset.value}>
                      {asset.label}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Tests can be created without attaching an asset. Link them later from the asset screen.
              </p>
            </div>

            <Input
              label="Reference / Notes"
              placeholder="Optional short note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <TextArea
            label="Instructions"
            placeholder="Document how to perform this test..."
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Test Inputs</h3>
                <p className="text-sm text-gray-600">Add the readings that need to be captured during the test.</p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setInputs(prev => [...prev, createEmptyInput()])}
              >
                Add Input
              </Button>
            </div>

            <div className="space-y-4">
              {inputs.map((input, index) => (
                <div key={index} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Input #{index + 1}</h4>
                    {inputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInput(index)}
                        className="text-sm text-red-600 transition-colors hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Label"
                      placeholder="e.g., Phase-phase voltage"
                      value={input.label}
                      onChange={(e) => updateInput(index, { label: e.target.value })}
                      required
                    />

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Input Type
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={input.inputType}
                        onChange={(e) => updateInput(index, { inputType: e.target.value as TestInputType })}
                      >
                        {inputTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {input.inputType !== 'boolean' && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Unit"
                          placeholder="e.g., V, Ω, A"
                          value={input.unit || ''}
                          onChange={(e) => updateInput(index, { unit: e.target.value })}
                        />

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Expected Type
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={input.expectedType}
                            onChange={(e) => updateInput(index, { expectedType: e.target.value as TestExpectedType })}
                          >
                            {expectedTypeOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            {expectedTypeOptions.find(opt => opt.value === input.expectedType)?.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {(input.expectedType === 'range' || input.expectedType === 'minimum') && (
                          <Input
                            label="Minimum Value"
                            type="number"
                            value={input.expectedMin ?? ''}
                            onChange={(e) => handleNumericChange(index, 'expectedMin', e.target.value)}
                          />
                        )}

                        {(input.expectedType === 'range' || input.expectedType === 'maximum') && (
                          <Input
                            label="Maximum Value"
                            type="number"
                            value={input.expectedMax ?? ''}
                            onChange={(e) => handleNumericChange(index, 'expectedMax', e.target.value)}
                          />
                        )}

                        {input.expectedType === 'exact' && (
                          <Input
                            label="Expected Value"
                            type="number"
                            value={input.expectedValue ?? ''}
                            onChange={(e) => handleNumericChange(index, 'expectedValue', e.target.value)}
                          />
                        )}
                      </div>
                    </>
                  )}

                  <TextArea
                    label="Notes"
                    rows={2}
                    placeholder="Optional guidance for this input..."
                    value={input.notes || ''}
                    onChange={(e) => updateInput(index, { notes: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Test'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const getAssetLabel = (asset: Asset) => {
  if (asset.make && asset.model) return `${asset.make} ${asset.model}`
  if (asset.make) return asset.make
  if (asset.model) return asset.model
  const config = ASSET_TYPE_CONFIGS[asset.asset_type]
  return config?.label || 'Asset'
}

export default TestBuilderDrawer

