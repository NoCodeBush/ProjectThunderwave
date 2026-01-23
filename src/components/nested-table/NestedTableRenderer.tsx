import React, { useMemo } from 'react'
import { TestInput, NestedTableLayout, TestResultResponse } from '../../types/test'
import Input from '../ui/Input'
import TextArea from '../ui/TextArea'

interface NestedTableRendererProps {
  input: TestInput
  values?: Record<string, string | boolean | null>
  responses?: TestResultResponse[]
  onChange?: (cellKey: string, value: string | boolean | null) => void
  errors?: Record<string, string>
  readOnly?: boolean
}

const NestedTableRenderer: React.FC<NestedTableRendererProps> = ({
  input,
  values = {},
  responses = [],
  onChange,
  errors = {},
  readOnly = false
}) => {
  const nestedLayout = useMemo<NestedTableLayout | null>(() => {
    return input.nested_table_layout || null
  }, [input.nested_table_layout])

  // Parse responses for completed forms
  const cellValuesFromResponses = useMemo(() => {
    const cellValues: Record<string, string | boolean | null> = {}
    
    responses.forEach(response => {
      if (response.tableCellPosition) {
        const cellKey = `${input.id}_${response.tableCellPosition.rowIndex}_${response.tableCellPosition.columnIndex}`
        cellValues[cellKey] = response.value
      }
    })
    
    return cellValues
  }, [responses, input.id])

  // Use responses if in read-only mode, otherwise use provided values
  const effectiveValues = readOnly && Object.keys(values).length === 0 
    ? cellValuesFromResponses 
    : { ...cellValuesFromResponses, ...values }

  if (!nestedLayout) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
        Nested table configuration not found for this input.
      </div>
    )
  }

  const handleCellChange = (cellKey: string, value: string | boolean | null) => {
    if (!onChange || readOnly) return
    onChange(cellKey, value)
  }


  // Render nested table recursively
  const renderNestedTable = (nestedTable: NestedTableLayout, parentInputId: string, depth: number = 0, parentPath: string = ''): React.ReactNode => {
    if (depth > 3) return null // Prevent infinite nesting

    // Helper to get cell at position within this nested table
    const getCellAtPositionLocal = (rowIndex: number, columnIndex: number) => {
      // First check if there's an exact match at this position
      let cell = nestedTable.cells.find(c => c.rowIndex === rowIndex && c.columnIndex === columnIndex)
      
      // If exact match found, return it (it might be a merged cell at its top-left)
      if (cell && cell.rowIndex === rowIndex && cell.columnIndex === columnIndex) {
        return cell
      }
      
      // If not found, check if this position is covered by a merged cell
      cell = nestedTable.cells.find(c => 
        c.rowIndex <= rowIndex && 
        rowIndex < c.rowIndex + (c.rowSpan || 1) &&
        c.columnIndex <= columnIndex &&
        columnIndex < c.columnIndex + (c.colSpan || 1)
      )
      
      // If position is covered by a merged cell, only return it if this is the top-left position
      if (cell) {
        if (cell.rowIndex === rowIndex && cell.columnIndex === columnIndex) {
          return cell
        } else {
          // Position is covered but not the top-left - return null so it doesn't render
          return null
        }
      }
      
      return null
    }


    return (
      <div className={`mt-2 ${depth > 0 ? 'border border-gray-300 rounded-lg p-2' : ''}`}>
        <table className="min-w-full border border-gray-300">
          <tbody>
            {Array.from({ length: nestedTable.rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: nestedTable.columns }).map((_, colIdx) => {
                  const cell = getCellAtPositionLocal(rowIdx, colIdx)
                  
                  // If cell is null, position is covered by a merged cell - don't render
                  if (cell === null) {
                    return null
                  }

                  if (cell.cellType === 'empty') {
                    return (
                      <td key={colIdx} className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs">
                        —
                      </td>
                    )
                  }

                  const cellKey = parentPath ? `${parentPath}_${rowIdx}_${colIdx}` : `${parentInputId}_${rowIdx}_${colIdx}`
                  const cellValue = effectiveValues[cellKey] ?? null
                  const cellError = errors[cellKey]

                  return (
                    <td
                      key={colIdx}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      className="border border-gray-300 px-2 py-2 text-xs"
                    >
                      {cell.cellType === 'header' && (
                        <div className="font-medium text-gray-700">{cell.headerText || ''}</div>
                      )}

                      {cell.cellType === 'input' && (
                        <div className="space-y-1">
                          {cell.label && (
                            <div className="text-xs font-medium text-gray-700">{cell.label}</div>
                          )}
                          {!cell.inputType || cell.inputType === 'number' ? (
                            <Input
                              label=""
                              type="text"
                              value={(cellValue as string) ?? ''}
                              onChange={(e) => handleCellChange(cellKey, e.target.value)}
                              placeholder={cell.expectedValue?.toString()}
                              enablePlaceholderFill={Boolean(cell.expectedValue)}
                              error={cellError}
                              className="text-xs"
                              disabled={readOnly}
                            />
                          ) : null}
                          {cell.inputType === 'text' && (
                            <TextArea
                              label=""
                              value={(cellValue as string) ?? ''}
                              onChange={(e) => handleCellChange(cellKey, e.target.value)}
                              rows={2}
                              error={cellError}
                              className="text-xs"
                              disabled={readOnly}
                            />
                          )}
                          {cell.inputType === 'boolean' && (
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={cellValue === true}
                                onChange={(e) => handleCellChange(cellKey, e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                disabled={readOnly}
                              />
                            </div>
                          )}
                          {cell.unit && (
                            <div className="text-xs text-gray-500">{cell.unit}</div>
                          )}
                        </div>
                      )}

                      {cell.cellType === 'nested_table' && cell.nestedTable && (
                        <div>
                          {renderNestedTable(cell.nestedTable, parentInputId, depth + 1, `${cellKey}_nested`)}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900">{input.label}</p>
        {input.notes && !input.notes.startsWith('{') && (
          <p className="mt-1 text-xs text-gray-500">{input.notes}</p>
        )}
      </div>

      {nestedLayout.headerRows && nestedLayout.headerRows.length > 0 && (
        <div className="mb-4 space-y-2">
          {nestedLayout.headerRows.map((header, idx) => (
            <p key={idx} className="text-sm text-gray-700">{header}</p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        {renderNestedTable(nestedLayout, input.id, 0)}
      </div>
    </div>
  )
}

export default NestedTableRenderer

