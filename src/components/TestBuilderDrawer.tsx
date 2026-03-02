import React, { useEffect, useMemo, useState } from 'react'
//import { Job } from '../types/job'
import { ASSET_TYPE_CONFIGS } from '../types/asset'
import { CreateTestPayload, Test, TestExpectedType, TestInputDraft, TestInputType } from '../types/test'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import Select from './ui/Select'
import Button from './ui/Button'
import TableInputBuilder from './table-input/TableInputBuilder'
import NestedTableBuilder from './nested-table/NestedTableBuilder'

interface TestBuilderDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-select asset type (e.g. when creating from asset context) */
  defaultAssetType?: string
  lockAsset?: boolean
  onCreate?: (payload: CreateTestPayload) => Promise<void>
  /** Edit mode: provide existing test to edit */
  test?: Test
  /** Update callback for edit mode */
  onUpdate?: (testId: string, payload: CreateTestPayload) => Promise<void>
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
  { label: 'Yes / No', value: 'boolean' },
  { label: 'Table (Advanced)', value: 'table' },
  { label: 'Nested Table (WYSIWYG)', value: 'nested_table' }
]

const TestBuilderDrawer: React.FC<TestBuilderDrawerProps> = ({
  isOpen,
  onClose,
  defaultAssetType,
  lockAsset = false,
  onCreate,
  test,
  onUpdate
}) => {
  const isEditMode = Boolean(test)
  const [testName, setTestName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>(defaultAssetType ? [defaultAssetType] : [])
  const [inputs, setInputs] = useState<TestInputDraft[]>([createEmptyInput()])
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const effectiveAssetTypes = lockAsset ? (defaultAssetType ? [defaultAssetType] : []) : selectedAssetTypes

  useEffect(() => {
    if (isOpen) {
      if (test) {
        // Edit mode: load existing test data
        setTestName(test.name || '')
        setDescription(test.description || '')
        setInstructions(test.instructions || '')
        setSelectedAssetTypes(test.asset_types || [])
        
        // Load test inputs
        if (test.test_inputs && test.test_inputs.length > 0) {
          const loadedInputs: TestInputDraft[] = test.test_inputs.map(input => ({
            label: input.label,
            inputType: input.input_type,
            unit: input.unit || '',
            expectedType: input.expected_type,
            expectedMin: input.expected_min,
            expectedMax: input.expected_max,
            expectedValue: input.expected_value,
            notes: input.notes || '',
            tableLayout: input.table_layout || undefined,
            nestedTableLayout: input.nested_table_layout || undefined
          }))
          setInputs(loadedInputs)
        } else {
          setInputs([createEmptyInput()])
        }
      } else {
        // Create mode: reset form
        setTestName('')
        setDescription('')
        setInstructions('')
        setInputs([createEmptyInput()])
        setSelectedAssetTypes(defaultAssetType ? [defaultAssetType] : [])
      }
      setStatusMessage(null)
    }
  }, [isOpen, defaultAssetType, test])

  const assetTypeOptions = useMemo(() => {
    return Object.entries(ASSET_TYPE_CONFIGS).map(([key, config]) => ({
      value: key,
      label: config.label
    }))
  }, [])

  const validateInputs = () => {
    if (!testName.trim()) {
      setStatusMessage({ type: 'error', message: 'A test name is required.' })
      return false
    }

    // Asset types are required unless we're in a locked asset context
    if (!lockAsset && (!effectiveAssetTypes || effectiveAssetTypes.length === 0)) {
      setStatusMessage({ type: 'error', message: 'At least one asset type must be selected for this test.' })
      return false
    }

    for (const input of inputs) {
      if (!input.label.trim()) {
        setStatusMessage({ type: 'error', message: 'Each input must have a label.' })
        return false
      }

      // Skip validation for table inputs (handled separately)
      if (input.inputType === 'table') {
        if (!input.tableLayout) {
          setStatusMessage({ type: 'error', message: 'Table inputs must have a table configuration.' })
          return false
        }
        const enabledCells = input.tableLayout.cells.filter(cell => cell.enabled)
        if (enabledCells.length === 0) {
          setStatusMessage({ type: 'error', message: 'At least one cell must be enabled in the table.' })
          return false
        }
        if (input.tableLayout.columns.length === 0) {
          setStatusMessage({ type: 'error', message: 'At least one column is required for table inputs.' })
          return false
        }
        if (input.tableLayout.rows.length === 0) {
          setStatusMessage({ type: 'error', message: 'At least one row is required for table inputs.' })
          return false
        }
        continue
      }

      // Skip validation for nested table inputs (handled separately)
      if (input.inputType === 'nested_table') {
        if (!input.nestedTableLayout) {
          setStatusMessage({ type: 'error', message: 'Nested table inputs must have a table configuration.' })
          return false
        }
        if (input.nestedTableLayout.rows === 0 || input.nestedTableLayout.columns === 0) {
          setStatusMessage({ type: 'error', message: 'Nested table must have at least one row and one column.' })
          return false
        }
        // Check if at least one cell is configured (not all empty)
        const configuredCells = input.nestedTableLayout.cells.filter(cell => cell.cellType !== 'empty')
        if (configuredCells.length === 0) {
          setStatusMessage({ type: 'error', message: 'Nested table must have at least one configured cell (header, input, or nested table).' })
          return false
        }
        continue
      }

      // Skip expected value validation for boolean (yes/no) and text inputs
      // Only number inputs need expected value validation
      if (input.inputType !== 'number') {
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

      if (input.expectedType === 'exact' && input.expectedValue === null) {
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
      const payload: CreateTestPayload = {
        name: testName.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        assetTypes: effectiveAssetTypes.length > 0 ? effectiveAssetTypes : undefined,
        inputs
      }

      if (isEditMode && test && onUpdate) {
        await onUpdate(test.id, payload)
        setStatusMessage({ type: 'success', message: 'Test updated successfully.' })
      } else if (onCreate) {
        await onCreate(payload)
        setStatusMessage({ type: 'success', message: 'Test created successfully.' })
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} test:`, error)
      setStatusMessage({ type: 'error', message: `Failed to ${isEditMode ? 'update' : 'create'} the test. Please try again.` })
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

    // Check if value contains comparison operators
    const hasComparisonOperators = /[<>≤≥]/.test(value)

    if (hasComparisonOperators) {
      // Store as string to preserve comparison operators
      updateInput(index, { [field]: value } as Partial<TestInputDraft>)
      return
    }

    // Try to parse as number
    const parsed = Number(value.trim())

    if (!Number.isNaN(parsed) && value.trim() !== '') {
      // Store as number for validation purposes
      updateInput(index, { [field]: parsed } as Partial<TestInputDraft>)
    } else {
      // Store as string for non-numeric values without operators
      updateInput(index, { [field]: value } as Partial<TestInputDraft>)
    }
  }

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, idx) => idx !== index))
  }

  const canSubmit = Boolean(testName.trim() && inputs.length > 0)

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm font-medium text-primary-600">Test Builder</p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Commissioning Test' : 'Create a Commissioning Test'}
            </h2>
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

          <div>
            {lockAsset && defaultAssetType ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Asset Type <span className="text-red-600">*</span>
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {ASSET_TYPE_CONFIGS[defaultAssetType as keyof typeof ASSET_TYPE_CONFIGS]?.label || defaultAssetType}
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Asset Types <span className="text-red-600">*</span>
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  Select all asset types this test applies to. The test will be available for all assets of these types across all jobs.
                </p>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-300 bg-white p-3 space-y-2">
                  {assetTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssetTypes.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssetTypes(prev => [...prev, option.value])
                          } else {
                            setSelectedAssetTypes(prev => prev.filter(type => type !== option.value))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
                {selectedAssetTypes.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedAssetTypes.length} {selectedAssetTypes.length === 1 ? 'type' : 'types'} selected
                  </p>
                )}
              </div>
            )}
          </div>

          <Input
            label="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g., VT winding resistance test"
            enablePlaceholderFill={true}
            required
          />

          <Input
            label="Reference / Notes"
            placeholder="Optional short note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            enablePlaceholderFill={true}
          />

          <TextArea
            label="Instructions"
            placeholder="Document how to perform this test..."
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            enablePlaceholderFill={true}
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
                      enablePlaceholderFill={true}
                      required
                    />

                    <Select
                      label="Input Type"
                      value={input.inputType}
                      options={inputTypeOptions}
                      onChange={(value) => {
                        const newType = value as TestInputType
                        if (newType === 'table') {
                          // Initialize table layout if switching to table
                          updateInput(index, {
                            inputType: newType,
                            tableLayout: input.tableLayout || {
                              columns: ['L1', 'L2', 'L3'],
                              rows: ['L1 CT', 'L2 CT', 'L3 CT'],
                              cells: [],
                              headerRows: []
                            },
                            nestedTableLayout: undefined
                          })
                        } else if (newType === 'nested_table') {
                          // Initialize nested table layout if switching to nested_table
                          updateInput(index, {
                            inputType: newType,
                            nestedTableLayout: input.nestedTableLayout || {
                              rows: 3,
                              columns: 3,
                              cells: []
                            },
                            tableLayout: undefined
                          })
                        } else {
                          updateInput(index, { 
                            inputType: newType, 
                            tableLayout: undefined,
                            nestedTableLayout: undefined
                          })
                        }
                      }}
                    />
                  </div>

                  {input.inputType === 'table' && (
                    <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
                      <TableInputBuilder
                        label={input.label}
                        value={input.tableLayout}
                        onChange={(config) => updateInput(index, { tableLayout: config })}
                        onLabelChange={(newLabel) => updateInput(index, { label: newLabel })}
                      />
                    </div>
                  )}

                  {input.inputType === 'nested_table' && (
                    <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
                      <NestedTableBuilder
                        label={input.label}
                        value={input.nestedTableLayout}
                        onChange={(config) => updateInput(index, { nestedTableLayout: config })}
                        onLabelChange={(newLabel) => updateInput(index, { label: newLabel })}
                      />
                    </div>
                  )}

                  {input.inputType === 'number' && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Select
                          label="Unit"
                          value={input.unit || ''}
                          options={[
                            { label: 'Volts (V)', value: 'V' },
                            { label: 'Amperes (A)', value: 'A' },
                            { label: 'Ohms (Ω)', value: 'Ω' },
                            { label: 'Megaohms (MΩ)', value: 'MΩ' }
                          ]}
                          onChange={(value) => updateInput(index, { unit: value })}
                          placeholder="Select unit..."
                        />

                        <Select
                          label="Expected Type"
                          value={input.expectedType}
                          options={expectedTypeOptions}
                          onChange={(value) => updateInput(index, { expectedType: value as TestExpectedType })}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {(input.expectedType === 'range' || input.expectedType === 'minimum') && (
                          <Input
                            label="Minimum Value"
                            type="text"
                            value={input.expectedMin ?? ''}
                            onChange={(e) => handleNumericChange(index, 'expectedMin', e.target.value)}
                          />
                        )}

                        {(input.expectedType === 'range' || input.expectedType === 'maximum') && (
                          <Input
                            label="Maximum Value"
                            type="text"
                            value={input.expectedMax ?? ''}
                            onChange={(e) => handleNumericChange(index, 'expectedMax', e.target.value)}
                          />
                        )}

                        {input.expectedType === 'exact' && (
                          <Input
                            label="Expected Value"
                            type="text"
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
                    enablePlaceholderFill={true}
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
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Test' : 'Create Test')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

//const getAssetLabel = (asset: Asset) => {
//  if (asset.make && asset.model) return `${asset.make} ${asset.model}`
//  if (asset.make) return asset.make
//  if (asset.model) return asset.model
//  const config = ASSET_TYPE_CONFIGS[asset.asset_type]
//  return config?.label || 'Asset'
//}

export default TestBuilderDrawer

