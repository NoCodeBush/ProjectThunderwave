import React, { useMemo } from 'react'
import { TestInput, TableLayoutConfig, TestResultResponse } from '../../types/test'
import Input from '../ui/Input'
import TextArea from '../ui/TextArea'

interface TableInputRendererProps {
  input: TestInput
  values?: Record<string, string | boolean | null> // Cell values keyed by `${inputId}_${rowIndex}_${columnIndex}`
  responses?: TestResultResponse[] // For viewing completed forms
  onChange?: (cellKey: string, value: string | boolean | null) => void
  errors?: Record<string, string>
  readOnly?: boolean // For viewing completed forms
}

const TableInputRenderer: React.FC<TableInputRendererProps> = ({
  input,
  values = {},
  responses = [],
  onChange,
  errors = {},
  readOnly = false
}) => {
  const tableLayout = useMemo<TableLayoutConfig | null>(() => {
    return input.table_layout || null
  }, [input.table_layout])

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
  // If values are provided (even in read-only mode), prefer them (for editing existing results)
  const effectiveValues = readOnly && Object.keys(values).length === 0 
    ? cellValuesFromResponses 
    : { ...cellValuesFromResponses, ...values }

  if (!tableLayout) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
        Table configuration not found for this input.
      </div>
    )
  }

  const getCellValue = (rowIndex: number, columnIndex: number): string | boolean | null => {
    const cellKey = `${input.id}_${rowIndex}_${columnIndex}`
    return effectiveValues[cellKey] ?? null
  }

  const handleCellChange = (rowIndex: number, columnIndex: number, value: string | boolean | null) => {
    if (!onChange || readOnly) return
    const cellKey = `${input.id}_${rowIndex}_${columnIndex}`
    onChange(cellKey, value)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900">{input.label}</p>
        {input.notes && !input.notes.startsWith('{') && (
          <p className="mt-1 text-xs text-gray-500">{input.notes}</p>
        )}
      </div>

      {tableLayout.headerRows && tableLayout.headerRows.length > 0 && (
        <div className="mb-4 space-y-2">
          {tableLayout.headerRows.map((header, idx) => (
            <p key={idx} className="text-sm text-gray-700">{header}</p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700">
                Row / Column
              </th>
              {tableLayout.columns.map((col, colIdx) => (
                <th key={colIdx} className="border border-gray-300 bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-700">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableLayout.rows.map((row, rowIdx) => {
              const rowCells = tableLayout.cells.filter(c => c.rowIndex === rowIdx)
              return (
                <tr key={rowIdx}>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                    {row}
                  </td>
                  {tableLayout.columns.map((_, colIdx) => {
                    const cell = rowCells.find(c => c.columnIndex === colIdx)
                    
                    if (!cell || !cell.enabled) {
                      return (
                        <td key={colIdx} className="border border-gray-300 bg-gray-50 px-3 py-2 text-center text-xs text-gray-400">
                          —
                        </td>
                      )
                    }

                    const cellKey = `${input.id}_${rowIdx}_${colIdx}`
                    const cellValue = getCellValue(rowIdx, colIdx)
                    const cellError = errors[cellKey]
                    const inputType = cell.inputType || 'number'

                    return (
                      <td key={colIdx} className="border border-gray-300 px-3 py-2">
                        {inputType === 'number' && (
                          <Input
                            label=""
                            type="number"
                            value={(cellValue as string) ?? ''}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            placeholder={cell.expectedValue?.toString()}
                            enablePlaceholderFill={Boolean(cell.expectedValue)}
                            error={cellError}
                            className="text-xs"
                            disabled={readOnly}
                          />
                        )}
                        {inputType === 'boolean' && (
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={cellValue === true}
                              onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.checked)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              disabled={readOnly}
                            />
                          </div>
                        )}
                        {inputType === 'text' && (
                          <TextArea
                            label=""
                            value={(cellValue as string) ?? ''}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            rows={2}
                            error={cellError}
                            className="text-xs"
                            disabled={readOnly}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableInputRenderer

