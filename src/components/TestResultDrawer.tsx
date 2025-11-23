import React, { useEffect, useMemo, useState } from 'react'
import { Test, TestInput, TestResult, TestResultResponse, TestResultStatus, TableCellConfig } from '../types/test'
import { useAssets } from '../hooks/useAssets'
import Button from './ui/Button'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import TableInputRenderer from './table-input/TableInputRenderer'

interface TestResultDrawerProps {
  isOpen: boolean
  test: Test
  jobId?: string
  defaultAssetId?: string // Pre-select and lock this asset
  defaultResultId?: string // Pre-load this result if editing
  onClose: () => void
  onSave: (responses: TestResultResponse[], existingResultId?: string, status?: TestResultStatus, selectedAssetIds?: string[]) => Promise<void>
}

type InputValueState = string | boolean | null

const getExpectationDescription = (input: TestInput) => {
  switch (input.expected_type) {
    case 'range':
      return `Expected between ${input.expected_min} and ${input.expected_max}${input.unit ? ` ${input.unit}` : ''}`
    case 'minimum':
      return `Expected ≥ ${input.expected_min}${input.unit ? ` ${input.unit}` : ''}`
    case 'maximum':
      return `Expected ≤ ${input.expected_max}${input.unit ? ` ${input.unit}` : ''}`
    case 'exact':
      return `Expected value: ${input.expected_value ?? 'n/a'}${input.unit ? ` ${input.unit}` : ''}`
    default:
      return ''
  }
}

const getExpectedValuePlaceholder = (input: TestInput): string | undefined => {
  if (input.expected_value !== null && input.expected_value !== undefined) {
    return input.expected_value.toString()
  }
  return undefined
}

type ExpectationStatus = {
  state: 'pass' | 'fail'
  message: string
}

const formatValueWithUnit = (value: number, unit?: string | null) => {
  return `${value}${unit ? ` ${unit}` : ''}`
}

const parseNumericValue = (value: InputValueState): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }

  return null
}

const getExpectationStatus = (input: TestInput, rawValue: InputValueState): ExpectationStatus | null => {
  if (input.input_type === 'number') {
    const numericValue = parseNumericValue(rawValue)
    if (numericValue === null) {
      return null
    }

    const describeRange = () => {
      const hasMin = typeof input.expected_min === 'number'
      const hasMax = typeof input.expected_max === 'number'
      if (hasMin && hasMax) {
        return `Expected between ${formatValueWithUnit(input.expected_min!, input.unit)} and ${formatValueWithUnit(
          input.expected_max!,
          input.unit
        )}`
      }
      if (hasMin) {
        return `Expected ≥ ${formatValueWithUnit(input.expected_min!, input.unit)}`
      }
      if (hasMax) {
        return `Expected ≤ ${formatValueWithUnit(input.expected_max!, input.unit)}`
      }
      return null
    }

    switch (input.expected_type) {
      case 'range': {
        const hasMin = typeof input.expected_min === 'number'
        const hasMax = typeof input.expected_max === 'number'
        if (!hasMin && !hasMax) {
          return null
        }
        const meetsMin = !hasMin || numericValue >= (input.expected_min as number)
        const meetsMax = !hasMax || numericValue <= (input.expected_max as number)
        if (meetsMin && meetsMax) {
          return { state: 'pass', message: 'Within expected range' }
        }
        return { state: 'fail', message: describeRange() ?? 'Value is outside the expected range' }
      }
      case 'minimum': {
        if (typeof input.expected_min !== 'number') {
          return null
        }
        if (numericValue >= input.expected_min) {
          return { state: 'pass', message: 'Meets minimum requirement' }
        }
        return {
          state: 'fail',
          message: `Expected ≥ ${formatValueWithUnit(input.expected_min, input.unit)}`
        }
      }
      case 'maximum': {
        if (typeof input.expected_max !== 'number') {
          return null
        }
        if (numericValue <= input.expected_max) {
          return { state: 'pass', message: 'Meets maximum requirement' }
        }
        return {
          state: 'fail',
          message: `Expected ≤ ${formatValueWithUnit(input.expected_max, input.unit)}`
        }
      }
      case 'exact': {
        if (typeof input.expected_value !== 'number') {
          return null
        }
        if (numericValue === input.expected_value) {
          return { state: 'pass', message: 'Matches expected value' }
        }
        return {
          state: 'fail',
          message: `Expected ${formatValueWithUnit(input.expected_value, input.unit)}`
        }
      }
      default:
        return null
    }
  }

  if (
    input.input_type === 'boolean' &&
    input.expected_type === 'exact' &&
    typeof input.expected_value === 'number' &&
    typeof rawValue === 'boolean'
  ) {
    const expectedBool = Boolean(input.expected_value)
    if (rawValue === expectedBool) {
      return { state: 'pass', message: `Matches expected ${expectedBool ? 'Yes' : 'No'}` }
    }
    return { state: 'fail', message: `Expected ${expectedBool ? 'Yes' : 'No'}` }
  }

  return null
}

const ValidationIndicator: React.FC<{ status: ExpectationStatus }> = ({ status }) => {
  const isPass = status.state === 'pass'
  return (
    <div
      className={`mt-2 flex items-center text-sm ${isPass ? 'text-green-600' : 'text-red-600'}`}
      role="status"
      aria-live="polite"
    >
      {isPass ? (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.414-9.414L7.293 7.293a1 1 0 011.414-1.414L10 8.172l1.293-1.293a1 1 0 111.414 1.414L11.414 9.586l1.293 1.293a1 1 0 11-1.414 1.414L10 11l-1.293 1.293a1 1 0 01-1.414-1.414l1.293-1.293z" />
        </svg>
      )}
      <span className="ml-2">{status.message}</span>
    </div>
  )
}

const TestResultDrawer: React.FC<TestResultDrawerProps> = ({ isOpen, test, jobId, defaultAssetId, defaultResultId, onClose, onSave }) => {
  const inputs = useMemo(() => test.test_inputs || [], [test.test_inputs])
  
  // Separate table inputs from regular inputs
  const tableInputs = useMemo(() => {
    return inputs.filter(input => input.input_type === 'table')
  }, [inputs])
  
  const regularInputs = useMemo(() => {
    return inputs.filter(input => !tableInputs.includes(input))
  }, [inputs, tableInputs])
  
  // Helper to get table layout from an input
  const getTableLayout = (input: TestInput) => {
    return input.table_layout || null
  }
  
  // If defaultResultId is provided, use that specific result, otherwise use the latest
  const latestResult: TestResult | undefined = useMemo(() => {
    if (defaultResultId && test.test_results) {
      return test.test_results.find(r => r.id === defaultResultId)
    }
    return test.test_results?.[0]
  }, [test.test_results, defaultResultId])

  const { assets: availableAssets, loading: assetsLoading } = useAssets(jobId)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const isAssetLocked = Boolean(defaultAssetId)
  const [values, setValues] = useState<Record<string, InputValueState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Filter assets based on test's asset type (if specified)
  const filteredAssets = useMemo(() => {
    if (!availableAssets) return []
    if (!test.asset_type) return availableAssets
    return availableAssets.filter(asset => asset.asset_type === test.asset_type)
  }, [availableAssets, test.asset_type])

  const assetOptions = useMemo(() => {
    return filteredAssets.map(asset => ({
      value: asset.id,
      label: `${asset.make || ''} ${asset.model || ''} (${asset.asset_type})`.trim()
    }))
  }, [filteredAssets])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const initialValues: Record<string, InputValueState> = {}
    if (latestResult?.responses) {
      latestResult.responses.forEach((response) => {
        // Check if this is a table input cell response
        if (response.tableCellPosition) {
          const cellKey = `${response.inputId}_${response.tableCellPosition.rowIndex}_${response.tableCellPosition.columnIndex}`
          initialValues[cellKey] = response.value as InputValueState
          return
        }
        
        // Regular input response
        initialValues[response.inputId] = response.value as InputValueState
      })
    } else {
      // Initialize empty values for all inputs
      inputs.forEach((input) => {
        if (input.input_type === 'table') {
          // For table inputs, initialize cells based on table layout
          const tableLayout = getTableLayout(input)
          if (tableLayout) {
            tableLayout.cells
              .filter((cell: TableCellConfig) => cell.enabled)
              .forEach((cell: TableCellConfig) => {
                const cellKey = `${input.id}_${cell.rowIndex}_${cell.columnIndex}`
                initialValues[cellKey] = cell.inputType === 'boolean' ? null : ''
              })
          }
        } else if (input.input_type === 'boolean') {
          initialValues[input.id] = null
        } else {
          initialValues[input.id] = ''
        }
      })
    }

    // Initialize selected assets from defaultAssetId or existing result
    if (defaultAssetId) {
      // Lock to the provided asset
      setSelectedAssetIds([defaultAssetId])
    } else if (latestResult?.asset_ids && latestResult.asset_ids.length > 0) {
      setSelectedAssetIds(latestResult.asset_ids)
    } else if (latestResult?.asset_id) {
      // Fallback to legacy asset_id field for backward compatibility
      setSelectedAssetIds([latestResult.asset_id])
    } else {
      setSelectedAssetIds([])
    }

    setValues(initialValues)
    setErrors({})
    setStatusMessage(null)
  }, [isOpen, inputs, latestResult, defaultAssetId])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const updateValue = (inputId: string, value: InputValueState) => {
    setValues((prev) => ({
      ...prev,
      [inputId]: value
    }))
    setErrors((prev) => {
      const nextErrors = { ...prev }
      delete nextErrors[inputId]
      return nextErrors
    })
  }

  const validateValues = () => {
    const newErrors: Record<string, string> = {}

    // Validate asset selection (skip if locked, should always have defaultAssetId)
    if (!isAssetLocked && selectedAssetIds.length === 0) {
      newErrors.assets = 'Select at least one asset for this test'
    }

    // Validate regular inputs
    regularInputs.forEach((input) => {
      const rawValue = values[input.id]

      if (input.input_type === 'number') {
        const asString = (rawValue ?? '').toString()
        if (!asString.trim()) {
          newErrors[input.id] = 'Enter a value'
          return
        }
        const parsed = Number(asString)
        if (Number.isNaN(parsed)) {
          newErrors[input.id] = 'Enter a valid number'
        }
      } else if (input.input_type === 'text') {
        if (!rawValue || !(rawValue as string).trim()) {
          newErrors[input.id] = 'Enter a value'
        }
      } else if (input.input_type === 'boolean') {
        if (rawValue === null || rawValue === undefined) {
          newErrors[input.id] = 'Select Yes or No'
        }
      }
    })
    
    // Validate table inputs
    tableInputs.forEach((tableInput) => {
      const tableLayout = getTableLayout(tableInput)
      if (!tableLayout) return
      
      tableLayout.cells
        .filter((cell: TableCellConfig) => cell.enabled)
        .forEach((cell: TableCellConfig) => {
          const cellValueKey = `${tableInput.id}_${cell.rowIndex}_${cell.columnIndex}`
          const rawValue = values[cellValueKey]
          
          if (cell.inputType === 'number') {
            const asString = (rawValue ?? '').toString()
            if (!asString.trim()) {
              newErrors[cellValueKey] = 'Enter a value'
              return
            }
            const parsed = Number(asString)
            if (Number.isNaN(parsed)) {
              newErrors[cellValueKey] = 'Enter a valid number'
            }
          } else if (cell.inputType === 'text') {
            if (!rawValue || !(rawValue as string).trim()) {
              newErrors[cellValueKey] = 'Enter a value'
            }
          } else if (cell.inputType === 'boolean') {
            if (rawValue === null || rawValue === undefined) {
              newErrors[cellValueKey] = 'Select Yes or No'
            }
          }
        })
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const buildResponses = (): TestResultResponse[] => {
    const responses: TestResultResponse[] = []
    
    // Build responses for regular inputs
    regularInputs.forEach((input) => {
      const rawValue = values[input.id]

      if (input.input_type === 'number') {
        const asString = rawValue?.toString() ?? ''
        const parsed = asString.trim() === '' ? null : Number(asString)
        responses.push({
          inputId: input.id,
          value: parsed
        })
      } else if (input.input_type === 'boolean') {
        responses.push({
          inputId: input.id,
          value: rawValue === null ? null : Boolean(rawValue)
        })
      } else if (input.input_type === 'text') {
        const textValue = (rawValue as string) ?? ''
        responses.push({
          inputId: input.id,
          value: textValue.trim()
        })
      }
    })
    
    // Build responses for table inputs
    tableInputs.forEach((tableInput) => {
      const tableLayout = getTableLayout(tableInput)
      if (!tableLayout) return
      
      tableLayout.cells
        .filter((cell: TableCellConfig) => cell.enabled)
        .forEach((cell: TableCellConfig) => {
          const cellValueKey = `${tableInput.id}_${cell.rowIndex}_${cell.columnIndex}`
          const rawValue = values[cellValueKey]
          
          // For table cells, we need to create a synthetic input ID or store in notes
          // For now, we'll store the cell data in a structured way
          // Note: This might need adjustment based on how the backend expects table data
          if (cell.inputType === 'number') {
            const asString = rawValue?.toString() ?? ''
            const parsed = asString.trim() === '' ? null : Number(asString)
            responses.push({
              inputId: tableInput.id, // Use the table input ID
              value: parsed,
              tableCellPosition: {
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex
              }
            })
          } else if (cell.inputType === 'text') {
            responses.push({
              inputId: tableInput.id,
              value: (rawValue as string) ?? null,
              tableCellPosition: {
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex
              }
            })
          } else if (cell.inputType === 'boolean') {
            responses.push({
              inputId: tableInput.id,
              value: rawValue as boolean | null,
              tableCellPosition: {
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex
              }
            })
          }
        })
    })
    
    return responses
  }

  const handleSubmit = async () => {
    if (!validateValues()) {
      setStatusMessage({ type: 'error', message: 'Fix the indicated fields before submitting.' })
      return
    }

    setSubmitting(true)
    setStatusMessage(null)
    try {
      const responses = buildResponses()
      await onSave(responses, latestResult?.id, 'submitted', selectedAssetIds)
      setStatusMessage({ type: 'success', message: 'Results saved successfully.' })
      onClose()
    } catch (error) {
      console.error('Failed to save test results:', error)
      setStatusMessage({ type: 'error', message: 'Failed to save results. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm font-medium text-primary-600">Test Execution</p>
            <h2 className="text-2xl font-semibold text-gray-900">{test.name}</h2>
            {latestResult && (
              <p className="text-sm text-gray-500 mt-1">
                Last submitted on {new Date(latestResult.submitted_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close test results"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 11-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {test.instructions && (
            <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
              <p className="font-medium text-primary-700 mb-1">Instructions</p>
              <p>{test.instructions}</p>
            </div>
          )}

          {/* Asset Selection */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAssetLocked ? 'Asset' : 'Select Assets'}
              </h3>
              <span className="text-sm font-medium text-red-600">* Required</span>
            </div>
            {isAssetLocked ? (
              <p className="text-sm text-gray-600 mb-4">
                This test is linked to a specific asset.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                You must select at least one asset to link this test result to.
                {test.asset_type && ` Only assets of type "${test.asset_type}" are shown.`}
              </p>
            )}

            {assetsLoading ? (
              <div className="text-sm text-gray-500">Loading available assets...</div>
            ) : assetOptions.length === 0 ? (
              <div className="text-sm text-gray-500">
                No assets available for this test.
                {test.asset_type && ` Make sure you have assets of type "${test.asset_type}" in this job.`}
              </div>
            ) : isAssetLocked && defaultAssetId ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {(() => {
                  const lockedAsset = availableAssets?.find(a => a.id === defaultAssetId)
                  if (!lockedAsset) {
                    return <div className="text-sm text-gray-500">Loading asset...</div>
                  }
                  const assetLabel = lockedAsset.make || lockedAsset.model 
                    ? `${lockedAsset.make || ''} ${lockedAsset.model || ''}`.trim() 
                    : lockedAsset.asset_type
                  return (
                    <div>
                      <div className="font-medium text-gray-900">{assetLabel}</div>
                      {lockedAsset.serial_number && (
                        <div className="text-sm text-gray-500 mt-1">Serial: {lockedAsset.serial_number}</div>
                      )}
                      <div className="text-sm text-gray-500">Type: {lockedAsset.asset_type}</div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                {assetOptions.map((asset) => (
                  <label 
                    key={asset.value} 
                    className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${
                      isAssetLocked && asset.value === defaultAssetId
                        ? 'bg-gray-50 cursor-not-allowed'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(asset.value)}
                      onChange={(e) => {
                        if (isAssetLocked) return // Prevent changes when locked
                        if (e.target.checked) {
                          setSelectedAssetIds(prev => [...prev, asset.value])
                        } else {
                          setSelectedAssetIds(prev => prev.filter(id => id !== asset.value))
                        }
                        // Clear asset error when user makes selection
                        setErrors(prev => {
                          const next = { ...prev }
                          delete next.assets
                          return next
                        })
                      }}
                      disabled={isAssetLocked}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{asset.label}</div>
                      <div className="text-sm text-gray-500">ID: {asset.value}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {errors.assets && (
              <p className="mt-2 text-sm text-red-600">{errors.assets}</p>
            )}

            {selectedAssetIds.length > 0 && (
              <div className="mt-3 text-sm text-green-600">
                ✓ {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {inputs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              This test does not have any configured inputs yet.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Render table inputs */}
              {tableInputs.map((tableInput) => (
                <TableInputRenderer
                  key={tableInput.id}
                  input={tableInput}
                  values={values}
                  responses={latestResult?.responses || []}
                  onChange={updateValue}
                  errors={errors}
                  readOnly={false}
                />
              ))}
              
              {/* Render regular inputs */}
              {regularInputs.map((input) => {
                const expectationStatus = getExpectationStatus(input, values[input.id])
                return (
                  <div key={input.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{input.label}</p>
                      <p className="text-xs text-gray-500">{getExpectationDescription(input)}</p>
                      {input.notes && (
                        <p className="mt-1 text-xs text-gray-500">{input.notes}</p>
                      )}
                    </div>
                    {input.unit && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {input.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    {input.input_type === 'number' && (
                      <>
                        <Input
                          label="Measurement"
                          id={`measurement-${input.id}`}
                          type="number"
                          value={(values[input.id] as string) ?? ''}
                          onChange={(event) => updateValue(input.id, event.target.value)}
                          required
                          error={errors[input.id]}
                          placeholder={getExpectedValuePlaceholder(input)}
                          enablePlaceholderFill={Boolean(getExpectedValuePlaceholder(input))}
                        />
                        {expectationStatus && <ValidationIndicator status={expectationStatus} />}
                      </>
                    )}

                    {input.input_type === 'text' && (
                      <TextArea
                        label="Response"
                        id={`response-${input.id}`}
                        value={(values[input.id] as string) ?? ''}
                        onChange={(event) => updateValue(input.id, event.target.value)}
                        rows={3}
                        required
                        error={errors[input.id]}
                      />
                    )}

                    {input.input_type === 'boolean' && (
                      <div>
                        <p className="block text-sm font-medium text-gray-700 mb-2">Result</p>
                        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                          {['Yes', 'No'].map((option) => {
                            const currentValue = values[input.id] as boolean | null
                            const selected = currentValue === (option === 'Yes')
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateValue(input.id, option === 'Yes')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                                  selected
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                {option}
                              </button>
                            )
                          })}
                        </div>
                        {errors[input.id] && (
                          <p className="mt-2 text-xs text-red-600">{errors[input.id]}</p>
                        )}
                        {expectationStatus && <ValidationIndicator status={expectationStatus} />}
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}

          {statusMessage && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {statusMessage.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || inputs.length === 0 || (!isAssetLocked && selectedAssetIds.length === 0)}>
            {submitting ? 'Saving...' : 'Submit Results'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TestResultDrawer

