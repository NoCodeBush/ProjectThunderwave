export type TestInputType = 'number' | 'text' | 'boolean' | 'table' | 'nested_table'

export type TestExpectedType = 'range' | 'minimum' | 'maximum' | 'exact'

export type TestResultStatus = 'draft' | 'submitted'

export interface TableCellConfig {
  rowIndex: number
  columnIndex: number
  enabled: boolean
  inputType?: 'number' | 'text' | 'boolean'
  label?: string
  unit?: string
  expectedType?: TestExpectedType
  expectedMin?: number | null
  expectedMax?: number | null
  expectedValue?: number | null
  notes?: string
  isCheckbox?: boolean // For pass/fail checkboxes
}

export interface TableLayoutConfig {
  columns: string[] // Column headers (e.g., ['L1', 'L2', 'L3'])
  rows: string[] // Row labels (e.g., ['L1 CT', 'L2 CT', 'L3 CT'])
  cells: TableCellConfig[] // Cell configurations
  headerRows?: string[] // Optional header rows (e.g., ['Set Injection Unit output current (A):'])
}

// Nested table cell types
export type NestedCellType = 'input' | 'nested_table' | 'header' | 'empty'

export interface NestedTableCell {
  id: string // Unique identifier for the cell
  rowIndex: number
  columnIndex: number
  rowSpan?: number // Number of rows this cell spans
  colSpan?: number // Number of columns this cell spans
  cellType: NestedCellType
  // For input cells
  inputType?: 'number' | 'text' | 'boolean'
  label?: string
  unit?: string
  expectedType?: TestExpectedType
  expectedMin?: number | null
  expectedMax?: number | null
  expectedValue?: number | null
  // For header cells
  headerText?: string
  // For nested table cells
  nestedTable?: NestedTableLayout
}

export interface NestedTableLayout {
  rows: number // Number of rows in the grid
  columns: number // Number of columns in the grid
  cells: NestedTableCell[] // All cells in the table
  headerRows?: string[] // Optional header rows above the table
}

export interface TestInput {
  id: string
  test_id: string
  label: string
  input_type: TestInputType
  unit?: string | null
  position: number
  expected_type: TestExpectedType
  expected_min?: number | string | null
  expected_max?: number | string | null
  expected_value?: number | string | null
  notes?: string | null
  table_layout?: TableLayoutConfig | null // Table configuration if input_type is 'table'
  nested_table_layout?: NestedTableLayout | null // Nested table configuration if input_type is 'nested_table'
  created_at: string
  updated_at: string
}

export interface TableCellPosition {
  rowIndex: number
  columnIndex: number
}

export interface TestResultResponse {
  inputId: string
  value: number | string | boolean | null
  notes?: string | null // For actual notes/comments
  tableCellPosition?: TableCellPosition | null // For table input cell position data
}

export interface TestResult {
  id: string
  test_id: string
  job_id: string
  asset_id?: string | null
  asset_ids?: string[] // Asset IDs from test_result_assets junction table
  responses: TestResultResponse[]
  status: TestResultStatus
  submitted_by: string
  submitted_at: string
  updated_at: string
}

export interface Test {
  id: string
  job_id: string
  asset_id?: string | null
  asset_type?: string | null
  name: string
  description?: string | null
  instructions?: string | null
  created_by?: string
  created_at: string
  updated_at: string
  test_inputs?: TestInput[]
  test_results?: TestResult[]
}

export interface TestInputDraft {
  label: string
  inputType: TestInputType
  unit?: string
  expectedType: TestExpectedType
  expectedMin?: number | string | null
  expectedMax?: number | string | null
  expectedValue?: number | string | null
  notes?: string
  tableLayout?: TableLayoutConfig // Table configuration if inputType is 'table'
  nestedTableLayout?: NestedTableLayout // Nested table configuration if inputType is 'nested_table'
}

export interface CreateTestPayload {
  name: string
  description?: string
  instructions?: string
  jobId?: string | null
  assetType?: string | null
  inputs: TestInputDraft[]
}

export interface SaveTestResultPayload {
  testId: string
  jobId?: string | null
  assetIds: string[]
  responses: TestResultResponse[]
  status?: TestResultStatus
  resultId?: string
}

