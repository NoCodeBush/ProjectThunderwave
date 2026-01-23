import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { NestedTableLayout, NestedTableCell, NestedCellType, TestExpectedType } from '../../types/test'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Select from '../ui/Select'

interface NestedTableBuilderProps {
  label: string
  value: NestedTableLayout | undefined
  onChange: (config: NestedTableLayout) => void
  onLabelChange: (label: string) => void
}

const expectedTypeOptions: { label: string; value: TestExpectedType }[] = [
  { label: 'Range', value: 'range' },
  { label: 'Minimum', value: 'minimum' },
  { label: 'Maximum', value: 'maximum' },
  { label: 'Exact Value', value: 'exact' }
]

const NestedTableBuilder: React.FC<NestedTableBuilderProps> = ({
  label,
  value,
  onChange,
  onLabelChange
}) => {
  const [rows, setRows] = useState(value?.rows || 3)
  const [columns, setColumns] = useState(value?.columns || 3)
  const [cells, setCells] = useState<NestedTableCell[]>(value?.cells || [])
  const [headerRows, setHeaderRows] = useState<string[]>(value?.headerRows || [])
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [mergeStart, setMergeStart] = useState<{ row: number; col: number } | null>(null)
  const isInitialized = useRef(false)
  const lastValueRef = useRef<string>('')

  // Initialize from value prop
  useEffect(() => {
    const valueKey = value ? JSON.stringify(value) : ''
    if (valueKey !== lastValueRef.current) {
      if (value) {
        setRows(value.rows || 3)
        setColumns(value.columns || 3)
        setCells(value.cells || [])
        setHeaderRows(value.headerRows || [])
      }
      lastValueRef.current = valueKey
      isInitialized.current = true
    }
  }, [value])

  // Generate cell ID
  const getCellId = useCallback((rowIndex: number, columnIndex: number) => {
    return `cell_${rowIndex}_${columnIndex}`
  }, [])

  // Get or create cell (only for positions that aren't covered by merged cells)
  const getCell = useCallback((rowIndex: number, columnIndex: number): NestedTableCell | null => {
    const id = getCellId(rowIndex, columnIndex)
    const existing = cells.find(c => c.id === id)
    
    // If we found an exact match, check if this position is the top-left of a merged cell
    if (existing && existing.rowIndex === rowIndex && existing.columnIndex === columnIndex) {
      return existing
    }
    
    // If exact match not found, check if this position is covered by a merged cell
    for (const cell of cells) {
      // Check if this position is within the span of a merged cell
      if (cell.rowIndex <= rowIndex && 
          rowIndex < cell.rowIndex + (cell.rowSpan || 1) &&
          cell.columnIndex <= columnIndex &&
          columnIndex < cell.columnIndex + (cell.colSpan || 1)) {
        // Position is covered by a merged cell
        // Only return the cell if this is its top-left position, otherwise return null
        if (cell.rowIndex === rowIndex && cell.columnIndex === columnIndex) {
          return cell
        } else {
          // This position is covered but not the top-left - don't render
          return null
        }
      }
    }

    // Position is not covered and cell doesn't exist - create new empty cell
    return {
      id,
      rowIndex,
      columnIndex,
      cellType: 'empty'
    }
  }, [cells, getCellId])

  // Check if position is covered by a merged cell
  const isPositionCovered = useCallback((rowIndex: number, columnIndex: number, excludeId?: string): boolean => {
    for (const cell of cells) {
      if (excludeId && cell.id === excludeId) continue
      if (cell.rowIndex <= rowIndex && 
          rowIndex < cell.rowIndex + (cell.rowSpan || 1) &&
          cell.columnIndex <= columnIndex &&
          columnIndex < cell.columnIndex + (cell.colSpan || 1)) {
        return true
      }
    }
    return false
  }, [cells])

  // Update cell
  const updateCell = useCallback((cellId: string, updates: Partial<NestedTableCell>) => {
    setCells(prev => {
      const index = prev.findIndex(c => c.id === cellId)
      if (index >= 0) {
        return prev.map((c, i) => i === index ? { ...c, ...updates } : c)
      } else {
        // Find the cell by position if ID doesn't match
        const cell = prev.find(c => c.id === cellId || 
          (c.rowIndex === updates.rowIndex && c.columnIndex === updates.columnIndex))
        if (cell) {
          return prev.map(c => c.id === cell.id ? { ...c, ...updates } : c)
        }
        // Create new cell
        const newCell: NestedTableCell = {
          id: cellId,
          rowIndex: updates.rowIndex ?? 0,
          columnIndex: updates.columnIndex ?? 0,
          cellType: 'empty',
          ...updates
        }
        return [...prev, newCell]
      }
    })
  }, [])

  // Delete cell
  const deleteCell = useCallback((cellId: string) => {
    setCells(prev => prev.filter(c => c.id !== cellId))
    setSelectedCell(null)
  }, [])

  // Add row
  const addRow = useCallback(() => {
    setRows(prev => prev + 1)
  }, [])

  // Remove row
  const removeRow = useCallback(() => {
    if (rows <= 1) return
    setRows(prev => prev - 1)
    // Remove cells in the last row
    setCells(prev => prev.filter(c => c.rowIndex < rows - 1))
  }, [rows])

  // Add column
  const addColumn = useCallback(() => {
    setColumns(prev => prev + 1)
  }, [])

  // Remove column
  const removeColumn = useCallback(() => {
    if (columns <= 1) return
    setColumns(prev => prev - 1)
    // Remove cells in the last column
    setCells(prev => prev.filter(c => c.columnIndex < columns - 1))
  }, [columns])

  // Merge cells
  const mergeCells = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    if (startRow === endRow && startCol === endCol) return

    const rowSpan = Math.abs(endRow - startRow) + 1
    const colSpan = Math.abs(endCol - startCol) + 1
    const minRow = Math.min(startRow, endRow)
    const minCol = Math.min(startCol, endCol)
    const primaryCellId = getCellId(minRow, minCol)

    setCells(prev => {
      // Find the primary cell (top-left of merge area)
      let primaryCell = prev.find(c => c.id === primaryCellId)
      
      // If primary cell doesn't exist, we need to check if the position is covered by another merged cell
      if (!primaryCell) {
        const coveredBy = prev.find(c => 
          c.rowIndex <= minRow && 
          minRow < c.rowIndex + (c.rowSpan || 1) &&
          c.columnIndex <= minCol &&
          minCol < c.columnIndex + (c.colSpan || 1)
        )
        
        if (coveredBy) {
          // Position is already covered - expand the existing merged cell
          const maxRow = Math.max(coveredBy.rowIndex + (coveredBy.rowSpan || 1) - 1, minRow + rowSpan - 1)
          const maxCol = Math.max(coveredBy.columnIndex + (coveredBy.colSpan || 1) - 1, minCol + colSpan - 1)
          const newRowSpan = maxRow - coveredBy.rowIndex + 1
          const newColSpan = maxCol - coveredBy.columnIndex + 1
          
          return prev.map(c => {
            if (c.id === coveredBy.id) {
              return { ...c, rowSpan: newRowSpan, colSpan: newColSpan }
            }
            // Remove any cells that are now covered by the expanded merge
            const isCovered = c.rowIndex >= coveredBy.rowIndex && 
                            c.rowIndex < coveredBy.rowIndex + newRowSpan &&
                            c.columnIndex >= coveredBy.columnIndex &&
                            c.columnIndex < coveredBy.columnIndex + newColSpan
            return isCovered ? null : c
          }).filter((c): c is NestedTableCell => c !== null)
        }
        
        // Create new primary cell
        primaryCell = {
          id: primaryCellId,
          rowIndex: minRow,
          columnIndex: minCol,
          cellType: 'empty'
        }
      }
      
      // Update primary cell with merge properties
      const updatedPrimary: NestedTableCell = {
        ...primaryCell,
        rowSpan,
        colSpan,
        cellType: primaryCell.cellType === 'empty' ? 'header' : primaryCell.cellType
      }
      
      // Filter out all cells that are within the merge area (except the primary)
      const filtered = prev
        .filter(c => {
          if (c.id === primaryCellId) return false // Remove old primary, we'll add updated one
          
          // Check if cell is completely within merge area
          const isInMergeArea = c.rowIndex >= minRow && 
                               c.rowIndex < minRow + rowSpan &&
                               c.columnIndex >= minCol &&
                               c.columnIndex < minCol + colSpan
          
          if (isInMergeArea) return false // Remove cells in merge area
          
          // Check if cell overlaps with merge area (for already merged cells that span into merge area)
          const cellEndRow = c.rowIndex + (c.rowSpan || 1)
          const cellEndCol = c.columnIndex + (c.colSpan || 1)
          const mergeEndRow = minRow + rowSpan
          const mergeEndCol = minCol + colSpan
          
          const overlaps = !(cellEndRow <= minRow || 
                            c.rowIndex >= mergeEndRow ||
                            cellEndCol <= minCol ||
                            c.columnIndex >= mergeEndCol)
          
          return !overlaps // Keep cells that don't overlap
        })
      
      // Add the updated primary cell
      return [...filtered, updatedPrimary]
    })
  }, [getCellId])

  // Split cell
  const splitCell = useCallback((cellId: string) => {
    const cell = cells.find(c => c.id === cellId)
    if (!cell || (!cell.rowSpan && !cell.colSpan)) {
      console.log('Cannot split: cell not found or not merged', { cellId, cell, hasRowSpan: cell?.rowSpan, hasColSpan: cell?.colSpan })
      return
    }

    const rowSpan = cell.rowSpan || 1
    const colSpan = cell.colSpan || 1

    // Create cells for the split positions first
    const newCells: NestedTableCell[] = []
    for (let r = cell.rowIndex; r < cell.rowIndex + rowSpan; r++) {
      for (let c = cell.columnIndex; c < cell.columnIndex + colSpan; c++) {
        if (r === cell.rowIndex && c === cell.columnIndex) continue
        newCells.push({
          id: getCellId(r, c),
          rowIndex: r,
          columnIndex: c,
          cellType: 'empty'
        })
      }
    }

    // Update the cell to remove rowSpan and colSpan, and add the new cells
    setCells(prev => {
      const updated = prev.map(c => {
        if (c.id === cellId) {
          // Create new cell object without rowSpan and colSpan
          const { rowSpan: _, colSpan: __, ...rest } = c
          return rest
        }
        return c
      })
      return [...updated, ...newCells]
    })
  }, [cells, getCellId])

  // Create stable config
  const config = useMemo(() => {
    if (!isInitialized.current) return null

    return {
      rows,
      columns,
      cells,
      headerRows: headerRows.length > 0 ? headerRows : undefined
    } as NestedTableLayout
  }, [rows, columns, cells, headerRows])

  // Notify parent of changes
  useEffect(() => {
    if (!isInitialized.current || !config) return

    const configKey = JSON.stringify(config)
    if (configKey !== lastValueRef.current) {
      lastValueRef.current = configKey
      onChange(config)
    }
  }, [config, onChange])

  // Ensure selected cell exists in cells array
  useEffect(() => {
    if (!selectedCell) return
    
    const existingCell = cells.find(c => c.id === selectedCell)
    if (!existingCell) {
      // Cell doesn't exist yet - extract position and add it
      const match = selectedCell.match(/cell_(\d+)_(\d+)/)
      if (match) {
        const rowIdx = parseInt(match[1])
        const colIdx = parseInt(match[2])
        const cell = getCell(rowIdx, colIdx)
        // Only add if cell is not null (not covered by merged cell)
        if (cell) {
          setCells(prev => {
            if (prev.find(c => c.id === cell.id)) return prev
            return [...prev, { ...cell }]
          })
        }
      }
    }
  }, [selectedCell, cells, getCell])

  // Get selected cell data
  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null
    
    // Find in cells array
    return cells.find(c => c.id === selectedCell) || null
  }, [selectedCell, cells])

  return (
    <div className="space-y-4">
      <Input
        label="Table Label"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="e.g., Structured Measurements"
        enablePlaceholderFill={true}
        required
      />

      {/* Header Rows */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Header Rows (Optional)</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setHeaderRows(prev => [...prev, ''])}
          >
            Add Header Row
          </Button>
        </div>
        {headerRows.map((header, idx) => (
          <div key={idx} className="mb-2 flex items-center gap-2">
            <Input
              label=""
              value={header}
              onChange={(e) => {
                const newHeaders = [...headerRows]
                newHeaders[idx] = e.target.value
                setHeaderRows(newHeaders)
              }}
              placeholder="e.g., Set Injection Unit output current (A):"
              enablePlaceholderFill={true}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHeaderRows(prev => prev.filter((_, i) => i !== idx))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Grid Size Controls */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Grid Size</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Rows</label>
            <div className="flex items-center gap-2">
              <Input
                label=""
                type="number"
                min="1"
                value={rows.toString()}
                onChange={(e) => {
                  const newRows = parseInt(e.target.value) || 1
                  setRows(newRows)
                  // Remove cells beyond new row count
                  setCells(prev => prev.filter(c => c.rowIndex < newRows))
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRow}
              >
                +
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeRow}
                disabled={rows <= 1}
              >
                −
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Columns</label>
            <div className="flex items-center gap-2">
              <Input
                label=""
                type="number"
                min="1"
                value={columns.toString()}
                onChange={(e) => {
                  const newCols = parseInt(e.target.value) || 1
                  setColumns(newCols)
                  // Remove cells beyond new column count
                  setCells(prev => prev.filter(c => c.columnIndex < newCols))
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addColumn}
              >
                +
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeColumn}
                disabled={columns <= 1}
              >
                −
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* WYSIWYG Table Editor */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Table Editor</h4>
          <div className="flex gap-2">
            {!mergeStart ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (selectedCell && selectedCellData) {
                    // Start merge mode with selected cell
                    setMergeStart({ row: selectedCellData.rowIndex, col: selectedCellData.columnIndex })
                  }
                }}
                disabled={!selectedCell || !selectedCellData}
              >
                Start Merge
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMergeStart(null)}
              >
                Cancel Merge
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (selectedCell && selectedCellData) {
                  const cell = selectedCellData
                  if (cell.rowSpan || cell.colSpan) {
                    splitCell(cell.id)
                    // Refresh selection after split
                    setTimeout(() => {
                      setSelectedCell(null)
                      setIsEditing(false)
                    }, 100)
                  }
                }
              }}
              disabled={!selectedCell || !selectedCellData || (!selectedCellData.rowSpan && !selectedCellData.colSpan)}
            >
              Split Cell
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: columns }).map((_, colIdx) => {
                    const cell = getCell(rowIdx, colIdx)
                    
                    // If cell is null, it means this position is covered by a merged cell
                    if (cell === null) {
                      return null
                    }
                    
                    const isSelected = selectedCell === cell.id
                    const isCovered = isPositionCovered(rowIdx, colIdx, cell.id)

                    if (isCovered) {
                      return null // Don't render covered cells
                    }

                    return (
                      <td
                        key={colIdx}
                        rowSpan={cell.rowSpan}
                        colSpan={cell.colSpan}
                        className={`border border-gray-300 px-2 py-2 text-xs ${
                          isSelected ? 'bg-primary-100 ring-2 ring-primary-500' : 'bg-white hover:bg-gray-50'
                        } cursor-pointer`}
                        onClick={(e) => {
                          e.stopPropagation()
                          
                          // Handle merge mode
                          if (mergeStart) {
                            // Merge from start to current cell
                            if (mergeStart.row !== cell.rowIndex || mergeStart.col !== cell.columnIndex) {
                              mergeCells(mergeStart.row, mergeStart.col, cell.rowIndex, cell.columnIndex)
                              setMergeStart(null)
                              setSelectedCell(cell.id)
                              setIsEditing(true)
                              return
                            } else {
                              // Clicked same cell, cancel merge
                              setMergeStart(null)
                            }
                          }
                          
                          // Also handle shift+click for quick merge
                          if (e.shiftKey && selectedCell && selectedCellData) {
                            // Merge selected cell with clicked cell
                            mergeCells(selectedCellData.rowIndex, selectedCellData.columnIndex, cell.rowIndex, cell.columnIndex)
                            setSelectedCell(cell.id)
                            setIsEditing(true)
                            return
                          }
                          
                          // Normal selection
                          // Ensure cell exists in cells array - if it's a temporary cell from getCell, add it
                          if (!cell) {
                            // Cell is null (covered by merged cell) - can't select it
                            return
                          }
                          
                          const existingCell = cells.find(c => c.id === cell.id)
                          if (!existingCell) {
                            // Add the cell to the array if it doesn't exist, then select it
                            const cellToAdd = { ...cell }
                            setCells(prev => {
                              if (prev.find(c => c.id === cell.id)) return prev
                              return [...prev, cellToAdd]
                            })
                            // Select immediately - the cell will be in the array on next render
                            setSelectedCell(cell.id)
                            setIsEditing(true)
                          } else {
                            setSelectedCell(cell.id)
                            setIsEditing(true)
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          // Right-click to start merge
                          setMergeStart({ row: cell.rowIndex, col: cell.columnIndex })
                          setSelectedCell(cell.id)
                        }}
                      >
                        <div className="min-h-[40px] flex items-center justify-center">
                          {cell.cellType === 'empty' && (
                            <span className="text-gray-400">Empty</span>
                          )}
                          {cell.cellType === 'header' && (
                            <span className="font-medium text-gray-700">{cell.headerText || 'Header'}</span>
                          )}
                          {cell.cellType === 'input' && (
                            <div className="text-center">
                              <div className="font-medium text-gray-700">{cell.label || 'Input'}</div>
                              <div className="text-xs text-gray-500">{cell.inputType}</div>
                            </div>
                          )}
                          {cell.cellType === 'nested_table' && (
                            <div className="text-center">
                              <div className="font-medium text-gray-700">Nested Table</div>
                              <div className="text-xs text-gray-500">
                                {cell.nestedTable ? `${cell.nestedTable.rows}×${cell.nestedTable.columns}` : 'Empty'}
                              </div>
                            </div>
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
          Click a cell to configure it.
          {mergeStart ? (
            <span className="ml-2 font-medium text-primary-600">
              Merge mode active: Click another cell to merge with the selected cell, or click "Cancel Merge" to cancel.
            </span>
          ) : (
            <span className="ml-2 text-gray-400">
              Use "Start Merge" button to merge cells, or right-click + Shift+click to merge.
            </span>
          )}
        </p>
      </div>

      {/* Cell Configuration Panel */}
      {selectedCellData && isEditing && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Cell Configuration</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setSelectedCell(null)
              }}
            >
              Close
            </Button>
          </div>

          <div className="space-y-4">
            {(selectedCellData.rowSpan || selectedCellData.colSpan) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-900">
                  Merged Cell: {selectedCellData.rowSpan || 1} row(s) × {selectedCellData.colSpan || 1} column(s)
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  This cell spans multiple cells. Use "Split Cell" to separate it.
                </p>
              </div>
            )}
            {!selectedCellData.rowSpan && !selectedCellData.colSpan && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">
                  Single cell. Use "Start Merge" to merge with another cell.
                </p>
              </div>
            )}
            
            <Select
              label="Cell Type"
              value={selectedCellData.cellType}
              options={[
                { label: 'Empty', value: 'empty' },
                { label: 'Header', value: 'header' },
                { label: 'Input', value: 'input' },
                { label: 'Nested Table', value: 'nested_table' }
              ]}
              onChange={(value) => {
                const newType = value as NestedCellType
                // When changing to input type, ensure inputType is set
                if (newType === 'input' && !selectedCellData.inputType) {
                  updateCell(selectedCellData.id, { 
                    cellType: newType,
                    inputType: 'number' // Default to number
                  })
                } else {
                  updateCell(selectedCellData.id, { cellType: newType })
                }
              }}
            />

            {selectedCellData.cellType === 'header' && (
              <Input
                label="Header Text"
                value={selectedCellData.headerText || ''}
                onChange={(e) => updateCell(selectedCellData.id, { headerText: e.target.value })}
                placeholder="Enter header text"
                enablePlaceholderFill={true}
              />
            )}

            {selectedCellData.cellType === 'input' && (
              <>
                <Input
                  label="Label"
                  value={selectedCellData.label || ''}
                  onChange={(e) => updateCell(selectedCellData.id, { label: e.target.value })}
                  placeholder="e.g., Voltage"
                  enablePlaceholderFill={true}
                />
                <Select
                  label="Input Type"
                  value={selectedCellData.inputType || 'number'}
                  options={[
                    { label: 'Number', value: 'number' },
                    { label: 'Text', value: 'text' },
                    { label: 'Yes/No', value: 'boolean' }
                  ]}
                  onChange={(value) => {
                    updateCell(selectedCellData.id, { inputType: value as 'number' | 'text' | 'boolean' })
                  }}
                />
                {selectedCellData.inputType === 'number' && (
                  <>
                    <Input
                      label="Unit"
                      value={selectedCellData.unit || ''}
                      onChange={(e) => updateCell(selectedCellData.id, { unit: e.target.value })}
                      placeholder="e.g., V, A, Ω"
                      enablePlaceholderFill={true}
                    />
                    <Select
                      label="Expected Type"
                      value={selectedCellData.expectedType || 'range'}
                      options={expectedTypeOptions}
                      onChange={(value) => {
                        updateCell(selectedCellData.id, { expectedType: value as TestExpectedType })
                      }}
                    />
                    {(selectedCellData.expectedType === 'range' || selectedCellData.expectedType === 'minimum') && (
                      <Input
                        label="Minimum Value"
                        type="text"
                        value={selectedCellData.expectedMin?.toString() || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                          updateCell(selectedCellData.id, { expectedMin: val })
                        }}
                      />
                    )}
                    {(selectedCellData.expectedType === 'range' || selectedCellData.expectedType === 'maximum') && (
                      <Input
                        label="Maximum Value"
                        type="text"
                        value={selectedCellData.expectedMax?.toString() || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                          updateCell(selectedCellData.id, { expectedMax: val })
                        }}
                      />
                    )}
                    {selectedCellData.expectedType === 'exact' && (
                      <Input
                        label="Expected Value"
                        type="text"
                        value={selectedCellData.expectedValue?.toString() || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                          updateCell(selectedCellData.id, { expectedValue: val })
                        }}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {selectedCellData.cellType === 'nested_table' && (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-gray-700">Nested Table</p>
                <p className="text-xs text-gray-500">
                  Nested tables can be configured after the main table is created.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    // Initialize nested table if it doesn't exist
                    if (!selectedCellData.nestedTable) {
                      updateCell(selectedCellData.id, {
                        nestedTable: {
                          rows: 2,
                          columns: 2,
                          cells: []
                        }
                      })
                    }
                  }}
                >
                  Initialize Nested Table
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              {!mergeStart ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectedCellData) {
                      // Start merge mode
                      setMergeStart({ row: selectedCellData.rowIndex, col: selectedCellData.columnIndex })
                    }
                  }}
                >
                  Start Merge
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMergeStart(null)}
                >
                  Cancel Merge
                </Button>
              )}
              {(selectedCellData.rowSpan || selectedCellData.colSpan) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectedCellData) {
                      splitCell(selectedCellData.id)
                      setTimeout(() => {
                        setSelectedCell(null)
                        setIsEditing(false)
                      }, 100)
                    }
                  }}
                >
                  Split Cell
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteCell(selectedCellData.id)}
              >
                Delete Cell
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NestedTableBuilder

