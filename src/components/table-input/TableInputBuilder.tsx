import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TableLayoutConfig, TableCellConfig } from '../../types/test'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Select from '../ui/Select'

interface TableInputBuilderProps {
  label: string
  value: TableLayoutConfig | undefined
  onChange: (config: TableLayoutConfig) => void
  onLabelChange: (label: string) => void
}

type CellInputType = 'number' | 'boolean'

const TableInputBuilder: React.FC<TableInputBuilderProps> = ({
  label,
  value,
  onChange,
  onLabelChange
}) => {
  const [columns, setColumns] = useState<string[]>(value?.columns || ['L1', 'L2', 'L3'])
  const [rows, setRows] = useState<string[]>(value?.rows || ['L1 CT', 'L2 CT', 'L3 CT'])
  const [cells, setCells] = useState<TableCellConfig[]>(value?.cells || [])
  const [headerRows, setHeaderRows] = useState<string[]>(value?.headerRows || [])
  const isInitialized = useRef(false)
  const lastValueRef = useRef<string>('')
  const lastConfigRef = useRef<string>('')

  // Initialize from value prop only once or when value changes externally
  useEffect(() => {
    const valueKey = value ? JSON.stringify(value) : ''
    if (valueKey !== lastValueRef.current) {
      if (value) {
        setColumns(value.columns || ['L1', 'L2', 'L3'])
        setRows(value.rows || ['L1 CT', 'L2 CT', 'L3 CT'])
        setCells(value.cells || [])
        setHeaderRows(value.headerRows || [])
      }
      lastValueRef.current = valueKey
      isInitialized.current = true
    }
  }, [value])

  // Ensure cells exist for all row/column combinations (returns same array if nothing changed)
  const ensureCellsExist = useCallback((currentRows: string[], currentColumns: string[], currentCells: TableCellConfig[]) => {
    const expectedCellCount = currentRows.length * currentColumns.length
    
    // Quick check: if count matches and all positions exist, return original array
    if (currentCells.length === expectedCellCount) {
      let allExist = true
      for (let rowIdx = 0; rowIdx < currentRows.length; rowIdx++) {
        for (let colIdx = 0; colIdx < currentColumns.length; colIdx++) {
          if (!currentCells.find(c => c.rowIndex === rowIdx && c.columnIndex === colIdx)) {
            allExist = false
            break
          }
        }
        if (!allExist) break
      }
      if (allExist) return currentCells // Return original to maintain reference equality
    }

    // Build complete cell array only if needed
    const newCells: TableCellConfig[] = []
    let hasChanges = false
    currentRows.forEach((_, rowIdx) => {
      currentColumns.forEach((_, colIdx) => {
        const existing = currentCells.find(c => c.rowIndex === rowIdx && c.columnIndex === colIdx)
        if (existing) {
          newCells.push(existing)
        } else {
          hasChanges = true
          newCells.push({
            rowIndex: rowIdx,
            columnIndex: colIdx,
            enabled: false,
            inputType: 'number'
          })
        }
      })
    })
    
    // Only return new array if there were actual changes
    return hasChanges || newCells.length !== currentCells.length ? newCells : currentCells
  }, [])

  // Update cells when dimensions change
  useEffect(() => {
    if (!isInitialized.current) return
    
    setCells(prev => {
      const updated = ensureCellsExist(rows, columns, prev)
      return updated.length !== prev.length ? updated : prev
    })
  }, [rows.length, columns.length, ensureCellsExist])

  // Create stable config object
  const config = useMemo(() => {
    if (!isInitialized.current) return null
    
    return {
      columns,
      rows,
      cells: ensureCellsExist(rows, columns, cells),
      headerRows: headerRows.length > 0 ? headerRows : undefined
    } as TableLayoutConfig
  }, [columns, rows, cells, headerRows, ensureCellsExist])

  // Notify parent of changes (only when config actually changes)
  useEffect(() => {
    if (!isInitialized.current || !config) return
    
    const configKey = JSON.stringify(config)
    if (configKey !== lastConfigRef.current) {
      lastConfigRef.current = configKey
      onChange(config)
    }
  }, [config, onChange])

  const updateCell = useCallback((rowIndex: number, columnIndex: number, updates: Partial<TableCellConfig>) => {
    setCells(prev => {
      const newCells = [...prev]
      const index = newCells.findIndex(
        c => c.rowIndex === rowIndex && c.columnIndex === columnIndex
      )
      if (index >= 0) {
        newCells[index] = { ...newCells[index], ...updates }
      } else {
        newCells.push({
          rowIndex,
          columnIndex,
          enabled: true,
          inputType: 'number',
          ...updates
        })
      }
      return newCells
    })
  }, [])

  const addColumn = useCallback(() => {
    const newColIndex = columns.length
    const newColumn = `Column ${newColIndex + 1}`
    setColumns(prev => [...prev, newColumn])
    
    // Cells will be auto-created by the useEffect
  }, [columns.length])

  const removeColumn = useCallback((colIndex: number) => {
    if (columns.length <= 1) return // Keep at least one column
    
    setColumns(prev => prev.filter((_, idx) => idx !== colIndex))
    setCells(prev => {
      const filtered = prev.filter(c => c.columnIndex !== colIndex)
      // Reindex remaining columns
      return filtered.map(c => 
        c.columnIndex > colIndex 
          ? { ...c, columnIndex: c.columnIndex - 1 }
          : c
      )
    })
  }, [columns.length])

  const updateColumnName = useCallback((colIndex: number, name: string) => {
    setColumns(prev => {
      const newCols = [...prev]
      newCols[colIndex] = name
      return newCols
    })
  }, [])

  const addRow = useCallback(() => {
    const newRowIndex = rows.length
    const newRow = `Row ${newRowIndex + 1}`
    setRows(prev => [...prev, newRow])
    
    // Cells will be auto-created by the useEffect
  }, [rows.length])

  const removeRow = useCallback((rowIndex: number) => {
    if (rows.length <= 1) return // Keep at least one row
    
    setRows(prev => prev.filter((_, idx) => idx !== rowIndex))
    setCells(prev => {
      const filtered = prev.filter(c => c.rowIndex !== rowIndex)
      // Reindex remaining rows
      return filtered.map(c => 
        c.rowIndex > rowIndex 
          ? { ...c, rowIndex: c.rowIndex - 1 }
          : c
      )
    })
  }, [rows.length])

  const updateRowName = useCallback((rowIndex: number, name: string) => {
    setRows(prev => {
      const newRows = [...prev]
      newRows[rowIndex] = name
      return newRows
    })
  }, [])

  const addHeaderRow = useCallback(() => {
    setHeaderRows(prev => [...prev, ''])
  }, [])

  const removeHeaderRow = useCallback((index: number) => {
    setHeaderRows(prev => prev.filter((_, idx) => idx !== index))
  }, [])

  const updateHeaderRow = useCallback((index: number, value: string) => {
    setHeaderRows(prev => {
      const newHeaders = [...prev]
      newHeaders[index] = value
      return newHeaders
    })
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <Input
          label="Table Label"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g., Phase Measurements"
          enablePlaceholderFill={true}
          required
        />
      </div>

      {/* Header Rows */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Header Rows (Optional)</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addHeaderRow}
          >
            Add Header Row
          </Button>
        </div>
        {headerRows.map((header, idx) => (
          <div key={idx} className="mb-2 flex items-center gap-2">
            <Input
              label=""
              value={header}
              onChange={(e) => updateHeaderRow(idx, e.target.value)}
              placeholder="e.g., Set Injection Unit output current (A):"
              enablePlaceholderFill={true}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeHeaderRow(idx)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Columns Management */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Columns</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addColumn}
          >
            Add Column
          </Button>
        </div>
        <div className="space-y-2">
          {columns.map((col, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                label=""
                value={col}
                onChange={(e) => updateColumnName(idx, e.target.value)}
                placeholder={`Column ${idx + 1}`}
                enablePlaceholderFill={true}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeColumn(idx)}
                disabled={columns.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Rows Management */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Rows</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addRow}
          >
            Add Row
          </Button>
        </div>
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                label=""
                value={row}
                onChange={(e) => updateRowName(idx, e.target.value)}
                placeholder={`Row ${idx + 1}`}
                enablePlaceholderFill={true}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Cell Configuration Table */}
      {columns.length > 0 && rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Configure Cells</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    Row / Column
                  </th>
                  {columns.map((col, colIdx) => (
                    <th key={colIdx} className="border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 text-center">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                      {row}
                    </td>
                    {columns.map((_, colIdx) => {
                      const cell = cells.find(
                        c => c.rowIndex === rowIdx && c.columnIndex === colIdx
                      ) || {
                        rowIndex: rowIdx,
                        columnIndex: colIdx,
                        enabled: false,
                        inputType: 'number' as CellInputType
                      }
                      
                      return (
                        <td key={colIdx} className="border border-gray-300 px-2 py-1">
                          <div className="space-y-1">
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={cell.enabled}
                                onChange={(e) => {
                                  updateCell(rowIdx, colIdx, { enabled: e.target.checked })
                                }}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            </label>
                            {cell.enabled && (
                              <Select
                                label=""
                                value={cell.inputType || 'number'}
                                options={[
                                  { label: 'Number', value: 'number' },
                                  { label: 'Yes/No', value: 'boolean' }
                                ]}
                                onChange={(value) => {
                                  updateCell(rowIdx, colIdx, { inputType: value as CellInputType })
                                }}
                              />
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Check cells to enable them, then select the input type (Number or Yes/No) for each enabled cell.
          </p>
        </div>
      )}
    </div>
  )
}

export default TableInputBuilder

